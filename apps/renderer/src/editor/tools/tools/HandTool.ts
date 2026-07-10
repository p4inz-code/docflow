/**
 * HandTool.ts — Hand Tool
 *
 * Purpose: Pan the document viewport.
 * Integrates with the PDFViewer's existing pan state.
 *
 * Capabilities:
 *   - Click + drag to pan the document
 *   - Grab cursor when active
 *   - Smooth dragging
 *
 * For now, the HandTool sets the cursor and stores the
 * pan origin. Actual panning is handled by the PDFViewer
 * which reads the interaction state.
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import type { InteractionEvent } from "../../types/interaction";

export class HandTool implements Tool {
  readonly type = ToolType.Hand;
  readonly label = "Hand";
  readonly shortcut = "h";
  readonly cursor = CursorStyle.Grab;

  private _isPanning = false;
  private _origin: { x: number; y: number } = { x: 0, y: 0 };
  private _scrollOrigin: { x: number; y: number } = { x: 0, y: 0 };

  onActivate(): void {
    document.body.style.cursor = "grab";
  }

  onDeactivate(): void {
    this._isPanning = false;
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    this._isPanning = true;
    this._origin = { x: event.point.x, y: event.point.y };
    this._scrollOrigin = {
      x: window.scrollX,
      y: window.scrollY,
    };
    document.body.style.cursor = "grabbing";
  }

  onPointerMove(event: InteractionEvent): void {
    if (!this._isPanning) return;

    const dx = event.point.x - this._origin.x;
    const dy = event.point.y - this._origin.y;

    window.scrollTo(
      this._scrollOrigin.x - dx,
      this._scrollOrigin.y - dy,
    );
  }

  onPointerUp(_event: InteractionEvent): void {
    this._isPanning = false;
    document.body.style.cursor = "grab";
  }

  onDoubleClick(_event: InteractionEvent): void {
    // Future: fit-to-page on double-click
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scroll/zoom
  }

  onKeyDown(_event: KeyboardEvent): void {
    // No-op
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }
}
