/**
 * EraseTool.ts — Erase Tool
 *
 * Purpose: Delete overlay objects by clicking on them.
 * Provides hover feedback so the user knows which object
 * will be deleted before clicking.
 *
 * Capabilities:
 *   - Click an object to delete it
 *   - Hover over objects to highlight them
 *   - Respects locked objects (cannot be deleted)
 *   - Undo support via DeleteObjectCommand
 *
 * Flow:
 *   1. User hovers over object → highlight it
 *   2. User clicks highlighted object → delete it
 *   3. Object is removed from store and renderer
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import type { EditableObject } from "../../types/objects";
import { commandPipeline } from "../../core/CommandPipeline";
import { DeleteObjectCommand } from "../../commands/DeleteObjectCommand";
import { generateId } from "../../utils/id";

export class EraseTool implements Tool {
  readonly type = ToolType.Erase;
  readonly label = "Erase";
  readonly shortcut = "e";
  readonly cursor = CursorStyle.NotAllowed;

  private _hoveredId: string | null = null;
  private _originalOutline: string = "";

  onActivate(): void {
    document.body.style.cursor = "not-allowed";
  }

  onDeactivate(): void {
    this._clearHover();
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    const hitObject = this._hitTest(event.point, store.overlayObjects);

    if (hitObject && !hitObject.locked) {
      const cmd = new DeleteObjectCommand(`cmd_${generateId()}`, [hitObject.id]);
      commandPipeline.execute(cmd);
      this._clearHover();
    }
  }

  onPointerMove(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    const hitObject = this._hitTest(event.point, store.overlayObjects);

    if (hitObject && hitObject.id !== this._hoveredId) {
      this._clearHover();
      this._hoveredId = hitObject.id;
      // Highlight the object by adding a delete indicator
      this._originalOutline = hitObject.selected ? "2px solid #4a9eff" : "";
      // We can't directly modify DOM from the tool, but we can set hover state
      store.setHoveredObjectId(hitObject.id);
    } else if (!hitObject && this._hoveredId) {
      this._clearHover();
    }
  }

  onPointerUp(_event: InteractionEvent): void {
    // No-op
  }

  onDoubleClick(_event: InteractionEvent): void {
    // No-op
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this._clearHover();
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _hitTest(
    point: { x: number; y: number },
    objects: EditableObject[],
  ): EditableObject | null {
    // Test in reverse order (top-most first for z-order)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (!obj.visible) continue;
      if (
        point.x >= obj.position.x &&
        point.x <= obj.position.x + obj.size.width &&
        point.y >= obj.position.y &&
        point.y <= obj.position.y + obj.size.height
      ) {
        return obj;
      }
    }
    return null;
  }

  private _clearHover(): void {
    if (this._hoveredId) {
      const store = useEditorStore.getState();
      store.setHoveredObjectId(null);
      this._hoveredId = null;
    }
  }
}
