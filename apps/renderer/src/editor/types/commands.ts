/**
 * commands.ts — Command Architecture Types
 *
 * Purpose: Define the Command interface that every undoable action
 * must implement, along with command identifiers and the result type
 * returned after execution.
 *
 * Commands follow the classic GoF Command pattern: encapsulate every
 * user action as an object so that it can be executed, undone, and
 * redone by the HistoryManager.
 *
 * Future commands (V2–V4):
 *   CreateObject, DeleteObject, MoveObject, ResizeObject,
 *   RotateObject, EditText, ChangeStyle, Duplicate, Group, Ungroup
 */

// ── Command Identifiers ────────────────────────────────────────────
export const CommandType = {
  CreateObject: "create-object",
  DeleteObject: "delete-object",
  MoveObject: "move-object",
  ResizeObject: "resize-object",
  RotateObject: "rotate-object",
  EditText: "edit-text",
  ChangeStyle: "change-style",
  Duplicate: "duplicate",
  Group: "group",
  Ungroup: "ungroup",
} as const;

export type CommandType = (typeof CommandType)[keyof typeof CommandType];

// ── Command Interface ──────────────────────────────────────────────
export interface Command {
  /** Unique identifier for this command instance (for history tracking). */
  readonly id: string;
  /** Discriminant for the kind of command. */
  readonly type: CommandType;
  /** Human-readable label shown in undo/redo UI. */
  readonly label: string;
  /** Timestamp (ms) when the command was first executed. */
  readonly timestamp: number;

  /**
   * Execute (or re-execute after undo) the command.
   * Returns a result describing what changed so the store/renderer
   * can update efficiently.
   */
  execute(): CommandResult;

  /** Reverse the effect of execute(). */
  undo(): CommandResult;

  /**
   * Optional — if true the command can be merged with the previous
   * command of the same type (e.g. during a drag).
   */
  canMerge?: boolean;

  /**
   * Merge this command's effect into the previous command.
   * Called only when canMerge is true.
   */
  merge?(previous: Command): void;
}

// ── Command Result ─────────────────────────────────────────────────
export interface CommandResult {
  /** IDs of objects that were added. */
  created: string[];
  /** IDs of objects that were removed. */
  deleted: string[];
  /** IDs of objects whose properties changed. */
  updated: string[];
  /** IDs of objects whose selection state changed. */
  selectionChanged: string[];
  /** True if the document needs to re-render. */
  needsRender: boolean;
}

export const emptyCommandResult: CommandResult = {
  created: [],
  deleted: [],
  updated: [],
  selectionChanged: [],
  needsRender: false,
};
