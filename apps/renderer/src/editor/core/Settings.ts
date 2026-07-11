/**
 * Settings.ts — Application Settings
 *
 * Purpose: Provide persistent application settings stored in localStorage.
 * Controls theme, autosave interval, default zoom, default tool,
 * UI preferences, and recent files display.
 *
 * Features:
 *   - Full TypeScript types for all settings
 *   - localStorage persistence
 *   - Sensible defaults
 *   - Partial update support
 *   - Change event notifications
 */

const STORAGE_KEY = "docflow_settings";

// ── Settings Interface ─────────────────────────────────────────────
export interface AppSettings {
  /** UI theme. */
  theme: "dark" | "light" | "system";
  /** Autosave interval in milliseconds. */
  autosaveInterval: number;
  /** Default zoom level (1 = 100%). */
  defaultZoom: number;
  /** Default fit mode on document open. */
  defaultFitMode: "width" | "page";
  /** Number of recent files to display. */
  recentFilesLimit: number;
  /** Whether to show the sidebar on startup. */
  showSidebar: boolean;
  /** Whether to show the inspector panel on startup. */
  showInspector: boolean;
  /** UI scale factor (0.8 - 1.2). */
  uiScale: number;
  /** Whether autosave is enabled. */
  autosaveEnabled: boolean;
  /** Performance: max pages to keep rendered off-screen. */
  renderBufferPages: number;
  /** Performance: enable virtual page rendering. */
  virtualRendering: boolean;
  /** Performance: thumbnail quality (0.1 - 1.0). */
  thumbnailQuality: number;
}

// ── Defaults ───────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  autosaveInterval: 30_000,
  defaultZoom: 1,
  defaultFitMode: "width",
  recentFilesLimit: 20,
  showSidebar: true,
  showInspector: true,
  uiScale: 1,
  autosaveEnabled: true,
  renderBufferPages: 1,
  virtualRendering: true,
  thumbnailQuality: 0.5,
};

// ── Settings Manager ───────────────────────────────────────────────
type SettingsListener = (settings: AppSettings) => void;

export class SettingsManager {
  private _settings: AppSettings = { ...DEFAULT_SETTINGS };
  private _listeners: Set<SettingsListener> = new Set();

  constructor() {
    this._load();
  }

  /** Get a single setting value, or all settings if no key is provided. */
  get(): AppSettings;
  get<K extends keyof AppSettings>(key: K): AppSettings[K];
  get<K extends keyof AppSettings>(key?: K): AppSettings[K] | AppSettings {
    if (key) return this._settings[key];
    return { ...this._settings };
  }

  /** Update settings with partial values. */
  update(partial: Partial<AppSettings>): void {
    this._settings = { ...this._settings, ...partial };
    this._save();
    this._notify();
  }

  /** Reset all settings to defaults. */
  reset(): void {
    this._settings = { ...DEFAULT_SETTINGS };
    this._save();
    this._notify();
  }

  /** Subscribe to settings changes. */
  onChange(listener: SettingsListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ── Private ──────────────────────────────────────────────────────
  private _load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this._settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      this._settings = { ...DEFAULT_SETTINGS };
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Settings] Failed to parse stored settings, using defaults");
      }
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Settings] localStorage may be full; settings not persisted");
      }
    }
  }

  private _notify(): void {
    const settings = this.get();
    for (const listener of this._listeners) {
      try {
        listener(settings);
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Settings] A settings listener threw an error");
        }
      }
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const settingsManager = new SettingsManager();
