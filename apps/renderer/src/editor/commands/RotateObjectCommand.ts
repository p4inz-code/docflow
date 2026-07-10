/**
 * RotateObjectCommand.ts — Rotate Object Command
 *
 * Purpose: Encapsulate rotating an object as an undoable command.
 */

import { BaseCommand, noopResult } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import { useEditorStore } from "../state/editorStore";

export class RotateObjectCommand extends BaseCommand {
  private _originalRotation: number;
  private _newRotation: number;

  constructor(
    id: string,
    private _objectId: string,
    originalRotation: number,
    newRotation: number,
  ) {
    super(id, CT.RotateObject as CommandType, "Rotate Object");
    this._originalRotation = originalRotation;
    this._newRotation = newRotation;
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    store.updateOverlayObject(this._objectId, {
      rotation: this._newRotation,
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
      rotation: this._originalRotation,
    });

    return {
      created: [],
      deleted: [],
      updated: [this._objectId],
      selectionChanged: [],
      needsRender: true,
    };
  }
}
