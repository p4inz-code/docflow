/**
 * ZOrderCommand.ts — Z-Order Commands
 *
 * Purpose: Encapsulate changing the z-order (stacking position)
 * of overlay objects as undoable commands.
 *
 * Supports:
 *   - Bring Forward (increase z-index by 1)
 *   - Send Backward (decrease z-index by 1)
 *   - Bring To Front (move to highest z-index)
 *   - Send To Back (move to lowest z-index)
 *
 * Z-order is tracked via the createdAt timestamp (objects drawn later
 * appear on top). This command manipulates the overlayObjects array
 * ordering to achieve the desired stacking.
 */

import { BaseCommand } from "./base";
import type { CommandResult, CommandType } from "../types/commands";
import { CommandType as CT } from "../types/commands";
import { useEditorStore } from "../state/editorStore";

export type ZOrderDirection = "forward" | "backward" | "front" | "back";

export class ZOrderCommand extends BaseCommand {
  private _originalTimestamps: Map<string, number> = new Map();

  constructor(
    id: string,
    private _objectIds: string[],
    private _direction: ZOrderDirection,
  ) {
    const labels: Record<ZOrderDirection, string> = {
      forward: "Bring Forward",
      backward: "Send Backward",
      front: "Bring to Front",
      back: "Send to Back",
    };
    super(id, CT.MoveObject as CommandType, labels[_direction]);
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    this._originalTimestamps.clear();

    // Capture original timestamps for undo
    for (const id of this._objectIds) {
      const obj = store.overlayObjects.find((o) => o.id === id);
      if (obj) {
        this._originalTimestamps.set(id, obj.createdAt);
      }
    }

    const allObjects = [...store.overlayObjects];
    const now = Date.now();

    switch (this._direction) {
      case "forward": {
        // Increase createdAt for selected objects
        for (const id of this._objectIds) {
          const obj = allObjects.find((o) => o.id === id);
          if (obj) {
            obj.createdAt = now + 1;
          }
        }
        break;
      }
      case "backward": {
        // Decrease createdAt for selected objects
        for (const id of this._objectIds) {
          const obj = allObjects.find((o) => o.id === id);
          if (obj) {
            obj.createdAt = Math.max(0, obj.createdAt - 1);
          }
        }
        break;
      }
      case "front": {
        // Move selected objects to the highest createdAt
        const maxTime = Math.max(...allObjects.map((o) => o.createdAt), 0);
        for (let i = 0; i < this._objectIds.length; i++) {
          const obj = allObjects.find((o) => o.id === this._objectIds[i]);
          if (obj) {
            obj.createdAt = maxTime + i + 1;
          }
        }
        break;
      }
      case "back": {
        // Move selected objects to the lowest createdAt
        const minTime = Math.min(...allObjects.map((o) => o.createdAt), 0);
        for (let i = 0; i < this._objectIds.length; i++) {
          const obj = allObjects.find((o) => o.id === this._objectIds[i]);
          if (obj) {
            obj.createdAt = Math.max(0, minTime - this._objectIds.length + i);
          }
        }
        break;
      }
    }

    // Replace overlay objects array to trigger re-sort
    store.setOverlayObjects(allObjects);

    return {
      created: [],
      deleted: [],
      updated: this._objectIds,
      selectionChanged: [],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    const store = useEditorStore.getState();
    const allObjects = [...store.overlayObjects];

    for (const id of this._objectIds) {
      const origTime = this._originalTimestamps.get(id);
      if (origTime !== undefined) {
        const obj = allObjects.find((o) => o.id === id);
        if (obj) {
          obj.createdAt = origTime;
        }
      }
    }

    store.setOverlayObjects(allObjects);

    return {
      created: [],
      deleted: [],
      updated: this._objectIds,
      selectionChanged: [],
      needsRender: true,
    };
  }
}
