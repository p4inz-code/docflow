/**
 * EditPropertiesCommand.ts — Edit Object Properties Command
 *
 * Purpose: Encapsulate changing one or more properties on an
 * object as an undoable command. Stores the original values
 * so undo() can restore them.
 *
 * Supports any property on EditableObject plus nested data fields.
 */

import { BaseCommand, noopResult } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { EditableObject } from "../types/objects";
import { useEditorStore } from "../state/editorStore";

export class EditPropertiesCommand extends BaseCommand {
  private _originalObject: EditableObject | null = null;

  constructor(
    id: string,
    private _objectId: string,
    private _newProperties: Partial<EditableObject>,
    private _dataOverride?: Record<string, unknown>,
    label: string = "Edit Properties",
  ) {
    super(id, CT.ChangeStyle as CommandType, label);
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    const obj = store.overlayObjects.find((o) => o.id === this._objectId);
    if (!obj) return noopResult();

    // Store original for undo
    this._originalObject = { ...obj, data: { ...obj.data } };

    const changes: Partial<EditableObject> = { ...this._newProperties };

    if (this._dataOverride) {
      changes.data = { ...obj.data, ...this._dataOverride };
    }

    store.updateOverlayObject(this._objectId, changes);

    return {
      created: [],
      deleted: [],
      updated: [this._objectId],
      selectionChanged: [],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    if (!this._originalObject) return noopResult();

    const store = useEditorStore.getState();
    store.updateOverlayObject(this._objectId, {
      position: { ...this._originalObject.position },
      size: { ...this._originalObject.size },
      rotation: this._originalObject.rotation,
      opacity: this._originalObject.opacity,
      visible: this._originalObject.visible,
      locked: this._originalObject.locked,
      data: { ...this._originalObject.data },
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
