/**
 * CommandManager.ts — Command Manager
 *
 * Purpose: Execute commands and notify the HistoryManager.
 * Acts as the bridge between tool-produced commands and the
 * undo/redo infrastructure.
 *
 * Responsibilities:
 *   - Accept a Command from a tool or programmatic invocation.
 *   - Call command.execute() and pass the result back.
 *   - Forward the executed command to the HistoryManager.
 *   - (Future) Support command pre/post hooks for validation.
 */

import type { Command, CommandResult } from "../types/commands";

// ── Command Manager ────────────────────────────────────────────────
export class CommandManager {
  private _onExecute: ((command: Command, result: CommandResult) => void) | null = null;

  /**
   * Register a callback that fires after every command execution.
   * The HistoryManager will use this to capture commands for undo.
   */
  set onExecute(callback: ((command: Command, result: CommandResult) => void) | null) {
    this._onExecute = callback;
  }

  /**
   * Execute a command.
   * Returns the CommandResult so the caller can react to changes.
   */
  execute(command: Command): CommandResult {
    const result = command.execute();
    this._onExecute?.(command, result);
    return result;
  }

  /**
   * Undo a previously executed command.
   * Returns the CommandResult from the undo operation.
   */
  undo(command: Command): CommandResult {
    const result = command.undo();
    return result;
  }

  /**
   * Redo a previously undone command.
   * Returns the CommandResult from the redo operation.
   */
  redo(command: Command): CommandResult {
    const result = command.execute();
    return result;
  }
}
