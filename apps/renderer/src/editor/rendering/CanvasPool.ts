/**
 * CanvasPool.ts — Reusable Canvas Pool
 *
 * Purpose: Reduce GC pressure by recycling HTMLCanvasElement objects
 * instead of creating and destroying them during virtual page rendering.
 *
 * When a page is unloaded, its canvas returns to the pool.
 * When a page needs rendering, a canvas is borrowed from the pool.
 * If the pool is empty, a new canvas is created.
 *
 * The pool has a maximum size to prevent unbounded memory growth.
 *
 * When a canvas is released, its dimensions are set to 0 and the 2d context
 * is cleared. This provides defense-in-depth against stale in-flight pdfjs
 * renders: any async render that completes after the canvas was released
 * will write to a 0x0 surface, producing no visible output.
 */

const DEFAULT_MAX_POOL_SIZE = 20; // Enough for visible pages + buffer

export class CanvasPool {
  private _pool: HTMLCanvasElement[] = [];
  private _maxSize: number;

  constructor(maxSize: number = DEFAULT_MAX_POOL_SIZE) {
    this._maxSize = maxSize;
  }

  /**
   * Borrow a canvas from the pool or create a new one.
   * If a pooled canvas is returned, its dimensions have been cleared to 0
   * by the release() method, so the caller must set width/height before use.
   */
  acquire(): HTMLCanvasElement {
    const canvas = this._pool.pop();
    if (canvas) {
      return canvas;
    }
    return document.createElement("canvas");
  }

  /**
   * Return a canvas to the pool for reuse.
   * The canvas is cleared before being returned to prevent data leakage
   * between pages. Setting width/height to 0 also resets the 2d context
   * state, making any stale in-flight render produce no visible output.
   * If the pool is full, the canvas is left for GC.
   */
  release(canvas: HTMLCanvasElement): void {
    canvas.width = 0;
    canvas.height = 0;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 0, 0);
    }

    if (this._pool.length < this._maxSize) {
      this._pool.push(canvas);
    }
  }

  /** Release all canvases in the pool (for cleanup). */
  clear(): void {
    this._pool.length = 0;
  }

  /** Current number of canvases in the pool. */
  get size(): number {
    return this._pool.length;
  }
}
