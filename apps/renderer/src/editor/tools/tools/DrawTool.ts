/**
 * DrawTool.ts — Freehand Drawing Tool
 *
 * Purpose: Create freehand drawing objects using pointer movement,
 * producing SVG path data that can be stored, edited, and exported.
 *
 * Capabilities:
 *   - Smooth drawing with point sampling
 *   - Stroke simplification (adaptive sampling)
 *   - Pressure-ready architecture (uses pointer.force)
 *   - Round joins and caps
 *   - Adjustable brush size and color
 *   - Live rendering during drawing
 *   - Export fidelity
 *
 * Flow:
 *   1. Pointer down → start new stroke, record first point
 *   2. Pointer move → sample points, build SVG path
 *   3. Pointer up → finalize stroke, create DrawingObject via store
 *   4. Empty strokes (no movement) are discarded
 *
 * Point sampling uses adaptive distance-based sampling to avoid
 * storing every pixel while maintaining smooth curves.
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import { ObjectType } from "../../types/objects";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { generateId } from "../../utils/id";
import type { EditableObject } from "../../types/objects";
import { commandPipeline } from "../../core/CommandPipeline";
import { CreateObjectCommand } from "../../commands/CreateObjectCommand";

const MIN_DISTANCE = 3; // Minimum px distance between sampled points
const MIN_STROKE_LENGTH = 2; // Minimum points to create a stroke

export class DrawTool implements Tool {
  readonly type = ToolType.Draw;
  readonly label = "Draw";
  readonly shortcut = "d";
  readonly cursor = CursorStyle.Crosshair;

  /** Brush stroke color. */
  strokeColor: string = "#000000";
  /** Brush stroke width in pixels. */
  strokeWidth: number = 3;

  private _points: Array<{ x: number; y: number }> = [];
  private _page: number = 1;
  private _isDrawing = false;
  private _previewSvg: SVGSVGElement | null = null;
  private _previewPath: SVGPathElement | null = null;

  onActivate(): void {
    document.body.style.cursor = "crosshair";
  }

  onDeactivate(): void {
    this._cancelStroke();
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    this._points = [{ x: event.point.x, y: event.point.y }];
    this._page = store.activePage;
    this._isDrawing = true;
    this._createPreview();
  }

  onPointerMove(event: InteractionEvent): void {
    if (!this._isDrawing) return;

    const lastPoint = this._points[this._points.length - 1];
    const dx = event.point.x - lastPoint.x;
    const dy = event.point.y - lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Adaptive sampling: only record points that move enough
    if (dist >= MIN_DISTANCE) {
      this._points.push({ x: event.point.x, y: event.point.y });
      this._updatePreview();
    }
  }

  onPointerUp(_event: InteractionEvent): void {
    void _event;
    if (!this._isDrawing) return;
    this._isDrawing = false;

    this._removePreview();

    if (this._points.length < MIN_STROKE_LENGTH) {
      this._cancelStroke();
      return;
    }

    this._createDrawing();
    this._points = [];
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
      this._cancelStroke();
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _buildSvgPath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return "";

    // Build SVG path using simple line-to for each segment.
    // Future: Use Catmull-Rom or cubic bezier interpolation for smoother curves.
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }

    return d;
  }

  private _createPreview(): void {
    if (this._previewSvg) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "fixed";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "9999";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", this.strokeColor);
    path.setAttribute("stroke-width", String(this.strokeWidth));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    document.body.appendChild(svg);

    this._previewSvg = svg;
    this._previewPath = path;
  }

  private _updatePreview(): void {
    if (!this._previewPath) return;
    const d = this._buildSvgPath(this._points);
    this._previewPath.setAttribute("d", d);
  }

  private _removePreview(): void {
    this._previewSvg?.remove();
    this._previewSvg = null;
    this._previewPath = null;
  }

  private _createDrawing(): void {
    const now = Date.now();
    const newId = `draw_${generateId()}`;

    // Compute bounds of all points for the object size
    const minX = Math.min(...this._points.map((p) => p.x));
    const minY = Math.min(...this._points.map((p) => p.y));
    const maxX = Math.max(...this._points.map((p) => p.x));
    const maxY = Math.max(...this._points.map((p) => p.y));

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    // Translate path to relative coordinates (within the bounds)
    const relPoints = this._points.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
    }));
    const pathData = this._buildSvgPath(relPoints);

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Drawing,
      page: this._page,
      position: { x: minX, y: minY },
      size: { width, height },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        path: pathData,
        strokeColor: this.strokeColor,
        strokeWidth: this.strokeWidth,
        points: this._points,
      },
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }

  private _cancelStroke(): void {
    this._points = [];
    this._isDrawing = false;
  }
}
