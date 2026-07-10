/**
 * SaveManager.ts — Save Manager
 *
 * Purpose: Manage the save/save-as lifecycle for documents.
 * Tracks dirty state, handles file overwrites, and coordinates
 * with the ExportEngine, FileSerializer, and DocumentManager.
 *
 * Supports:
 *   - Save (overwrite current file)
 *   - Save As (write to new file)
 *   - Dirty document detection
 *   - Unsaved changes tracking
 *   - Save state management (unsaved/saving/saved/error)
 *   - Error recovery
 */

import type { SaveInfo, SaveState, ExportError } from "./types";
import { ExportErrorCategory, createExportError } from "./types";
import type { EditableObject } from "../types/objects";

// ── Save Callback ──────────────────────────────────────────────────
export interface SaveCallbacks {
  /** Called with PDF bytes and file path to perform actual file write. */
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  /** Called with JSON string and file path to write the .docflow file. */
  writeProjectFile: (path: string, data: string) => Promise<void>;
  /** Called to get the current overlay objects for serialization. */
  getObjects: () => EditableObject[];
  /** Called to get the current document metadata. */
  getMetadata: () => { title: string; author: string; subject: string; keywords: string };
  /** Called to get the current editor state. */
  getEditorState: () => { activePage: number; selectedIds: string[]; activeId: string | null; zoomLevel: number; pan: { x: number; y: number } };
}

// ── Save Manager ───────────────────────────────────────────────────
export class SaveManager {
  private _saveInfo: SaveInfo = {
    filePath: null,
    state: "unsaved",
    lastSavedAt: null,
    dirty: false,
    lastError: null,
  };
  private _callbacks: SaveCallbacks | null = null;
  private _saveInProgress = false;

  /** Register save callbacks. */
  setCallbacks(callbacks: SaveCallbacks): void {
    this._callbacks = callbacks;
  }

  /** Get current save information. */
  getSaveInfo(): SaveInfo {
    return { ...this._saveInfo };
  }

  /** Mark the document as having unsaved changes. */
  markDirty(): void {
    this._saveInfo.dirty = true;
    if (this._saveInfo.state === "saved") {
      this._saveInfo.state = "unsaved";
    }
  }

  /** Mark the document as clean (no unsaved changes). */
  markClean(): void {
    this._saveInfo.dirty = false;
  }

  /** Update the current file path. */
  setFilePath(path: string): void {
    this._saveInfo.filePath = path;
  }

  /** Get the current file path. */
  get filePath(): string | null {
    return this._saveInfo.filePath;
  }

  /** Whether the document has unsaved changes. */
  get isDirty(): boolean {
    return this._saveInfo.dirty;
  }

  /** Current save state. */
  get state(): SaveState {
    return this._saveInfo.state;
  }

  /**
   * Save the document to the current file path.
   * If no file path is set, this does nothing — use saveAs instead.
   */
  async save(exportBytes: Uint8Array): Promise<ExportError | null> {
    if (!this._saveInfo.filePath) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        "No file path set. Use Save As to choose a location.",
        true,
      );
    }

    return this._performSave(this._saveInfo.filePath, exportBytes);
  }

  /**
   * Save the document to a new file path.
   * Also updates the internal file path to the new location.
   */
  async saveAs(filePath: string, exportBytes: Uint8Array): Promise<ExportError | null> {
    const error = await this._performSave(filePath, exportBytes);
    if (!error) {
      this._saveInfo.filePath = filePath;
    }
    return error;
  }

  /**
   * Save the project file (.docflow) alongside the PDF.
   * This preserves the editor state (objects, metadata, viewport).
   */
  async saveProjectFile(filePath: string, jsonContent: string): Promise<ExportError | null> {
    if (!this._callbacks) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        "Save callbacks not registered",
        false,
      );
    }

    try {
      this._saveInfo.state = "saving";
      await this._callbacks.writeProjectFile(filePath, jsonContent);
      return null;
    } catch (err) {
      const error = createExportError(
        ExportErrorCategory.FileSystem,
        `Failed to save project file: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
      this._saveInfo.state = "error";
      this._saveInfo.lastError = error;
      return error;
    }
  }

  // ── Private ──────────────────────────────────────────────────────
  private async _performSave(
    filePath: string,
    data: Uint8Array,
  ): Promise<ExportError | null> {
    if (!this._callbacks) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        "Save callbacks not registered",
        false,
      );
    }

    // Prevent concurrent saves
    if (this._saveInProgress) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        "A save operation is already in progress",
        true,
      );
    }

    this._saveInProgress = true;

    try {
      this._saveInfo.state = "saving";
      await this._callbacks.writeFile(filePath, data);

      this._saveInfo.state = "saved";
      this._saveInfo.lastSavedAt = Date.now();
      this._saveInfo.dirty = false;
      this._saveInfo.lastError = null;

      return null;
    } catch (err) {
      const error = createExportError(
        ExportErrorCategory.FileSystem,
        `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
      this._saveInfo.state = "error";
      this._saveInfo.lastError = error;
      return error;
    } finally {
      this._saveInProgress = false;
    }
  }
}
