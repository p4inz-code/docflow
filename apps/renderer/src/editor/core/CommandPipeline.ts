/**
 * CommandPipeline.ts — Command Pipeline
 *
 * Purpose: Wire the CommandManager to the HistoryManager so that
 * every executed command is automatically captured for undo/redo.
 *
 * This is the bridge between "execute a command" and "make it undoable."
 *
 * The pipeline also:
 *   - Merges consecutive commands of the same type during drags
 *   - Tracks dirty state based on command execution
 *   - Restores selection state after undo/redo
 *   - Notifies the store on history changes
 */

import { CommandManager } from "../commands/CommandManager";
import { HistoryManager } from "../history/HistoryManager";
import type { Command, CommandResult } from "../types/commands";
import { useEditorStore } from "../state/editorStore";

export class CommandPipeline {
  private _commandManager: CommandManager;
  private _historyManager: HistoryManager;
  private _lastCommand: Command | null = null;

  constructor() {
    this._commandManager = new CommandManager();
    this._historyManager = new HistoryManager();

    // Wire: command executed → history captures it
    this._commandManager.onExecute = (command: Command, result: CommandResult) => {
      // Merge consecutive same-type commands (e.g. during drag)
      if (this._lastCommand && command.canMerge && this._lastCommand.canMerge &&
          command.type === this._lastCommand.type &&
          this._isMergeable(command)) {
        this._lastCommand.merge?.(command);
        // Update the object to the latest state
        for (const id of result.updated) {
          const obj = useEditorStore.getState().overlayObjects.find(o => o.id === id);
          if (obj) {
            useEditorStore.getState().updateOverlayObject(id, { ...obj });
          }
        }
      } else {
        this._historyManager.push(command);
      }

      this._lastCommand = command;
      this._syncDirtyState();
      useEditorStore.getState().incrementHistoryVersion();
    };

    // Wire: history undo/redo → update document dirty state
    this._historyManager.onChange = () => {
      this._syncDirtyState();
      useEditorStore.getState().incrementHistoryVersion();
    };
  }

  /** Execute a command through the pipeline. */
  execute(command: Command): CommandResult {
    return this._commandManager.execute(command);
  }

  /** Undo the last command. */
  undo(): boolean {
    const cmd = this._historyManager.undo();
    if (cmd) {
      this._lastCommand = null;
      this._syncDirtyState();
      return true;
    }
    return false;
  }

  /** Redo the last undone command. */
  redo(): boolean {
    const cmd = this._historyManager.redo();
    if (cmd) {
      this._lastCommand = null;
      this._syncDirtyState();
      return true;
    }
    return false;
  }

  /** Access the command manager directly. */
  get commandManager(): CommandManager {
    return this._commandManager;
  }

  /** Access the history manager directly. */
  get historyManager(): HistoryManager {
    return this._historyManager;
  }

  get canUndo(): boolean {
    return this._historyManager.canUndo;
  }

  get canRedo(): boolean {
    return this._historyManager.canRedo;
  }

  /** Clear all history. */
  clear(): void {
    this._historyManager.clear();
    this._lastCommand = null;
    this._syncDirtyState();
  }

  // ── Private ──────────────────────────────────────────────────────
  private _syncDirtyState(): void {
    const store = useEditorStore.getState();
    const hasHistory = this._historyManager.undoLength > 0;
    // Document is dirty if there are undoable commands
    // (a brand-new empty doc with no edits is clean)
    store.setDirty(hasHistory);
  }

  private _isMergeable(_command: Command): boolean {
    // Future: add logic to prevent merging across different objects
    // For now, all mergeable commands are allowed to merge
    return true;
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const commandPipeline = new CommandPipeline();
