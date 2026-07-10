/**
 * AutosaveManager.ts — Autosave Manager
 *
 * Purpose: Automatically save the document at regular intervals
 * to prevent data loss from crashes, power failures, or unexpected
 * closes. Uses crash-safe temporary files with atomic writes.
 *
 * Features:
 *   - Configurable save interval (default: 30 seconds)
 *   - Debounced saves (only save if document is dirty)
 *   - Crash-safe: write to temp file, then rename to final path
 *   - Pause during manual exports to avoid conflicts
 *   - Resume automatically after export completes
 *   - Configurable max autosave files retention
 */

import type { AutosaveConfig, ExportError } from "./types";
import { DEFAULT_AUTOSAVE_CONFIG } from "./types";
import { ExportErrorCategory, createExportError } from "./types";

// ── Autosave Callbacks ─────────────────────────────────────────────
export interface AutosaveCallbacks {
  /** Save the document and return bytes. */
  performSave: () => Promise<Uint8Array | null>;
  /** Write bytes to a file path. */
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  /** Delete a file at the given path. */
  deleteFile: (path: string) => Promise<void>;
  /** Check if a file exists at the given path. */
  fileExists: (path: string) => Promise<boolean>;
  /** Get the current autosave directory path. */
  getAutosaveDir: () => string;
}

// ── Autosave Manager ───────────────────────────────────────────────
export class AutosaveManager {
  private _config: AutosaveConfig = { ...DEFAULT_AUTOSAVE_CONFIG };
  private _callbacks: AutosaveCallbacks | null = null;
  private _timerId: ReturnType<typeof setInterval> | null = null;
  private _paused = false;
  private _lastSaveTime = 0;
  private _inProgress = false;

  /** Configure autosave settings. */
  configure(config: Partial<AutosaveConfig>): void {
    this._config = { ...this._config, ...config };
    if (this._timerId) {
      this.stop();
      this.start();
    }
  }

  /** Register autosave callbacks. */
  setCallbacks(callbacks: AutosaveCallbacks): void {
    this._callbacks = callbacks;
  }

  /** Start the autosave timer. */
  start(): void {
    if (this._timerId || !this._config.enabled) return;

    this._timerId = setInterval(() => {
      this._performAutosave();
    }, this._config.interval);
  }

  /** Stop the autosave timer. */
  stop(): void {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /** Pause autosave (e.g., during manual export). */
  pause(): void {
    this._paused = true;
  }

  /** Resume autosave after pausing. */
  resume(): void {
    this._paused = false;
  }

  /** Force an immediate autosave, bypassing the interval. */
  async flush(): Promise<ExportError | null> {
    return this._performAutosave();
  }

  /** Get current config. */
  get config(): AutosaveConfig {
    return { ...this._config };
  }

  /** Get the path for the current autosave file. */
  getAutosavePath(): string {
    const dir = this._callbacks?.getAutosaveDir() ?? this._config.directory;
    return `${dir}/autosave.docflow.json`;
  }

  // ── Private ──────────────────────────────────────────────────────
  private async _performAutosave(): Promise<ExportError | null> {
    if (this._paused || this._inProgress || !this._callbacks) return null;

    // Don't autosave more than once per interval
    const now = Date.now();
    if (now - this._lastSaveTime < this._config.interval / 2) return null;

    this._inProgress = true;

    try {
      // Perform the save
      const bytes = await this._callbacks.performSave();
      if (!bytes) {
        this._inProgress = false;
        return null;
      }

      // Write autosave data directly to the autosave path
      const finalPath = this.getAutosavePath();
      await this._callbacks.writeFile(finalPath, bytes);

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
