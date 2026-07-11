/**
 * MoveObjectCommand.ts — Move Object Command
 *
 * Purpose: Encapsulate moving an object as an undoable command.
 * Supports merging for continuous drag operations so that each
 * frame of a drag doesn't create a separate history entry.
 */

import { BaseCommand } from "./base";
import type { Command, CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { Point } from "../types/editor";
import { useEditorStore } from "../state/editorStore";

export class MoveObjectCommand extends BaseCommand {
  private _originalPosition: Point;
  private _newPosition: Point;

  constructor(
    id: string,
    private _objectId: string,
    originalPosition: Point,
    newPosition: Point,
  ) {
    super(id, CT.MoveObject as CommandType, "Move Object");
    this._originalPosition = { ...originalPosition };
    this._newPosition = { ...newPosition };
    this.canMerge = true;
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    store.updateOverlayObject(this._objectId, {
      position: { ...this._newPosition },
    });

    return {
      created: [],
      deleted: [],
      updated: [this._objectId],
      selectionChanged: [],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    const store = useEditorStore.getState();
    store.updateOverlayObject(this._objectId, {
      position: { ...this._originalPosition },
    });

    return {
      created: [],
      deleted: [],
      updated: [this._objectId],
      selectionChanged: [],
      needsRender: true,
    };
  }

  /** Merge this move into the previous move (for continuous drag). */
  merge(previous: Command): void {
    if (previous instanceof MoveObjectCommand) {
      this._originalPosition = { ...previous._originalPosition };
    }
  }
}
