/**
 * VirtualPageRenderer.ts — Virtual Page Rendering
 *
 * Purpose: Only render PDF pages that are visible in the viewport.
 * Off-screen pages are unloaded to save memory and improve performance.
 *
 * Uses IntersectionObserver to detect which pages are visible.
 * Maintains a render queue with priority for newly-visible pages.
 *
 * For large PDFs (100+ pages), this ensures only ~3-5 pages are
 * rendered at any time, keeping memory usage low.
 */

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { RenderingManager } from "../editor/rendering/RenderingManager";

const RENDER_BUFFER = 1; // Number of pages to render above/below viewport

export interface PageRenderTask {
  pageIndex: number;
  canvas: HTMLCanvasElement;
  wrapper: HTMLElement;
  cancellationToken: { cancelled: boolean };
}

export class VirtualPageRenderer {
  private _pdf: PDFDocumentProxy;
  private _manager: RenderingManager;
  private _pagesEl: HTMLElement;
  private _scrollEl: HTMLElement;
  private _pageTasks = new Map<number, PageRenderTask>();
  private _visiblePages = new Set<number>();
  private _observer: IntersectionObserver | null = null;
  private _pendingRender: Set<number> = new Set();
  private _renderQueue: number[] = [];
  private _isProcessing = false;
  private _fitMode: "width" | "page" = "width";
  private _zoomLevel = 1;

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
    const containerWidth = this._scrollEl.clientWidth;
    const containerHeight = this._scrollEl.clientHeight;

    // Create all page wrappers first (lightweight, no rendering)
    for (let i = 1; i <= totalPages; i++) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-page-index", String(i));
      wrapper.style.cssText = `
        position: relative;
        display: flex;
        justify-content: center;
        margin-bottom: ${i < totalPages ? "16px" : "0"};
      `;

      // Create canvas (will be sized when rendered)
      const canvas = document.createElement("canvas");
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
        cancellationToken: { cancelled: false },
      });

      // Mark as pending render
      this._pendingRender.add(i);
    }

    // Observe visibility
    this._setupObserver();

    // Process initial visible pages
    this._scheduleRender();
  }

  /** Destroy all pages and clean up. */
  destroy(): void {
    this._observer?.disconnect();
    this._observer = null;

    for (const task of this._pageTasks.values()) {
      task.cancellationToken.cancelled = true;
    }
    this._pageTasks.clear();
    this._visiblePages.clear();
    this._pendingRender.clear();
    this._renderQueue = [];
    this._manager.destroyAllContainers();
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
        rootMargin: `${RENDER_BUFFER * 200}px`, // Pre-render pages near viewport
        threshold: 0,
      },
    );

    // Observe all page wrappers
    for (const task of this._pageTasks.values()) {
      this._observer.observe(task.wrapper);
    }
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

      if (!task || task.cancellationToken.cancelled) continue;
      if (this._visiblePages.size === 0 && !this._pendingRender.has(pageIndex)) continue;

      await this._renderPage(task);
    }

    this._isProcessing = false;
  }

  private async _renderPage(task: PageRenderTask): Promise<void> {
    if (task.cancellationToken.cancelled) return;

    try {
      const page = await this._pdf.getPage(task.pageIndex);
      if (task.cancellationToken.cancelled) return;

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

      if (task.cancellationToken.cancelled) return;

      task.canvas.width = viewport.width;
      task.canvas.height = viewport.height;

      const ctx = task.canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      // Silently handle cancelled renders
      if (!task.cancellationToken.cancelled) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Failed to render page ${task.pageIndex}:`, err);
        }
      }
    }
  }

  private _unloadPage(pageIndex: number): void {
    const task = this._pageTasks.get(pageIndex);
    if (!task) return;

    task.cancellationToken.cancelled = true;
    task.canvas.width = 0;
    task.canvas.height = 0;
    task.canvas.getContext("2d")?.clearRect(0, 0, 0, 0);

    // Clean up overlay containers for this page to prevent renderer accumulation
    this._manager.destroyPageContainer(pageIndex);

    // Reset for potential re-render
    task.cancellationToken = { cancelled: false };
  }
}
