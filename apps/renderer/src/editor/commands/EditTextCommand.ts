/**
 * EditTextCommand.ts — Edit Text Content Command
 *
 * Purpose: Encapsulate changing a text object's content as an
 * undoable command.
 */

import { BaseCommand, noopResult } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import { useEditorStore } from "../state/editorStore";

export class EditTextCommand extends BaseCommand {
  private _originalContent: string;
  private _newContent: string;

  constructor(
    id: string,
    private _objectId: string,
    originalContent: string,
    newContent: string,
  ) {
    super(id, CT.EditText as CommandType, "Edit Text");
    this._originalContent = originalContent;
    this._newContent = newContent;
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    const obj = store.overlayObjects.find((o) => o.id === this._objectId);
    if (!obj) return noopResult();

    store.updateOverlayObject(this._objectId, {
      data: { ...obj.data, content: this._newContent },
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
    const obj = store.overlayObjects.find((o) => o.id === this._objectId);
    if (!obj) return noopResult();

    store.updateOverlayObject(this._objectId, {
      data: { ...obj.data, content: this._originalContent },
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
