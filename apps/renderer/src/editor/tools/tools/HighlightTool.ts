/**
 * HighlightTool.ts — Highlight Tool
 *
 * Purpose: Create highlight overlays on PDF content by dragging
 * rectangular regions. Highlights are non-destructive — they
 * render as semi-transparent coloured rectangles above the PDF.
 *
 * Capabilities:
 *   - Drag to define highlight rectangle
 *   - Adjustable opacity (default 0.3)
 *   - Configurable highlight color
 *   - Resize after placement (via SelectTool handles)
 *   - Move, duplicate, undo support
 *   - Export flattening
 *
 * Flow:
 *   1. User drags across content to define highlight region
 *   2. On pointer up → HighlightObject created via store
 *   3. Object renders as semi-transparent coloured div
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

const MIN_HIGHLIGHT_SIZE = 5;
const DEFAULT_HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
const DEFAULT_HIGHLIGHT_OPACITY = 0.3;

export class HighlightTool implements Tool {
  readonly type = ToolType.Highlight;
  readonly label = "Highlight";
  readonly shortcut = "u";
  readonly cursor = CursorStyle.Crosshair;

  /** Highlight color (CSS color string with alpha). */
  highlightColor: string = DEFAULT_HIGHLIGHT_COLOR;
  /** Highlight opacity (0-1). */
  highlightOpacity: number = DEFAULT_HIGHLIGHT_OPACITY;

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
    this._showPreview();
  }

  onPointerUp(_event: InteractionEvent): void {
    if (!this._dragStart) return;

    this._removePreview();

    const start = this._dragStart;
    const current = this._dragCurrent ?? start;

    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    if (width < MIN_HIGHLIGHT_SIZE || height < MIN_HIGHLIGHT_SIZE) {
      this._cancelDrag();
      return;
    }

    this._createHighlight(x, y, width, height);
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
  private _showPreview(): void {
    this._removePreview();

    if (!this._dragStart || !this._dragCurrent) return;

    const x = Math.min(this._dragStart.x, this._dragCurrent.x);
    const y = Math.min(this._dragStart.y, this._dragCurrent.y);
    const width = Math.abs(this._dragCurrent.x - this._dragStart.x);
    const height = Math.abs(this._dragCurrent.y - this._dragStart.y);

    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
    preview.style.width = `${width}px`;
    preview.style.height = `${height}px`;
    preview.style.backgroundColor = this.highlightColor;
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "9999";
    preview.style.borderRadius = "2px";

    this._previewEl = preview;
    document.body.appendChild(preview);
  }

  private _removePreview(): void {
    if (this._previewEl) {
      this._previewEl.remove();
      this._previewEl = null;
    }
  }

  private _createHighlight(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const store = useEditorStore.getState();
    const now = Date.now();
    const newId = `highlight_${generateId()}`;

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Highlight,
      page: this._page,
      position: { x, y },
      size: { width, height },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        color: this.highlightColor,
        opacity: this.highlightOpacity,
      },
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }

  private _cancelDrag(): void {
    this._dragStart = null;
    this._dragCurrent = null;
  }
}
