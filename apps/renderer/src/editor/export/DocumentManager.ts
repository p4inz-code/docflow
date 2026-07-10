/**
 * DocumentManager.ts — Document Lifecycle Manager
 *
 * Purpose: Manage the complete document lifecycle from open to close.
 * Coordinates with SaveManager, AutosaveManager, RecoveryManager,
 * and the editor store to provide a cohesive document experience.
 *
 * Responsibilities:
 *   - Open (load PDF + restore editor state)
 *   - Close (check for unsaved changes, clean up)
 *   - Save (coordinate export + save + project file)
 *   - Save As
 *   - Reload
 *   - New document
 *   - Document dirty state tracking
 *   - Recent documents tracking
 *   - Session information
 */

import type { DocumentInfo, ExportError } from "./types";
import { ExportErrorCategory, createExportError } from "./types";
import { SaveManager } from "./SaveManager";
import { AutosaveManager } from "./AutosaveManager";
import { RecoveryManager } from "./RecoveryManager";
import { ExportEngine } from "./ExportEngine";
import { FileSerializer } from "./FileSerializer";
import { FileDeserializer } from "./FileDeserializer";
import type { EditableObject } from "../types/objects";

// ── Document Events ────────────────────────────────────────────────
export type DocumentEventType =
  | "opened"
  | "closed"
  | "saved"
  | "saved-as"
  | "dirty-changed"
  | "reloaded"
  | "recovered";

export interface DocumentEvent {
  type: DocumentEventType;
  info: DocumentInfo;
  timestamp: number;
}

// ── Document Manager ───────────────────────────────────────────────
export class DocumentManager {
  private _info: DocumentInfo = this._createInitialInfo();
  private _saveManager: SaveManager;
  private _autosaveManager: AutosaveManager;
  private _recoveryManager: RecoveryManager;
  private _exportEngine: ExportEngine;
  private _serializer: FileSerializer;
  private _deserializer: FileDeserializer;
  private _originalPdfBytes: Uint8Array | null = null;
  private _events: Array<(event: DocumentEvent) => void> = [];

  constructor(
    saveManager: SaveManager,
    autosaveManager: AutosaveManager,
    recoveryManager: RecoveryManager,
    exportEngine: ExportEngine,
  ) {
    this._saveManager = saveManager;
    this._autosaveManager = autosaveManager;
    this._recoveryManager = recoveryManager;
    this._exportEngine = exportEngine;
    this._serializer = new FileSerializer();
    this._deserializer = new FileDeserializer();
  }

  /** Subscribe to document events. */
  onEvent(callback: (event: DocumentEvent) => void): void {
    this._events.push(callback);
  }

  /** Unsubscribe from document events. */
  offEvent(callback: (event: DocumentEvent) => void): void {
    this._events = this._events.filter((cb) => cb !== callback);
  }

  /** Get current document info. */
  getInfo(): DocumentInfo {
    return { ...this._info };
  }

  /** Get the save manager. */
  get saveManager(): SaveManager {
    return this._saveManager;
  }

  /** Get the autosave manager. */
  get autosaveManager(): AutosaveManager {
    return this._autosaveManager;
  }

  /** Get the recovery manager. */
  get recoveryManager(): RecoveryManager {
    return this._recoveryManager;
  }

  /** Get the export engine. */
  get exportEngine(): ExportEngine {
    return this._exportEngine;
  }

  /** Whether the document has unsaved changes. */
  get isDirty(): boolean {
    return this._saveManager.isDirty || this._info.dirty;
  }

  /**
   * Open a PDF document.
   *
   * @param pdfBytes - The raw PDF file bytes.
   * @param filePath - The file path (null for new documents).
   * @param fileName - The original file name.
   */
  async open(
    pdfBytes: Uint8Array,
    filePath: string | null,
    fileName: string | null,
  ): Promise<void> {
    this._originalPdfBytes = pdfBytes;

    this._info = {
      ...this._createInitialInfo(),
      originalFileName: fileName,
      originalFilePath: filePath,
      currentFilePath: filePath,
      pageCount: 1, // Will be updated when PDF is rendered
      openedAt: Date.now(),
    };

    this._saveManager.setFilePath(filePath ?? "");

    // Start autosave
    this._autosaveManager.start();

    // Start recovery session
    await this._recoveryManager.startSession(
      filePath,
      this._autosaveManager.getAutosavePath(),
    );

    this._emit("opened");
  }

  /**
   * Close the current document.
   */
  async close(): Promise<void> {
    // Stop autosave
    this._autosaveManager.stop();

    // End recovery session
    await this._recoveryManager.endSession();

    // Reset state
    this._originalPdfBytes = null;
    this._info = this._createInitialInfo();

    this._emit("closed");
  }

  /**
   * Save the current document.
   */
  async save(
    _overlayObjects: EditableObject[],
    getBytes: () => Promise<Uint8Array>,
  ): Promise<ExportError | null> {
    if (!this._info.currentFilePath) {
      return createExportError(
        ExportErrorCategory.FileSystem,
        "No file path set. Use Save As.",
        true,
      );
    }

    // Pause autosave during manual save
    this._autosaveManager.pause();

    try {
      // Export the PDF with overlays
      const pdfBytes = await getBytes();
      const error = await this._saveManager.save(pdfBytes);

      if (!error) {
        this._info.lastSavedAt = Date.now();
        this._info.dirty = false;
        this._emit("saved");
      }

      return error;
    } finally {
      this._autosaveManager.resume();
    }
  }

  /**
   * Save the document to a new file path.
   */
  async saveAs(
    filePath: string,
    _overlayObjects: EditableObject[],
    getBytes: () => Promise<Uint8Array>,
  ): Promise<ExportError | null> {
    this._autosaveManager.pause();

    try {
      const pdfBytes = await getBytes();
      const error = await this._saveManager.saveAs(filePath, pdfBytes);

      if (!error) {
        this._info.currentFilePath = filePath;
        this._info.lastSavedAt = Date.now();
        this._info.dirty = false;
        this._emit("saved-as");
      }

      return error;
    } finally {
      this._autosaveManager.resume();
    }
  }

  /**
   * Serialize the editor state for persistence alongside the PDF.
   */
  serializeState(
    overlayObjects: EditableObject[],
    editorState: {
      activePage: number;
      selectedIds: string[];
      activeId: string | null;
      zoomLevel: number;
      pan: { x: number; y: number };
    },
  ): string {
    return this._serializer.serialize(
      overlayObjects,
      {
        title: this._info.title,
        author: this._info.author,
        subject: "",
        keywords: "",
      },
      editorState,
    );
  }

  /**
   * Update page count when PDF is rendered.
   */
  setPageCount(count: number): void {
    this._info.pageCount = count;
  }

  /**
   * Mark the document as having unsaved changes.
   */
  markDirty(): void {
    this._info.dirty = true;
    this._saveManager.markDirty();
    this._emit("dirty-changed");
  }

  // ── Private ──────────────────────────────────────────────────────
  private _createInitialInfo(): DocumentInfo {
    return {
      originalFileName: null,
      originalFilePath: null,
      currentFilePath: null,
      title: "Untitled",
      author: "",
      pageCount: 0,
      dirty: false,
      openedAt: Date.now(),
      lastSavedAt: null,
      formatVersion: 1,
    };
  }

  private _emit(type: DocumentEventType): void {
    const event: DocumentEvent = {
      type,
      info: this.getInfo(),
      timestamp: Date.now(),
    };
    for (const cb of this._events) {
      cb(event);
    }
  }
}
