/**
 * DuplicateCommand.ts — Duplicate Objects Command
 *
 * Purpose: Encapsulate duplicating selected objects as an undoable
 * command. Stores the duplicated object IDs so undo() can remove them.
 */

import { BaseCommand } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { EditableObject } from "../types/objects";
import { useEditorStore } from "../state/editorStore";
import { generateId } from "../utils/id";

export class DuplicateCommand extends BaseCommand {
  private _newIds: string[] = [];

  constructor(
    id: string,
    private _sourceIds: string[],
    private _offsetX: number = 20,
    private _offsetY: number = 20,
  ) {
    super(id, CT.Duplicate as CommandType, "Duplicate");
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    this._newIds = [];
    const now = Date.now();

    for (const sourceId of this._sourceIds) {
      const source = store.overlayObjects.find((o) => o.id === sourceId);
      if (!source) continue;

      const newId = `obj_${generateId()}`;
      const duplicate: EditableObject = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        position: {
          x: source.position.x + this._offsetX,
          y: source.position.y + this._offsetY,
        },
        selected: true,
        createdAt: now,
        updatedAt: now,
      };

      store.addOverlayObject(duplicate);
      this._newIds.push(newId);
    }

    store.setSelectedIds(this._newIds);
    store.setActiveId(this._newIds[0] ?? null);

    return {
      created: [...this._newIds],
      deleted: [],
      updated: [],
      selectionChanged: this._newIds,
      needsRender: true,
    };
  }

  undo(): CommandResult {
    const store = useEditorStore.getState();

    for (const id of this._newIds) {
      store.removeOverlayObject(id);
    }
    store.setSelectedIds(this._sourceIds);

    return {
      created: [],
      deleted: [...this._newIds],
      updated: [],
      selectionChanged: this._sourceIds,
      needsRender: true,
    };
  }
}
