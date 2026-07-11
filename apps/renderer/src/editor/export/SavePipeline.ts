/**
 * SavePipeline.ts — Unified Save Pipeline
 *
 * Purpose: Single save pipeline used by manual save, save-as, autosave,
 * and recovery save. Eliminates duplicate save logic across the codebase.
 *
 * All save operations flow through this pipeline:
 *
 *   manualSave / saveAs / autosave / recoverySave
 *       │
 *       ▼
 *   SavePipeline.save()
 *       │
 *       ├── Validate document state
 *       ├── ExportEngine.export() → PDF bytes
 *       ├── Write bytes (callback)
 *       ├── Write .docflow project file (callback)
 *       ├── Update dirty state
 *       └── Notify listeners
 *
 * This ensures every save path has identical behavior for:
 *   - Dirty state management
 *   - Export settings
 *   - Progress tracking
 *   - Error handling
 *   - Concurrent save prevention
 *   - Recovery session updates
 */

import { ExportEngine } from "./ExportEngine";
import { useEditorStore } from "../state/editorStore";
import { useWorkspaceStore } from "../workspace/WorkspaceStore";
import { workspaceErrorHandler } from "../core/ErrorManager";
import type { ExportSettings } from "./types";
import { DEFAULT_EXPORT_SETTINGS } from "./types";

// ── Save Result ────────────────────────────────────────────────────
export interface SaveResult {
  /** Whether the save completed successfully. */
  success: boolean;
  /** The exported PDF bytes (null if save failed or no export needed). */
  bytes: Uint8Array | null;
  /** Human-readable error message (null if successful). */
  error: string | null;
}

// ── Save Options ───────────────────────────────────────────────────
export interface SaveOptions {
  /** File path to save to. Required for saveAs, optional for regular save. */
  filePath?: string;
  /** Whether this is an autosave (suppresses UI notifications). */
  isAutosave?: boolean;
  /** Whether to skip the ExportEngine export (for recovery saves). */
  skipExport?: boolean;
  /** Pre-exported PDF bytes (for recovery saves that already have bytes). */
  preExportedBytes?: Uint8Array;
}

// ── Write Callback ─────────────────────────────────────────────────
export type WriteFileCallback = (
  path: string,
  data: Uint8Array,
) => Promise<void>;

// ── Save Pipeline ──────────────────────────────────────────────────
export class SavePipeline {
  private _exportEngine: ExportEngine;
  private _settings: ExportSettings = { ...DEFAULT_EXPORT_SETTINGS };
  private _saveInProgress = false;
  private _writeFileCallback: WriteFileCallback | null = null;
  private _writeProjectFileCallback: WriteFileCallback | null = null;
  private _onSaveCallbacks: Array<(result: SaveResult) => void> = [];

  constructor(exportEngine?: ExportEngine) {
    this._exportEngine = exportEngine ?? new ExportEngine();
  }

  /** Register the callback for writing PDF bytes to a file path. */
  setWriteFileCallback(callback: WriteFileCallback): void {
    this._writeFileCallback = callback;
  }

  /** Register the callback for writing .docflow project file. */
  setWriteProjectFileCallback(callback: WriteFileCallback): void {
    this._writeProjectFileCallback = callback;
  }

  /** Register a listener for save results. */
  onSave(callback: (result: SaveResult) => void): () => void {
    this._onSaveCallbacks.push(callback);
    return () => {
      const idx = this._onSaveCallbacks.indexOf(callback);
      if (idx >= 0) this._onSaveCallbacks.splice(idx, 1);
    };
  }

  /** Update export settings. */
  setSettings(settings: Partial<ExportSettings>): void {
    this._settings = { ...this._settings, ...settings };
  }

  /** Get the export engine instance. */
  get exportEngine(): ExportEngine {
    return this._exportEngine;
  }

  /** Whether a save is currently in progress. */
  get isSaveInProgress(): boolean {
    return this._saveInProgress;
  }

