/**
 * AutosaveManager.ts — Autosave Manager
 *
 * Purpose: Automatically save dirty documents at regular intervals
 * via the unified SavePipeline. Prevents data loss from crashes,
 * power failures, or unexpected closes.
 *
 * Integrates with:
 *   - SavePipeline: all autosaves flow through the single save pipeline
 *   - SettingsManager: respects autosaveEnabled and autosaveInterval settings
 *   - WorkspaceStore: only saves dirty documents
 *
 * Features:
 *   - Configurable save interval (default: 30 seconds)
 *   - Only saves dirty documents (no-op when nothing is modified)
 *   - Debounce: skips if last save was less than half the interval ago
 *   - Overlap prevention: serializes saves, no concurrent autosaves
 *   - Pause/resume: suppressed during manual saves and exports
 *   - Single timer: no duplicate intervals, cleaned on stop/dispose
 *   - Memory safe: no leaked references, no dangling timers
 */

import type { AutosaveConfig, ExportError } from "./types";
import { DEFAULT_AUTOSAVE_CONFIG } from "./types";
import { ExportErrorCategory, createExportError } from "./types";
import { SavePipeline } from "./SavePipeline";
import { useWorkspaceStore } from "../workspace/WorkspaceStore";

// ── Autosave Manager ───────────────────────────────────────────────
export class AutosaveManager {
  private _config: AutosaveConfig = { ...DEFAULT_AUTOSAVE_CONFIG };
  private _pipeline: SavePipeline;
  private _timerId: ReturnType<typeof setInterval> | null = null;
  private _paused = false;
  private _lastSaveTime = 0;
  private _inProgress = false;
  private _disposed = false;

  constructor(pipeline: SavePipeline) {
    this._pipeline = pipeline;
  }

  /** Check whether the manager has been disposed. */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /** Configure autosave settings. */
  configure(config: Partial<AutosaveConfig>): void {
    this._config = { ...this._config, ...config };
    // Restart timer with new interval if running
    if (this._timerId) {
      this.stop();
      this.start();
    }
  }

  /** Start the autosave timer. Only starts if enabled and not already running. */
  start(): void {
    if (this._timerId || !this._config.enabled || this._disposed) return;

    this._timerId = setInterval(() => {
      this._performAutosave();
    }, this._config.interval);
  }

  /**
   * Stop the autosave timer and pause saves.
   * Does NOT set _disposed — start() can be called again later
   * when new documents are opened.
   */
  stop(): void {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._paused = true;
  }

  /** Pause autosave (e.g., during manual export or save). */
  pause(): void {
    this._paused = true;
  }

  /** Resume autosave after pausing. */
  resume(): void {
    this._paused = false;
  }

  /**
   * Force an immediate autosave of all dirty documents, bypassing the interval.
   * Used by the visibilitychange handler before tab hide.
   */
  async flush(): Promise<ExportError | null> {
    return this._performAutosave(true);
  }

  /** Get current config. */
  get config(): AutosaveConfig {
    return { ...this._config };
  }

  // ── Private ──────────────────────────────────────────────────────
  /**
   * Perform an autosave of all dirty documents through the unified pipeline.
   * Skips if paused, disposed, already in progress, or within debounce window.
   */
  private async _performAutosave(force = false): Promise<ExportError | null> {
    if (this._disposed || this._paused || this._inProgress) return null;

    // Debounce: don't autosave more than once per half-interval
    const now = Date.now();
    if (!force && now - this._lastSaveTime < this._config.interval / 2) return null;

    this._inProgress = true;

    try {
      const wsStore = useWorkspaceStore.getState();
      const dirtyDocs = wsStore.documents.filter((d) => d.isDirty);

      if (dirtyDocs.length === 0) return null;

      for (const doc of dirtyDocs) {
        await this._pipeline.save(doc.id, {
          isAutosave: true,
        });
      }

      this._lastSaveTime = now;
      return null;
    } catch (err) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        `Autosave failed: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
    } finally {
      this._inProgress = false;
    }
  }
}
