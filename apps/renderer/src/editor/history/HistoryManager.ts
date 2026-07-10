/**
 * HistoryManager.ts — History Foundation
 *
 * Purpose: Manage the undo / redo stacks and enforce history limits.
 *
 * The HistoryManager is a standalone component that receives
 * commands after they have been executed by the CommandManager.
 * It does not inspect command internals — commands are opaque
 * units of work that know how to undo() and redo() themselves.
 *
 * Future expansion (V2–V4):
 *   - History checkpoints / save-points
 *   - Timeline visualization
 *   - Debounced command coalescing during drag operations
 */

import type { Command } from "../types/commands";
import type { HistoryEntry, HistoryState, HistoryEvent, HistoryEventType } from "../types/history";
import { MAX_HISTORY_ENTRIES } from "../core/constants";

// ── History Manager ────────────────────────────────────────────────
export class HistoryManager {
  private _entries: HistoryEntry[] = [];
  private _redoStack: HistoryEntry[] = [];
  private _maxEntries: number = MAX_HISTORY_ENTRIES;
  private _checkpointId: string | null = null;

  /** Callback fired whenever the history state changes. */
  onChange: ((event: HistoryEvent) => void) | null = null;

  /**
   * Register and store a newly executed command.
   * Pushing a new command clears the redo stack.
   */
  push(command: Command): void {
    const entry: HistoryEntry = { command, timestamp: Date.now() };
    this._entries.push(entry);

    // Enforce maximum history size.
    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    // Clear redo stack — new actions invalidate redo history.
    this._redoStack = [];

    this._notify("execute", entry);
  }

  /** Undo the most recent command. Returns the undone command or null. */
  undo(): Command | null {
    const entry = this._entries.pop();
    if (!entry) return null;

    entry.command.undo();
    this._redoStack.push(entry);

    this._notify("undo", entry);
    return entry.command;
  }

  /** Redo the most recently undone command. Returns the redone command or null. */
  redo(): Command | null {
    const entry = this._redoStack.pop();
    if (!entry) return null;

    entry.command.execute();
    this._entries.push(entry);

    this._notify("redo", entry);
    return entry.command;
  }

  // ── Checkpoints ──────────────────────────────────────────────────
  /** Mark the current position as a checkpoint (future use). */
  setCheckpoint(): void {
    this._checkpointId = crypto.randomUUID();
    this._notify("checkpoint", null);
  }

  /** Clear the current checkpoint marker. */
  clearCheckpoint(): void {
    this._checkpointId = null;
    this._notify("checkpoint", null);
  }

  // ── State Queries ────────────────────────────────────────────────
  /** Number of entries in the undo stack. */
  get undoLength(): number {
    return this._entries.length;
  }

  /** Number of entries in the redo stack. */
  get redoLength(): number {
    return this._redoStack.length;
  }

  /** Whether there are any commands to undo. */
  get canUndo(): boolean {
    return this._entries.length > 0;
  }

  /** Whether there are any commands to redo. */
  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /** Snapshot of the current history state (for store persistence). */
  getState(): HistoryState {
    return {
      undoStack: [...this._entries],
      redoStack: [...this._redoStack],
      maxEntries: this._maxEntries,
      checkpointId: this._checkpointId,
    };
  }

  /** Clear all history. */
  clear(): void {
    this._entries = [];
    this._redoStack = [];
    this._checkpointId = null;
    this._notify("clear", null);
  }

  // ── Private Helpers ──────────────────────────────────────────────
  private _notify(type: HistoryEventType, entry: HistoryEntry | null): void {
    this.onChange?.({
      type,
      entry,
      undoDepth: this._entries.length,
      redoDepth: this._redoStack.length,
    });
  }
}
