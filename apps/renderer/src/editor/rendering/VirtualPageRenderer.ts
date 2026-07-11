/**
 * VirtualPageRenderer.ts — Virtual Page Rendering
 *
 * Purpose: Only render PDF pages that are visible in the viewport.
 * Off-screen pages are unloaded to save memory and improve performance.
 *
 * Uses IntersectionObserver to detect which pages are visible.
 * Maintains a render queue with priority for newly-visible pages.
 *
 * Features:
 *   - CanvasPool for canvas reuse (reduces GC pressure)
 *   - pdfjs page disposal after render (frees PDF worker memory)
 *   - ResizeObserver for automatic re-render on container resize
 *   - Render buffer for pre-rendering adjacent pages
 *   - Cancellation tokens for all async operations
 *
 * For large PDFs (500+ pages), this ensures only ~3-5 pages are
 * rendered at any time, keeping memory usage low and scrolling smooth.
 */

import type { PDFDocumentProxy } from "pdfjs-dist";
import { RenderingManager } from "./RenderingManager";
import { renderingErrorHandler } from "../core/ErrorManager";
import { CanvasPool } from "./CanvasPool";
import { useEditorStore } from "../state/editorStore";
import { inlineEditor } from "../editing/InlineTextEditor";

const RENDER_BUFFER = 1; // Number of pages to render above/below viewport
const CANVAS_POOL_SIZE = 30; // Enough for visible pages + buffer + a few extra

export interface PageRenderTask {
  pageIndex: number;
  canvas: HTMLCanvasElement;
  wrapper: HTMLElement;
  /**
   * Unique render generation — incremented each time a page is unloaded/reloaded.
   * Stale renders (whose generation != the task's current generation) are discarded.
   * This is the primary mechanism for preventing stale async render results from
   * overwriting newer renders after page virtualization.
   */
  generation: number;
}

export class VirtualPageRenderer {
  private _pdf: PDFDocumentProxy;
  private _manager: RenderingManager;
  private _pagesEl: HTMLElement;
  private _scrollEl: HTMLElement;
  private _pageTasks = new Map<number, PageRenderTask>();
  private _visiblePages = new Set<number>();
  private _observer: IntersectionObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _pendingRender: Set<number> = new Set();
  private _renderQueue: number[] = [];
  private _isProcessing = false;
  private _fitMode: "width" | "page" = "width";
  private _zoomLevel = 1;
  private _canvasPool: CanvasPool;
  /** Set of page indices whose pdfjs page objects are currently loaded (not yet disposed). */
  private _loadedPages = new Set<number>();

  constructor(
    pdf: PDFDocumentProxy,
    manager: RenderingManager,
    pagesEl: HTMLElement,
    scrollEl: HTMLElement,
  ) {
    this._pdf = pdf;
    this._manager = manager;
    this._pagesEl = pagesEl;
    this._scrollEl = scrollEl;
    this._canvasPool = new CanvasPool(CANVAS_POOL_SIZE);
  }

  /** Set the current zoom level and fit mode. */
  setZoom(zoom: number, fitMode: "width" | "page"): void {
    this._zoomLevel = zoom;
    this._fitMode = fitMode;
  }

  /** Get the total page count. */
  get pageCount(): number {
    return this._pdf.numPages;
  }

  /** Initialize the renderer: create all page wrappers but only render visible ones. */
  async initialize(): Promise<void> {
    this._pagesEl.innerHTML = "";
    this._pageTasks.clear();
    this._visiblePages.clear();

    const totalPages = this._pdf.numPages;
    // Create all page wrappers first (lightweight, no rendering)
    for (let i = 1; i <= totalPages; i++) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-page-index", String(i));
      wrapper.style.cssText = `
        position: relative;
        display: flex;
        justify-content: center;
        margin-bottom: ${i < totalPages ? "16px" : "0"};
        min-height: 50px;
      `;

      // Acquire canvas from pool (will be sized when rendered)
      const canvas = this._canvasPool.acquire();
      canvas.style.cssText = `
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      `;

      wrapper.appendChild(canvas);
      this._manager.createPageContainer(i, wrapper);
      this._pagesEl.appendChild(wrapper);

      // Store task reference
      this._pageTasks.set(i, {
        pageIndex: i,
        canvas,
        wrapper,
        generation: 0,
      });

      // Mark as pending render
      this._pendingRender.add(i);
    }

    // Observe visibility
    this._setupObserver();

    // Observe container resize
    this._setupResizeObserver();

