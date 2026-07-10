/**
 * ExportSettings.ts — Export Settings & Configuration
 *
 * Purpose: Manage export configuration with sensible defaults.
 */

import type { ExportSettings as ExportSettingsType } from "./types";
import { DEFAULT_EXPORT_SETTINGS } from "./types";

export class ExportSettingsManager {
  private _settings: ExportSettingsType = { ...DEFAULT_EXPORT_SETTINGS };

  /** Get current settings. */
  get(): ExportSettingsType {
    return { ...this._settings };
  }

  /** Update settings (partial update). */
  update(partial: Partial<ExportSettingsType>): void {
    this._settings = { ...this._settings, ...partial };
  }

  /** Reset to defaults. */
  reset(): void {
    this._settings = { ...DEFAULT_EXPORT_SETTINGS };
  }

  /** Apply a preset for maximum quality. */
  setMaxQuality(): void {
    this._settings.compressionLevel = 9;
    this._settings.embedFonts = true;
  }

  /** Apply a preset for smallest file size. */
  setMinSize(): void {
    this._settings.compressionLevel = 0;
    this._settings.embedFonts = false;
  }
}
