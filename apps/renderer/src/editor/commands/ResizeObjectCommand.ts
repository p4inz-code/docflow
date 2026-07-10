/**
 * ResizeObjectCommand.ts — Resize Object Command
 *
 * Purpose: Encapsulate resizing an object as an undoable command.
 */

import { BaseCommand, noopResult } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { Point } from "../types/editor";
import { useEditorStore } from "../state/editorStore";

export class ResizeObjectCommand extends BaseCommand {
  private _originalPosition: Point;
  private _originalSize: { width: number; height: number };
  private _newPosition: Point;
  private _newSize: { width: number; height: number };

  constructor(
    id: string,
    private _objectId: string,
    originalPosition: Point,
    originalSize: { width: number; height: number },
    newPosition: Point,
    newSize: { width: number; height: number },
  ) {
    super(id, CT.ResizeObject as CommandType, "Resize Object");
    this._originalPosition = { ...originalPosition };
    this._originalSize = { ...originalSize };
    this._newPosition = { ...newPosition };
    this._newSize = { ...newSize };
    this.canMerge = true;
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    store.updateOverlayObject(this._objectId, {
      position: { ...this._newPosition },
      size: { ...this._newSize },
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
      size: { ...this._originalSize },
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
