/**
 * RenderScheduler.ts — Render Scheduler
 *
 * Purpose: Batch render updates and avoid duplicate renders.
 * Queues dirty objects and schedules a single animation frame
 * to process all pending changes.
 *
 * Future improvements (V2–V4):
 *   - Partial / dirty rendering (only update changed CSS)
 *   - Virtual page scheduling (skip off-screen pages)
 *   - Throttle / debounce for high-frequency events (e.g., drag)
 *   - Render cache invalidation
 */

import type { DirtyFlags } from "../types/rendering";

type RenderCallback = (dirty: Map<string, DirtyFlags>) => void;

// ── Render Scheduler ───────────────────────────────────────────────
export class RenderScheduler {
  private _callback: RenderCallback | null = null;
  private _dirty: Map<string, DirtyFlags> = new Map();
  private _rafId: number | null = null;
  private _scheduled = false;

  /**
   * Register the callback that performs actual rendering.
   * Called once per frame with accumulated dirty flags.
   */
  set onRender(callback: RenderCallback | null) {
    this._callback = callback;
  }

  /** Mark an object as needing re-render with given dirty flags. */
  schedule(id: string, flags: Partial<DirtyFlags>): void {
    const existing = this._dirty.get(id) ?? {
      created: false,
      updated: false,
      deleted: false,
      selected: false,
      visibility: false,
      transform: false,
    };

    this._dirty.set(id, {
      created: existing.created || (flags.created ?? false),
      updated: existing.updated || (flags.updated ?? false),
      deleted: existing.deleted || (flags.deleted ?? false),
      selected: existing.selected || (flags.selected ?? false),
      visibility: existing.visibility || (flags.visibility ?? false),
      transform: existing.transform || (flags.transform ?? false),
    });

    this._requestFrame();
  }

  /** Cancel a pending render for a specific object. */
  cancel(id: string): void {
    this._dirty.delete(id);
  }

  /** Force an immediate render (skip the frame wait). */
  flush(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._scheduled = false;
    this._process();
  }

  /** Clear all pending renders without executing. */
  clear(): void {
    this._dirty.clear();
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._scheduled = false;
  }

  /** Whether there are pending renders. */
  get hasPending(): boolean {
    return this._dirty.size > 0;
  }

  /** Number of pending dirty objects. */
  get pendingCount(): number {
    return this._dirty.size;
  }

  // ── Private ──────────────────────────────────────────────────────
  private _requestFrame(): void {
    if (this._scheduled) return;
    this._scheduled = true;
    this._rafId = requestAnimationFrame(() => {
      this._scheduled = false;
      this._rafId = null;
      this._process();
    });
  }

  private _process(): void {
    if (this._dirty.size === 0) return;
    if (!this._callback) {
      this._dirty.clear();
      return;
    }

    const snapshot = new Map(this._dirty);
    this._dirty.clear();
    this._callback(snapshot);
  }
}
