/**
 * RecentFilesManager.ts — Recent Files Tracking
 *
 * Purpose: Track recently opened PDF files and persist the list
 * to localStorage. Provides a clean API for the UI to display
 * and interact with recent files.
 *
 * Features:
 *   - Track up to N recent files (default: 20)
 *   - Persist to localStorage
 *   - Deduplicate by file path
 *   - Timestamp tracking for MRU ordering
 *   - Clean API for UI integration
 */

const STORAGE_KEY = "docflow_recent_files";
const MAX_RECENT_FILES = 20;

export interface RecentFileEntry {
  /** Absolute or blob URL path to the file. */
  path: string;
  /** Display name (file name only). */
  name: string;
  /** Timestamp when the file was last opened. */
  lastOpened: number;
}

export class RecentFilesManager {
  private _files: RecentFileEntry[] = [];

  constructor() {
    this._load();
  }

  /** Get the list of recent files (most recent first). */
  get files(): RecentFileEntry[] {
    return [...this._files];
  }

  /**
   * Record that a file was opened.
   * @param path - Real file system path (from Electron's `file.path`) or fallback identifier.
   * @param name - Display name (file name only).
   */
  recordOpen(path: string, name: string): void {
    if (!path) return;

    // Remove existing entry for this path (deduplicate)
    this._files = this._files.filter((f) => f.path !== path);

    // Add to front
    this._files.unshift({
      path,
      name,
      lastOpened: Date.now(),
    });

    // Enforce max
    if (this._files.length > MAX_RECENT_FILES) {
      this._files = this._files.slice(0, MAX_RECENT_FILES);
    }

    this._save();
  }

  /** Remove a file from the recent list. */
  remove(path: string): void {
    this._files = this._files.filter((f) => f.path !== path);
    this._save();
  }

  /** Clear all recent files. */
  clear(): void {
    this._files = [];
    this._save();
  }

  /** Get the number of recent files. */
  get count(): number {
    return this._files.length;
  }

  // ── Private ──────────────────────────────────────────────────────
  private _load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._files = JSON.parse(stored);
      }
    } catch {
      this._files = [];
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._files));
    } catch {
      // localStorage may be full or unavailable
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const recentFilesManager = new RecentFilesManager();
