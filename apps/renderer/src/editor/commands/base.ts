/**
 * base.ts — Base Command Interface
 *
 * Purpose: Provide the abstract base class and helper utilities
 * for implementing the Command interface.
 *
 * Every concrete command (CreateObject, MoveObject, etc.) will
 * extend BaseCommand and implement execute() / undo().
 *
 * Usage (future):
 *
 *   class CreateObjectCommand extends BaseCommand {
 *     execute() { /* add object to overlay manager * / }
 *     undo()    { /* remove object from overlay manager * / }
 *   }
 */

import type { Command, CommandResult, CommandType } from "../types/commands";
import { emptyCommandResult } from "../types/commands";

/**
 * Abstract base command that every concrete command should extend.
 * Provides default implementations for optional merge methods.
 */
export abstract class BaseCommand implements Command {
  readonly id: string;
  readonly type: CommandType;
  readonly label: string;
  readonly timestamp: number;
  canMerge?: boolean;

  constructor(id: string, type: CommandType, label: string) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.timestamp = Date.now();
  }

  /** Execute the command and return a result describing the changes. */
  abstract execute(): CommandResult;

  /** Reverse the command and return a result describing the changes. */
  abstract undo(): CommandResult;

  /**
   * Merge this command into a previous command of the same type.
   * Override in subclasses that support merging (e.g. MoveObjectCommand).
   */
  merge(_previous: Command): void {
    // Default: no merging.
  }
}

/**
 * Utility: produce a successful CommandResult with no changes.
 * Useful as a placeholder for stubs.
 */
export function noopResult(): CommandResult {
  return { ...emptyCommandResult };
}
