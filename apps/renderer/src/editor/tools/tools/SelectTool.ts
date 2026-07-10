/**
 * SelectTool.ts — Select Tool (Full Implementation)
 *
 * Purpose: Select, move, resize, and rotate overlay objects with
 * live visual feedback and smart guide integration.
 *
 * Capabilities:
 *   - Single click to select
 *   - Click + drag to marquee-select
 *   - Drag selected object to move it
 *   - Handle drag to resize / rotate
 *   - Shift-held for multi-select and aspect-ratio lock
 *   - Smart guides during move/resize
 *   - Keyboard nudge support
 */

import type { Tool } from "../../types/tools";
import type { Command } from "../../types/commands";
import { ToolType } from "../../types/tools";
import { CursorStyle, InteractionPhase } from "../../types/editor";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { transformSystem } from "../../editing/TransformSystem";
import { smartGuides } from "../../editing/SmartGuides";
import type { RenderingManager } from "../../rendering/RenderingManager";
import { HANDLE_SIZE } from "../../core/constants";
import type { EditableObject } from "../../types/objects";
import type { HandleDirection } from "../../types/editor";
import { commandPipeline } from "../../core/CommandPipeline";
import { MoveObjectCommand } from "../../commands/MoveObjectCommand";
import { ResizeObjectCommand } from "../../commands/ResizeObjectCommand";
import { RotateObjectCommand } from "../../commands/RotateObjectCommand";
import { DeleteObjectCommand } from "../../commands/DeleteObjectCommand";
import { generateId } from "../../utils/id";

// ── Drag State ─────────────────────────────────────────────────────
interface DragState {
  type: "move" | "resize" | "rotate" | "marquee" | "none";
  objectId: string | null;
  origin: { x: number; y: number };
  originalPosition: { x: number; y: number };
  originalSize: { width: number; height: number };
  originalRotation: number;
  handle: string | null;
  dragged: boolean;
}

export class SelectTool implements Tool {
  readonly type = ToolType.Select;
  readonly label = "Select";
  readonly shortcut = "v";
  readonly cursor = CursorStyle.Default;

  private _renderingManager: RenderingManager | null = null;
  private _drag: DragState = {
    type: "none",
    objectId: null,
    origin: { x: 0, y: 0 },
    originalPosition: { x: 0, y: 0 },
    originalSize: { width: 0, height: 0 },
    originalRotation: 0,
    handle: null,
    dragged: false,
  };
  private _guideContainer: HTMLElement | null = null;
  private _pendingCommand: Command | null = null;

  setRenderingManager(manager: RenderingManager): void {
    this._renderingManager = manager;
  }

  /** Set the element where smart guides will be rendered. */
  setGuideContainer(container: HTMLElement): void {
    this._guideContainer = container;
  }

  onActivate(): void {
    // Restore cursor
    document.body.style.cursor = "";
  }

  onDeactivate(): void {
    this._cancelDrag();
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    const point = event.point;
    const shiftHeld = event.modifiers.shift;

    // Check if we hit a resize/rotation handle of the active selection
    const activeId = store.activeId;
    if (activeId) {
      const activeObj = store.overlayObjects.find((o) => o.id === activeId);
      if (activeObj) {
        const handle = this._hitTestHandle(point, activeObj);
        if (handle) {
          this._startResize(activeId, activeObj, handle, point);
          return;
        }
        if (this._hitTestRotationHandle(point, activeObj)) {
          this._startRotate(activeId, activeObj, point);
          return;
        }
      }
    }

    // Check if we clicked on an object
    const hitObject = store.overlayObjects.find((o) => {
      if (!o.visible || o.locked) return false;
      return (
        point.x >= o.position.x &&
        point.x <= o.position.x + o.size.width &&
        point.y >= o.position.y &&
        point.y <= o.position.y + o.size.height
      );
    });

    if (hitObject) {
      if (shiftHeld) {
        // Toggle selection
        if (store.selectedIds.includes(hitObject.id)) {
          store.removeFromSelection(hitObject.id);
        } else {
          store.addToSelection(hitObject.id);
        }
      } else if (!store.selectedIds.includes(hitObject.id)) {
        store.setSelectedIds([hitObject.id]);
        store.setActiveId(hitObject.id);
      }

      // Start move
      this._startMove(hitObject.id, {
        x: hitObject.position.x,
        y: hitObject.position.y,
      }, point);
    } else {
      if (!shiftHeld) {
        store.clearSelection();
      }
      // Start marquee
      this._drag = {
        type: "marquee",
        objectId: null,
        origin: { ...point },
        originalPosition: { x: 0, y: 0 },
        originalSize: { width: 0, height: 0 },
        originalRotation: 0,
        handle: null,
        dragged: false,
      };
    }
  }