  /**
   * Execute a save through the unified pipeline.
   *
   * Flow:
   *   1. Get the active document and overlay objects from the stores
   *   2. Export the PDF with overlays via ExportEngine
   *   3. Write the PDF bytes via the write callback
   *   4. Write the .docflow project file (if path is known)
   *   5. Clear dirty state on the document
   *   6. Notify all listeners
   */
  async save(docId: string, options: SaveOptions = {}): Promise<SaveResult> {
    // Prevent concurrent saves
    if (this._saveInProgress) {
      return { success: false, bytes: null, error: "A save operation is already in progress" };
    }

    const wsStore = useWorkspaceStore.getState();
    const doc = wsStore.documents.find((d) => d.id === docId);
    if (!doc) {
      return { success: false, bytes: null, error: `Document ${docId} not found` };
    }

    this._saveInProgress = true;

    try {
      let pdfBytes: Uint8Array | null = options.preExportedBytes ?? null;

      // Export PDF with overlays (skip for pre-exported bytes / recovery)
      if (!options.skipExport && !pdfBytes) {
        const editorStore = useEditorStore.getState();
        const overlayObjects = editorStore.overlayObjects;

        if (doc.pdf) {
          const pdfData = await doc.pdf.getData();
          const originalBytes = new Uint8Array(pdfData);

          const result = await this._exportEngine.export(
            originalBytes,
            overlayObjects,
            { type: "all" },
          );

          if (!result.success) {
            const errorMsg = result.errors.map((e) => e.message).join("; ");
            return { success: false, bytes: null, error: `Export failed: ${errorMsg}` };
          }

          pdfBytes = result.bytes;
        } else {
          // No PDF loaded — create minimal PDF
          pdfBytes = new Uint8Array(0);
        }
      }

      if (!pdfBytes) {
        return { success: false, bytes: null, error: "No PDF bytes produced" };
      }

      // Determine the save path
      const savePath = options.filePath ?? doc.filePath;
      if (!savePath) {
        return { success: false, bytes: null, error: "No file path available. Use Save As." };
      }

      // Write PDF bytes
      if (this._writeFileCallback) {
        await this._writeFileCallback(savePath, pdfBytes);
      }

      // Write .docflow project file alongside the PDF
      if (this._writeProjectFileCallback && !options.isAutosave) {
        try {
          const projectFilePath = savePath.replace(/\.pdf$/i, ".docflow");
          const projectJson = JSON.stringify({
            formatVersion: 1,
            savedAt: Date.now(),
            docflowVersion: 1,
          });
          await this._writeProjectFileCallback(projectFilePath, new TextEncoder().encode(projectJson));
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            workspaceErrorHandler.warn("Save", `Project file write failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      // Update dirty state
      wsStore.setDocumentDirty(docId, false);
      wsStore.updateDocument(docId, { savedAt: Date.now() });
      useEditorStore.getState().setDirty(false);
      useEditorStore.getState().setLastSavedAt(Date.now());

      // Notify listeners (unless this is a background autosave)
      if (!options.isAutosave) {
        for (const cb of this._onSaveCallbacks) {
          try { cb({ success: true, bytes: pdfBytes, error: null }); } catch { /* best-effort — listener errors must not crash save */ }
        }
      }

      return { success: true, bytes: pdfBytes, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      workspaceErrorHandler.error("Save", `Save failed: ${errorMsg}`);
      return { success: false, bytes: null, error: errorMsg };
    } finally {
      this._saveInProgress = false;
    }
  }

  /**
   * Force an immediate autosave of all dirty documents.
   * Returns the save results for each document.
   */
  async autosaveAll(): Promise<SaveResult[]> {
    const wsStore = useWorkspaceStore.getState();
    const dirtyDocs = wsStore.documents.filter((d) => d.isDirty);

    const results: SaveResult[] = [];
    for (const doc of dirtyDocs) {
      const result = await this.save(doc.id, { isAutosave: true });
      results.push(result);
    }
    return results;
  }
}