    // Process initial visible pages
    this._scheduleRender();
  }

  /** Destroy all pages and clean up. */
  destroy(): void {
    this._observer?.disconnect();
    this._observer = null;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    for (const task of this._pageTasks.values()) {
      this._cancelTaskRender(task);
      this._canvasPool.release(task.canvas);
    }
    this._pageTasks.clear();
    this._visiblePages.clear();
    this._pendingRender.clear();
    this._renderQueue = [];
    this._loadedPages.clear();
    this._manager.destroyAllContainers();
    this._canvasPool.clear();
  }

  /** Scroll to a specific page. */
  scrollToPage(pageNum: number): void {
    const wrapper = document.querySelector(`[data-page-index="${pageNum}"]`);
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /** Force re-render all visible pages (e.g. after zoom change). */
  refreshVisible(): void {
    for (const pageIndex of this._visiblePages) {
      this._pendingRender.add(pageIndex);
    }
    this._scheduleRender();
  }

  /** Get the currently visible page indices. */
  get visiblePages(): Set<number> {
    return new Set(this._visiblePages);
  }

  /** Get the canvas pool instance (for stats/monitoring). */
  get canvasPool(): CanvasPool {
    return this._canvasPool;
  }

  // ── Private ──────────────────────────────────────────────────────
  private _setupObserver(): void {
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageIndex = parseInt(
            (entry.target as HTMLElement).getAttribute("data-page-index") ?? "0",
            10,
          );
          if (pageIndex < 1) continue;

          if (entry.isIntersecting) {
            this._visiblePages.add(pageIndex);
            // Also mark adjacent pages for pre-rendering
            for (let i = pageIndex - RENDER_BUFFER; i <= pageIndex + RENDER_BUFFER; i++) {
              if (i >= 1 && i <= this._pdf.numPages) {
                this._pendingRender.add(i);
              }
            }
          } else {
            this._visiblePages.delete(pageIndex);
            // Unload this page if not adjacent to any visible page
            let shouldUnload = true;
            for (let i = pageIndex - RENDER_BUFFER; i <= pageIndex + RENDER_BUFFER; i++) {
              if (this._visiblePages.has(i)) {
                shouldUnload = false;
                break;
              }
            }
            if (shouldUnload) {
              this._unloadPage(pageIndex);
            }
          }
        }
        this._scheduleRender();
      },
      {
        root: this._scrollEl,
        rootMargin: `${RENDER_BUFFER * 200}px`,
        threshold: 0,
      },
    );

    // Observe all page wrappers
    for (const task of this._pageTasks.values()) {
      this._observer.observe(task.wrapper);
    }
  }

  private _setupResizeObserver(): void {
    this._resizeObserver = new ResizeObserver(() => {
      // On container resize, re-render visible pages with new dimensions
      for (const pageIndex of this._visiblePages) {
        const task = this._pageTasks.get(pageIndex);
        if (task) {
          this._cancelTaskRender(task);
          this._pendingRender.add(pageIndex);
        }
      }
      this._scheduleRender();
    });

    this._resizeObserver.observe(this._scrollEl);
  }

  /**
   * Cancel any in-flight render for a task by incrementing its generation.
   * All async continuations in _renderPage check task.generation against
   * the captured value at start and bail out if they mismatch.
   *
   * Note: pdfjs page.render() does not support AbortSignal, so cancellation
   * is best-effort. The generation check discards stale results after the
   * render promise resolves, and CanvasPool.release() clears canvas
   * dimensions to 0 to prevent stale canvas writes from producing visible output.
   */
  private _cancelTaskRender(task: PageRenderTask): void {
    task.generation++;
  }

  private _scheduleRender(): void {
    // Add pending pages to render queue
    for (const pageIndex of this._pendingRender) {
      const task = this._pageTasks.get(pageIndex);
      if (task && !this._renderQueue.includes(pageIndex)) {
        this._renderQueue.push(pageIndex);
      }
    }
    this._pendingRender.clear();

    if (!this._isProcessing) {
      this._processQueue();
    }
  }

  private async _processQueue(): Promise<void> {
    this._isProcessing = true;

    while (this._renderQueue.length > 0) {
      const pageIndex = this._renderQueue.shift()!;
      const task = this._pageTasks.get(pageIndex);

      if (!task) continue;

      // Skip rendering if no pages are visible and nothing is pending.
      // This prevents wasted CPU when all pages are off-screen.
      if (this._visiblePages.size === 0 && !this._pendingRender.has(pageIndex)) {
        continue;
      }

      await this._renderPage(task);
    }

    this._isProcessing = false;
  }

  private async _renderPage(task: PageRenderTask): Promise<void> {
    const gen = task.generation;

    try {
      const page = await this._pdf.getPage(task.pageIndex);
      this._loadedPages.add(task.pageIndex);

      // Guard: if the page was unloaded and re-queued, discard this stale getPage result.
      if (task.generation !== gen) {
        this._disposePageObject(page);
        return;
      }

      // Re-create overlay container if it was destroyed by unload
      this._manager.createPageContainer(task.pageIndex, task.wrapper);

      const unscaledViewport = page.getViewport({ scale: 1 });
      const containerWidth = this._scrollEl.clientWidth;

      let baseScale: number;
      if (this._fitMode === "page") {
        const containerHeight = this._scrollEl.clientHeight;
        const scaleW = (containerWidth - 48) / unscaledViewport.width;
        const scaleH = (containerHeight - 48) / unscaledViewport.height;
        baseScale = Math.min(scaleW, scaleH);
      } else {
        baseScale = (containerWidth - 48) / unscaledViewport.width;
      }

      const scale = baseScale * this._zoomLevel;
      const viewport = page.getViewport({ scale });

      if (task.generation !== gen) {
        this._disposePageObject(page);
        return;
      }

      task.canvas.width = viewport.width;
      task.canvas.height = viewport.height;

      const ctx = task.canvas.getContext("2d");
      if (!ctx) {
        this._disposePageObject(page);
        return;
      }

      await page.render({ canvasContext: ctx, viewport } as any).promise;

      // Generation guard: if the page was unloaded and re-queued while
      // we were rendering, discard this stale result. The CanvasPool's
      // release() method also clears canvas dimensions to 0, so any
      // in-flight pdfjs render writing to a released canvas is effectively
      // a no-op (writes to a 0x0 surface).
      if (task.generation !== gen) {
        if (process.env.NODE_ENV !== "production") {
          renderingErrorHandler.warn(
            "Virtual Render",
            `Discarded stale render result for page ${task.pageIndex} (generation changed)`,
          );
        }
        this._disposePageObject(page);
        return;
      }

      // Dispose the pdfjs page object to free memory
      this._disposePageObject(page);
      this._loadedPages.delete(task.pageIndex);
    } catch (err) {
      // Silently handle aborted renders (AbortError)
      if (err instanceof DOMException && err.name === "AbortError") return;

      // If the generation changed, this was a cancelled render — ignore silently.
      if (task.generation !== gen) return;

      if (process.env.NODE_ENV !== "production") {
        renderingErrorHandler.warn(
          "Virtual Render",
          `Failed to render page ${task.pageIndex}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * If there is an active editing session on the given page, cancel it
   * so the store doesn't hold a stale reference to a destroyed DOM element.
   * Also stops the InlineTextEditor singleton to clear its internal state.
   */
  private _cancelActiveEditOnPage(pageIndex: number): void {
    const state = useEditorStore.getState();
    if (state.activeEdit && state.activeEdit.page === pageIndex) {
      state.setEditingMode("none");
      state.setActiveEdit(null);
      // Also stop the InlineTextEditor singleton to clear its internal
      // _element reference and _active flag, preventing stale state.
      inlineEditor.stopEditing();
    }
  }

  /** Dispose a pdfjs page object to free worker memory. */
  private _disposePageObject(page: unknown): void {
    try {
      (page as any).cleanup?.();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        renderingErrorHandler.warn(
          "Virtual Render",
          `pdfjs cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    try {
      (page as any).destroy?.();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        renderingErrorHandler.warn(
          "Virtual Render",
          `pdfjs destroy failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private _unloadPage(pageIndex: number): void {
    const task = this._pageTasks.get(pageIndex);
    if (!task) return;

    // Cancel any in-flight render and bump generation
    this._cancelTaskRender(task);

    task.canvas.width = 0;
    task.canvas.height = 0;
    const ctx = task.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 0, 0);
    }

    // Return canvas to pool, acquire a new one for next render
    const newCanvas = this._canvasPool.acquire();
    newCanvas.style.cssText = `
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    `;

    // Swap canvases (old canvas goes to pool, new canvas is clean)
    task.wrapper.replaceChild(newCanvas, task.canvas);
    this._canvasPool.release(task.canvas);
    task.canvas = newCanvas;

    // Clean up overlay containers for this page, but keep objects registered
    // so they can be re-mounted when the page is scrolled back into view.
    this._manager.unloadPageContainer(pageIndex);

    // Cancel any active editing session on this page — the inline text editor
    // holds a reference to the old DOM element which is about to be destroyed.
    // The store's activeEdit is cleared so no stale reference remains.
    this._cancelActiveEditOnPage(pageIndex);
  }
}
