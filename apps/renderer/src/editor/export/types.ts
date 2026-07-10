/**
 * types.ts — Export & Save System Types
 *
 * Purpose: Define all type definitions for the export, save,
 * recovery, and document management subsystems.
 */

import type { EditableObject } from "../types/objects";

// ── Export Settings ────────────────────────────────────────────────
export interface ExportSettings {
  /** Whether to include overlay objects in the output. */
  includeOverlays: boolean;
  /** Whether to preserve original PDF metadata. */
  preserveMetadata: boolean;
  /** Whether to embed fonts (if available, otherwise use standard fonts). */
  embedFonts: boolean;
  /** Compression level (0-9, 0=none, 9=max). */
  compressionLevel: number;
  /** Whether to flatten all objects into the PDF (non-editable). */
  flatten: boolean;
  /** Author metadata for new/existing documents. */
  author: string;
  /** Subject metadata. */
  subject: string;
  /** Keywords metadata. */
  keywords: string;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  includeOverlays: true,
  preserveMetadata: true,
  embedFonts: true,
  compressionLevel: 6,
  flatten: true,
  author: "Docflow",
  subject: "",
  keywords: "",
};

// ── Export Range ───────────────────────────────────────────────────
export type ExportRange =
  | { type: "all" }
  | { type: "current" }
  | { type: "pages"; pages: number[] }
  | { type: "range"; start: number; end: number };

// ── Export Progress ────────────────────────────────────────────────
export interface ExportProgress {
  /** Current stage description. */
  stage: string;
  /** Overall progress 0-1. */
  overall: number;
  /** Page progress within current stage 0-1. */
  pageProgress: number;
  /** Current page being processed (1-based). */
  currentPage: number;
  /** Total pages to process. */
  totalPages: number;
  /** Whether the export was cancelled. */
  cancelled: boolean;
  /** Any error that occurred (null if successful so far). */
  error: ExportError | null;
}

// ── Export Errors ──────────────────────────────────────────────────
export const ExportErrorCategory = {
  FileSystem: "file-system",
  Permissions: "permissions",
  PdfGeneration: "pdf-generation",
  FontFailure: "font-failure",
  ImageFailure: "image-failure",
  Serialization: "serialization",
  Deserialization: "deserialization",
  Validation: "validation",
  Cancelled: "cancelled",
  Unknown: "unknown",
} as const;

export type ExportErrorCategory = (typeof ExportErrorCategory)[keyof typeof ExportErrorCategory];

export interface ExportError {
  category: ExportErrorCategory;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export function createExportError(
  category: ExportErrorCategory,
  message: string,
  recoverable = false,
  details?: Record<string, unknown>,
): ExportError {
  return { category, message, recoverable, details };
}

// ── Save State ─────────────────────────────────────────────────────
export type SaveState = "unsaved" | "saving" | "saved" | "error";

export interface SaveInfo {
  /** Current file path (null if never saved). */
  filePath: string | null;
  /** Current save state. */
  state: SaveState;
  /** Last save timestamp (ms). */
  lastSavedAt: number | null;
  /** Whether the document has unsaved changes. */
  dirty: boolean;
  /** The last error that occurred during save. */
  lastError: ExportError | null;
}

// ── Document Info ──────────────────────────────────────────────────
export interface DocumentInfo {
  /** Original PDF file name. */
  originalFileName: string | null;
  /** Original PDF file path. */
  originalFilePath: string | null;
  /** Current document file path (after save/save-as). */
  currentFilePath: string | null;
  /** Document title. */
  title: string;
  /** Document author. */
  author: string;
  /** Total page count. */
  pageCount: number;
  /** Whether the document has been modified since last save. */
  dirty: boolean;
  /** Timestamp when the document was opened. */
  openedAt: number;
  /** Timestamp when the document was last saved. */
  lastSavedAt: number | null;
  /** Serialization format version. */
  formatVersion: number;
}

// ── Serialization ──────────────────────────────────────────────────
export interface SerializedDocument {
  /** Format version for compatibility checking. */
  formatVersion: number;
  /** Application that created this file. */
  creator: string;
  /** Timestamp when serialized. */
  createdAt: number;
  /** All overlay objects. */
  overlayObjects: EditableObject[];
  /** Document metadata. */
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
  /** Editor state snapshot (viewport, selection, etc.). */
  editorState: {
    activePage: number;
    selectedIds: string[];
    activeId: string | null;
    zoomLevel: number;
    pan: { x: number; y: number };
  };
}

export const CURRENT_FORMAT_VERSION = 1;

// ── Recovery ───────────────────────────────────────────────────────
export interface RecoverySession {
  /** Unique session ID. */
  sessionId: string;
  /** Timestamp when the session started. */
  startedAt: number;
  /** Timestamp of the last autosave. */
  lastAutosaveAt: number;
  /** Path to the original PDF file (if any). */
  originalFilePath: string | null;
  /** Path to the autosave file. */
  autosavePath: string | null;
}

// ── Autosave ───────────────────────────────────────────────────────
export interface AutosaveConfig {
  /** Interval between autosaves in milliseconds. */
  interval: number;
  /** Maximum number of autosave files to retain. */
  maxFiles: number;
  /** Directory for autosave files. */
  directory: string;
  /** Whether autosave is enabled. */
  enabled: boolean;
}

export const DEFAULT_AUTOSAVE_CONFIG: AutosaveConfig = {
  interval: 30_000, // 30 seconds
  maxFiles: 10,
  directory: ".docflow/autosave",
  enabled: true,
};
