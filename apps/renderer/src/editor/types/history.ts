/**
 * history.ts — History System Types
 *
 * Purpose: Define types for the undo/redo history manager.
 *
 * The history manager maintains two stacks (undo / redo) and
 * operates on Command instances. It does not inspect command
 * internals — it treats every command as an opaque unit of work.
 */

import type { Command } from "./commands";

// ── History Entry ──────────────────────────────────────────────────
export interface HistoryEntry {
  readonly command: Command;
  readonly timestamp: number;
}

// ── History State ──────────────────────────────────────────────────
export interface HistoryState {
  /** Stack of past commands (most recent at the end). */
  readonly undoStack: HistoryEntry[];
  /** Stack of undone commands (most recent at the end). */
  readonly redoStack: HistoryEntry[];
  /** Maximum number of entries allowed in the undo stack. */
  readonly maxEntries: number;
  /** ID of the current "checkpoint" (for future save-point support). */
  readonly checkpointId: string | null;
}

// ── History Events ─────────────────────────────────────────────────
export type HistoryEventType = "undo" | "redo" | "execute" | "checkpoint" | "clear";

export interface HistoryEvent {
  type: HistoryEventType;
  entry: HistoryEntry | null;
  /** Stack depths after the operation. */
  undoDepth: number;
  redoDepth: number;
}
