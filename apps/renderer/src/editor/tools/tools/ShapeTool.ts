/**
 * ShapeTool.ts — Shape Tool
 *
 * Purpose: Create vector shapes (rectangle, rounded rect, ellipse,
 * circle, line, arrow, polygon) on the document.
 *
 * Capabilities:
 *   - Select shape type via tool state
 *   - Drag to define shape bounding box
 *   - Shift held during drag constrains to square/circle
 *   - Live preview while dragging
 *   - Fill, stroke, stroke width configurable via data
 *   - Undo/Redo via CreateObjectCommand
 *
 * Flow:
 *   1. User sets shape type (default: rectangle)
 *   2. Mouse down → capture origin
 *   3. Mouse move → preview shape dimensions
 *   4. Mouse up → create ShapeObject via store
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import { ObjectType } from "../../types/objects";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { generateId } from "../../utils/id";
import type { EditableObject } from "../../types/objects";
import { DEFAULT_STROKE_WIDTH, DEFAULT_FILL_COLOR, DEFAULT_STROKE_COLOR } from "../../core/constants";
import { commandPipeline } from "../../core/CommandPipeline";
import { CreateObjectCommand } from "../../commands/CreateObjectCommand";

const MIN_SHAPE_SIZE = 5;

export type ShapeVariant = "rectangle" | "ellipse" | "circle" | "line" | "arrow" | "triangle" | "polygon";

export class ShapeTool implements Tool {
  readonly type = ToolType.Shape;
  readonly label = "Shape";
  readonly shortcut = "r";
  readonly cursor = CursorStyle.Crosshair;

  /** Current shape variant to create. Can be changed externally. */
  shapeVariant: ShapeVariant = "rectangle";
  /** Fill color for the shape. */
  fillColor: string = DEFAULT_FILL_COLOR;
  /** Stroke color for the shape. */
  strokeColor: string = DEFAULT_STROKE_COLOR;
  /** Stroke width in pixels. */
  strokeWidth: number = DEFAULT_STROKE_WIDTH;
  /** Corner radius for rounded rectangles. */
  cornerRadius: number = 0;

  private _dragStart: { x: number; y: number } | null = null;
  private _dragCurrent: { x: number; y: number } | null = null;
  private _page: number = 1;
  private _previewEl: HTMLElement | null = null;

  onActivate(): void {
    document.body.style.cursor = "crosshair";
  }

  onDeactivate(): void {
    this._removePreview();
    this._cancelDrag();
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    this._dragStart = { x: event.point.x, y: event.point.y };
    this._dragCurrent = { x: event.point.x, y: event.point.y };
    this._page = store.activePage;
  }

  onPointerMove(event: InteractionEvent): void {
    if (!this._dragStart) return;
    this._dragCurrent = { x: event.point.x, y: event.point.y };
    this._showPreview(event.modifiers.shift);
  }

  onPointerUp(event: InteractionEvent): void {
    if (!this._dragStart) return;

    this._removePreview();

    const start = this._dragStart;
    const current = this._dragCurrent ?? start;
    const shiftHeld = event.modifiers.shift;

    const rect = this._computeRect(start, current, shiftHeld);
    if (rect.width < MIN_SHAPE_SIZE || rect.height < MIN_SHAPE_SIZE) {
      this._cancelDrag();
      return;
    }

    this._createShape(rect, shiftHeld);
    this._cancelDrag();
  }

  onDoubleClick(_event: InteractionEvent): void {
    // No-op
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this._removePreview();
      this._cancelDrag();
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _computeRect(
    start: { x: number; y: number },
    current: { x: number; y: number },
    constrainSquare: boolean,
  ): { x: number; y: number; width: number; height: number } {
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);

    if (constrainSquare) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    return { x, y, width, height };
  }

  private _showPreview(shiftHeld: boolean): void {
    this._removePreview();

    if (!this._dragStart || !this._dragCurrent) return;

    const rect = this._computeRect(this._dragStart, this._dragCurrent, shiftHeld);

    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.left = `${rect.x}px`;
    preview.style.top = `${rect.y}px`;
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    preview.style.border = `2px dashed ${this.strokeColor}`;
    preview.style.backgroundColor = this.fillColor !== "transparent" ? this.fillColor : "transparent";
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "9999";
    preview.style.borderRadius = `${this.cornerRadius}px`;

    if (this.shapeVariant === "ellipse" || this.shapeVariant === "circle") {
      preview.style.borderRadius = "50%";
    }

    this._previewEl = preview;
    document.body.appendChild(preview);
  }

  private _removePreview(): void {
    if (this._previewEl) {
      this._previewEl.remove();
      this._previewEl = null;
    }
  }

  private _createShape(
    rect: { x: number; y: number; width: number; height: number },
    shiftHeld: boolean,
  ): void {
    const now = Date.now();
    const newId = `shape_${generateId()}`;

    // For circle, force ellipse with equal dimensions
    const shapeType = this.shapeVariant === "circle" ? "ellipse" : this.shapeVariant;
    const isCircle = this.shapeVariant === "circle" || (this.shapeVariant === "ellipse" && shiftHeld);

    const size = isCircle
      ? { width: Math.max(rect.width, rect.height), height: Math.max(rect.width, rect.height) }
      : { width: rect.width, height: rect.height };

    // For triangle, compute 3 points from the bounding rect
    let shapeData: Record<string, unknown> = {
      shapeType,
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      cornerRadius: shapeType === "rectangle" ? this.cornerRadius : 0,
    };

    if (shapeType === "triangle") {
      // Create an isosceles triangle within the bounding rect
      shapeData.shapeType = "polygon";
      shapeData.points = [
        { x: size.width / 2, y: 0 },
        { x: size.width, y: size.height },
        { x: 0, y: size.height },
      ];
    }

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Shape,
      page: this._page,
      position: { x: rect.x, y: rect.y },
      size,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: shapeData,
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }

  private _cancelDrag(): void {
    this._dragStart = null;
    this._dragCurrent = null;
  }
}
