/**
 * DeleteObjectCommand.ts — Delete Object Command
 *
 * Purpose: Encapsulate deleting one or more objects as an undoable
 * command. Stores the deleted objects so undo() can restore them.
 */

import { BaseCommand } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { EditableObject } from "../types/objects";
import { useEditorStore } from "../state/editorStore";

export class DeleteObjectCommand extends BaseCommand {
  private _deletedObjects: EditableObject[] = [];

  constructor(
    id: string,
    private _objectIds: string[],
  ) {
    super(id, CT.DeleteObject as CommandType, "Delete Object");
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();

    // Capture the objects before deletion
    this._deletedObjects = store.overlayObjects.filter((o) =>
      this._objectIds.includes(o.id),
    );

    for (const id of this._objectIds) {
      store.removeOverlayObject(id);
    }
    store.clearSelection();

    return {
      created: [],
      deleted: [...this._objectIds],
      updated: [],
      selectionChanged: [],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    const store = useEditorStore.getState();

    for (const obj of this._deletedObjects) {
      store.addOverlayObject(obj);
    }
    store.setSelectedIds(this._objectIds);
    store.setActiveId(this._objectIds[0] ?? null);

    return {
      created: [...this._objectIds],
      deleted: [],
      updated: [],
      selectionChanged: this._objectIds,
      needsRender: true,
    };
  }
}
