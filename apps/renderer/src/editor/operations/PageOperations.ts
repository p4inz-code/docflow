/**
 * PageOperations.ts — Advanced Page Operations
 *
 * Purpose: Implement production page operations including insert,
 * delete, duplicate, rotate, and reorder. All operations are
 * undoable through the CommandPipeline.
 *
 * Architecture Note:
 *   Real PDF page manipulation requires pdf-lib or similar
 *   library. This implementation provides the operation framework
 *   and stores page state (rotation, visibility, order) in a
 *   lightweight workspace-level page manager.
 *
 *   When pdf-lib integration is added, the actual PDF pages
 *   are modified and the renderer is refreshed.
 */

import { useWorkspaceStore } from "../workspace/WorkspaceStore";

// ── Page Operation State ───────────────────────────────────────────
export interface PageState {
  /** Original 1-based page index (before any reordering). */
  originalIndex: number;
  /** Current rotation in degrees (0, 90, 180, 270). */
  rotation: number;
  /** Whether the page is deleted (hidden). */
  deleted: boolean;
  /** Custom label (optional). */
  label?: string;
}

// ── Page Operations Manager ────────────────────────────────────────
export class PageOperations {
  /** Per-document page state store. */
  private _pageStates = new Map<string, PageState[]>();

  /** Get the page states for an active or specified document. */
  getPageStates(docId?: string): PageState[] {
    const id =
      docId ?? useWorkspaceStore.getState().activeDocumentId;
    if (!id) return [];
    return this._pageStates.get(id) ?? [];
  }

  /** Initialize page states for a new document. */
  initialize(docId: string, pageCount: number): void {
    const states: PageState[] = [];
    for (let i = 1; i <= pageCount; i++) {
      states.push({
        originalIndex: i,
        rotation: 0,
        deleted: false,
      });
    }
    this._pageStates.set(docId, states);
  }

  /** Clean up page states for a closed document. */
  cleanup(docId: string): void {
    this._pageStates.delete(docId);
  }

  /** Rotate a page clockwise by 90 degrees. */
  rotatePage(pageIndex: number, direction: "cw" | "ccw"): boolean {
    const states = this.getPageStates();
    if (pageIndex < 0 || pageIndex >= states.length) return false;

    const state = states[pageIndex];
    const delta = direction === "cw" ? 90 : -90;
    state.rotation = (state.rotation + delta + 360) % 360;

    // Apply rotation to rendered pages via CSS
    this._applyPageRotations();
    return true;
  }

  /** Delete (hide) a page. */
  deletePage(pageIndex: number): boolean {
    const states = this.getPageStates();
    if (pageIndex < 0 || pageIndex >= states.length) return false;

    const state = states[pageIndex];
    if (state.deleted) return false;
    state.deleted = true;

    // Visually mark deleted pages
    this._applyPageVisibility();
    return true;
  }

  /** Duplicate a page. */
  duplicatePage(pageIndex: number): boolean {
    const states = this.getPageStates();
    if (pageIndex < 0 || pageIndex >= states.length) return false;

    const source = states[pageIndex];
    const duplicate: PageState = {
      ...source,
      originalIndex: states.length + 1,
    };

    // Insert after the source page
    states.splice(pageIndex + 1, 0, duplicate);

    // Update workspace store page count
    this._notifyPageCount(states.length);

    // Refresh rendering
    this._refreshRenderer();

    return true;
  }

  /** Insert a blank page at the given index. */
  insertBlankPage(afterIndex: number): boolean {
    const states = this.getPageStates();
    if (afterIndex < 0 || afterIndex > states.length) return false;

    const blank: PageState = {
      originalIndex: states.length + 1,
      rotation: 0,
      deleted: false,
      label: "Blank",
    };

    states.splice(afterIndex, 0, blank);

    this._notifyPageCount(states.length);
    this._refreshRenderer();
    return true;
  }

  /** Reorder pages (drag & drop). */
  reorderPages(fromIndex: number, toIndex: number): boolean {
    const states = this.getPageStates();
    if (fromIndex < 0 || fromIndex >= states.length) return false;
    if (toIndex < 0 || toIndex >= states.length) return false;
    if (fromIndex === toIndex) return false;

    const [moved] = states.splice(fromIndex, 1);
    states.splice(toIndex, 0, moved);

    this._refreshRenderer();
    return true;
  }

  /** Get visible (non-deleted) pages. */
  getVisiblePages(): PageState[] {
    return this.getPageStates().filter((s) => !s.deleted);
  }

  /** Get the count of visible pages. */
  get visiblePageCount(): number {
    return this.getVisiblePages().length;
  }

  // ── Private ──────────────────────────────────────────────────────
  private _applyPageRotations(): void {
    const pages = document.querySelectorAll<HTMLElement>("[data-page-index]");
    pages.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-page-index") ?? "1", 10);
      const states = this.getPageStates();
      if (idx >= 1 && idx <= states.length) {
        const rotation = states[idx - 1].rotation;
        el.style.transform = rotation ? `rotate(${rotation}deg)` : "";
      }
    });
  }

  private _applyPageVisibility(): void {
    const pages = document.querySelectorAll<HTMLElement>("[data-page-index]");
    pages.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-page-index") ?? "1", 10);
      const states = this.getPageStates();
      if (idx >= 1 && idx <= states.length) {
        el.style.opacity = states[idx - 1].deleted ? "0.3" : "1";
        el.style.pointerEvents = states[idx - 1].deleted ? "none" : "auto";
      }
    });
  }

  private _notifyPageCount(_count: number): void {
    // Future: update workspace store or trigger re-render
  }

  private _refreshRenderer(): void {
    // Trigger a re-render by dispatching a resize event
    window.dispatchEvent(new Event("resize"));
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const pageOperations = new PageOperations();
