/**
 * ProgressReporter.ts — Export Progress Reporter
 *
 * Purpose: Track and report progress during export operations.
 * Supports cancellation, stage tracking, and callback-based
 * progress updates for future UI integration.
 */

import type { ExportProgress, ExportError } from "./types";

export type ProgressCallback = (progress: ExportProgress) => void;

// ── Progress Reporter ──────────────────────────────────────────────
export class ProgressReporter {
  private _callback: ProgressCallback | null = null;
  private _cancelled = false;
  private _currentStage = "";
  private _overall = 0;
  private _pageProgress = 0;
  private _currentPage = 0;
  private _totalPages = 0;
  private _error: ExportError | null = null;

  /** Register a progress callback. */
  set onProgress(callback: ProgressCallback | null) {
    this._callback = callback;
  }

  /** Notify a stage change. */
  setStage(stage: string): void {
    this._currentStage = stage;
    this._pageProgress = 0;
    this._notify();
  }

  /** Update overall progress (0-1). */
  setOverall(value: number): void {
    this._overall = Math.max(0, Math.min(1, value));
    this._notify();
  }

  /** Update page progress (0-1). */
  setPageProgress(value: number): void {
    this._pageProgress = Math.max(0, Math.min(1, value));
    this._notify();
  }

  /** Set current page being processed. */
  setCurrentPage(page: number): void {
    this._currentPage = page;
    this._notify();
  }

  /** Set total pages to process. */
  setTotalPages(count: number): void {
    this._totalPages = count;
    this._notify();
  }

  /** Report an error that occurred during processing. */
  setError(error: ExportError): void {
    this._error = error;
    this._notify();
  }

  /** Cancel the current operation. */
  cancel(): void {
    this._cancelled = true;
  }

  /** Whether the operation was cancelled. */
  get isCancelled(): boolean {
    return this._cancelled;
  }

  /** Reset the reporter for a new operation. */
  reset(): void {
    this._cancelled = false;
    this._currentStage = "";
    this._overall = 0;
    this._pageProgress = 0;
    this._currentPage = 0;
    this._totalPages = 0;
    this._error = null;
  }

  /** Get the current progress snapshot. */
  getProgress(): ExportProgress {
    return {
      stage: this._currentStage,
      overall: this._overall,
      pageProgress: this._pageProgress,
      currentPage: this._currentPage,
      totalPages: this._totalPages,
      cancelled: this._cancelled,
      error: this._error,
    };
  }

  // ── Private ──────────────────────────────────────────────────────
  private _notify(): void {
    this._callback?.(this.getProgress());
  }
}