  onPointerMove(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    const point = event.point;

    // Update hover state
    this._updateHover(point, store.overlayObjects);

    if (this._drag.type === "none") return;

    const delta = {
      x: point.x - this._drag.origin.x,
      y: point.y - this._drag.origin.y,
    };

    this._drag.dragged = true;

    switch (this._drag.type) {
      case "move": {
        if (!this._drag.objectId) break;
        const obj = store.overlayObjects.find(
          (o) => o.id === this._drag.objectId,
        );
        if (!obj || obj.locked) break;

        const pageWidth = 612; // Default US Letter width in points
        const pageHeight = 792;

        const newPos = transformSystem.computeMove(
          this._drag.originalPosition,
          delta,
          event.modifiers.shift,
          pageWidth,
          pageHeight,
        );

        // Live preview: update store directly for smooth dragging
        store.updateOverlayObject(this._drag.objectId, {
          position: newPos,
        });

        // Build a MoveObjectCommand for undo on pointer up
        this._pendingCommand = new MoveObjectCommand(
          `cmd_${generateId()}`,
          this._drag.objectId,
          this._drag.originalPosition,
          newPos,
        );

        // Render smart guides
        if (this._guideContainer) {
          const objRect = {
            x: newPos.x,
            y: newPos.y,
            width: obj.size.width,
            height: obj.size.height,
          };
          const otherRects = store.overlayObjects
            .filter((o) => o.id !== this._drag.objectId && o.visible)
            .map((o) => ({
              x: o.position.x,
              y: o.position.y,
              width: o.size.width,
              height: o.size.height,
            }));
          const guideState = smartGuides.computeGuides(
            objRect,
            otherRects,
            pageWidth,
            pageHeight,
          );
          if (guideState.snapping) {
            store.updateOverlayObject(this._drag.objectId, {
              position: {
                x: newPos.x + guideState.snapOffset.x,
                y: newPos.y + guideState.snapOffset.y,
              },
            });
          }
          smartGuides.renderGuides(
            guideState.lines,
            this._guideContainer,
            pageWidth,
            pageHeight,
          );
        }
        break;
      }

      case "resize": {
        if (!this._drag.objectId || !this._drag.handle) break;
        const obj = store.overlayObjects.find(
          (o) => o.id === this._drag.objectId,
        );
        if (!obj) break;

        const shiftHeld = event.modifiers.shift;
        const aspectRatio =
          obj.size.width / (obj.size.height || 1);

        const result = transformSystem.computeResize(
          this._drag.handle as HandleDirection,
          this._drag.originalPosition,
          this._drag.originalSize,
          delta,
          shiftHeld,
          aspectRatio,
        );

        // Live preview: update store directly for smooth dragging
        store.updateOverlayObject(this._drag.objectId, {
          position: result.position,
          size: result.size,
        });

        // Build a ResizeObjectCommand for undo on pointer up
        this._pendingCommand = new ResizeObjectCommand(
          `cmd_${generateId()}`,
          this._drag.objectId,
          this._drag.originalPosition,
          this._drag.originalSize,
          result.position,
          result.size,
        );
        break;
      }

      case "rotate": {
        if (!this._drag.objectId) break;
        const obj = store.overlayObjects.find(
          (o) => o.id === this._drag.objectId,
        );
        if (!obj) break;

        const center = {
          x: obj.position.x + obj.size.width / 2,
          y: obj.position.y + obj.size.height / 2,
        };
        const rotation = transformSystem.computeRotation(center, point);

        // Live preview: update store directly for smooth dragging
        store.updateOverlayObject(this._drag.objectId, { rotation });

        // Build a RotateObjectCommand for undo on pointer up
        this._pendingCommand = new RotateObjectCommand(
          `cmd_${generateId()}`,
          this._drag.objectId,
          this._drag.originalRotation,
          rotation,
        );
        break;
      }

      case "marquee": {
        // Future: render marquee rectangle in selection layer
        store.setMarquee({
          origin: this._drag.origin,
          current: point,
        });
        break;
      }
    }
  }

  onPointerUp(_event: InteractionEvent): void {
    const store = useEditorStore.getState();

    // Clear smart guides
    if (this._guideContainer) {
      smartGuides.clearGuides(this._guideContainer);
    }

    // Execute pending command for undo support
    if (this._pendingCommand && this._drag.dragged) {
      commandPipeline.execute(this._pendingCommand);
    }
    this._pendingCommand = null;

    // Complete the drag
    store.setInteractionPhase("idle");
    this._drag.type = "none";
    this._drag.objectId = null;
  }

