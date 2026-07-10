/**
 * CreateObjectCommand.ts — Generic Create Object Command
 *
 * Purpose: Encapsulate the creation of any overlay object type
 * (image, shape, drawing, highlight, signature, stamp) as an
 * undoable command. This avoids duplicating logic across 7
 * nearly-identical command classes.
 *
 * Usage: Pass an object factory function that returns the new
 * EditableObject. The command stores the ID so undo() can
 * remove it.
 */

import { BaseCommand, noopResult } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import type { EditableObject } from "../types/objects";
import { useEditorStore } from "../state/editorStore";

export class CreateObjectCommand extends BaseCommand {
  private _createdObject: EditableObject | null = null;

  constructor(
    id: string,
    label: string,
    private _objectFactory: () => EditableObject,
  ) {
    super(id, CT.CreateObject as CommandType, label);
  }

  execute(): CommandResult {
    this._createdObject = this._objectFactory();
    const store = useEditorStore.getState();
    store.addOverlayObject(this._createdObject);
    store.setSelectedIds([this._createdObject.id]);
    store.setActiveId(this._createdObject.id);

    return {
      created: [this._createdObject.id],
      deleted: [],
      updated: [],
      selectionChanged: [this._createdObject.id],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    if (!this._createdObject) return noopResult();

    const store = useEditorStore.getState();
    store.removeOverlayObject(this._createdObject.id);
    store.clearSelection();

    return {
      created: [],
      deleted: [this._createdObject.id],
      updated: [],
      selectionChanged: [],
      needsRender: true,
    };
  }
}