  onDoubleClick(event: InteractionEvent): void {
    // Double-click on a text object should start inline editing
    const store = useEditorStore.getState();
    const hitObject = store.overlayObjects.find((o) => {
      if (!o.visible || o.locked) return false;
      return (
        event.point.x >= o.position.x &&
        event.point.x <= o.position.x + o.size.width &&
        event.point.y >= o.position.y &&
        event.point.y <= o.position.y + o.size.height
      );
    });

    if (hitObject && hitObject.type === "text") {
      store.setSelectedIds([hitObject.id]);
      store.setActiveId(hitObject.id);
      // Inline editor will be triggered via the store subscription
    }
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    const store = useEditorStore.getState();
    if (store.selectedIds.length === 0) return;

    const step = event.shiftKey ? 10 : 1;

    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        event.preventDefault();
        this._nudgeSelection(event.key, step);
        break;

      case "Delete":
      case "Backspace":
        event.preventDefault();
        this._deleteSelection();
        break;
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _startMove(
    objectId: string,
    position: { x: number; y: number },
    point: { x: number; y: number },
  ): void {
    this._drag = {
      type: "move",
      objectId,
      origin: { ...point },
      originalPosition: { ...position },
      originalSize: { width: 0, height: 0 },
      originalRotation: 0,
      handle: null,
      dragged: false,
    };
  }

  private _startResize(
    objectId: string,
    obj: EditableObject,
    handle: string,
    point: { x: number; y: number },
  ): void {
    this._drag = {
      type: "resize",
      objectId,
      origin: { ...point },
      originalPosition: { ...obj.position },
      originalSize: { ...obj.size },
      originalRotation: obj.rotation,
      handle,
      dragged: false,
    };
  }

  private _startRotate(
    objectId: string,
    obj: EditableObject,
    point: { x: number; y: number },
  ): void {
    this._drag = {
      type: "rotate",
      objectId,
      origin: { ...point },
      originalPosition: { ...obj.position },
      originalSize: { ...obj.size },
      originalRotation: obj.rotation,
      handle: "rotate",
      dragged: false,
    };
  }

  private _cancelDrag(): void {
    this._drag.type = "none";
    this._drag.objectId = null;
    this._pendingCommand = null;
    if (this._guideContainer) {
      smartGuides.clearGuides(this._guideContainer);
    }
  }

  private _hitTestHandle(
    point: { x: number; y: number },
    obj: EditableObject,
  ): string | null {
    const handles = [
      { x: obj.position.x, y: obj.position.y, id: "top-left" },
      { x: obj.position.x + obj.size.width / 2, y: obj.position.y, id: "top" },
      { x: obj.position.x + obj.size.width, y: obj.position.y, id: "top-right" },
      { x: obj.position.x + obj.size.width, y: obj.position.y + obj.size.height / 2, id: "right" },
      { x: obj.position.x + obj.size.width, y: obj.position.y + obj.size.height, id: "bottom-right" },
      { x: obj.position.x + obj.size.width / 2, y: obj.position.y + obj.size.height, id: "bottom" },
      { x: obj.position.x, y: obj.position.y + obj.size.height, id: "bottom-left" },
      { x: obj.position.x, y: obj.position.y + obj.size.height / 2, id: "left" },
    ];

    const tolerance = HANDLE_SIZE + 4;
    for (const handle of handles) {
      if (
        Math.abs(point.x - handle.x) < tolerance &&
        Math.abs(point.y - handle.y) < tolerance
      ) {
        return handle.id;
      }
    }
    return null;
  }

  private _hitTestRotationHandle(
    point: { x: number; y: number },
    obj: EditableObject,
  ): boolean {
    const rotX = obj.position.x + obj.size.width / 2;
    const rotY = obj.position.y - 20;
    const tolerance = HANDLE_SIZE + 4;
    return (
      Math.abs(point.x - rotX) < tolerance &&
      Math.abs(point.y - rotY) < tolerance
    );
  }

  private _updateHover(
    point: { x: number; y: number },
    objects: EditableObject[],
  ): void {
    const store = useEditorStore.getState();
    const hovered = objects.find((o) => {
      if (!o.visible) return false;
      return (
        point.x >= o.position.x &&
        point.x <= o.position.x + o.size.width &&
        point.y >= o.position.y &&
        point.y <= o.position.y + o.size.height
      );
    });
    store.setHoveredObjectId(hovered?.id ?? null);
  }

  private _nudgeSelection(key: string, step: number): void {
    const store = useEditorStore.getState();
    for (const id of store.selectedIds) {
      const obj = store.overlayObjects.find((o) => o.id === id);
      if (!obj || obj.locked) continue;
      let dx = 0, dy = 0;
      switch (key) {
        case "ArrowUp": dy = -step; break;
        case "ArrowDown": dy = step; break;
        case "ArrowLeft": dx = -step; break;
        case "ArrowRight": dx = step; break;
      }
      const newPos = {
        x: obj.position.x + dx,
        y: obj.position.y + dy,
      };
      const cmd = new MoveObjectCommand(`cmd_${generateId()}`, id, obj.position, newPos);
      commandPipeline.execute(cmd);
    }
  }

  private _deleteSelection(): void {
    const store = useEditorStore.getState();
    const ids = [...store.selectedIds];
    if (ids.length === 0) return;
    const cmd = new DeleteObjectCommand(`cmd_${generateId()}`, ids);
    commandPipeline.execute(cmd);
  }
}
