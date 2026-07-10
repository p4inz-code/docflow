/**
 * SelectionVisuals.ts — Selection Visual Rendering
 *
 * Purpose: Render visual selection indicators (bounding boxes,
 * resize handles, rotation handles) in the selection layer of
 * each page's overlay container.
 *
 * This module handles ONLY the visual representation of selection.
 * All logical selection state is managed by the SelectionManager.
 *
 * Future (V2–V4):
 *   - Resize handles (8 directions)
 *   - Rotation handle (top center)
 *   - Snap indicators
 *   - Multi-selection bounding box
 */

import type { Rect } from "../types/editor";
import { HANDLE_SIZE } from "../core/constants";

// ── Selection Visuals ──────────────────────────────────────────────
export class SelectionVisuals {
  private _selectionLayer: HTMLElement;
  private _box: HTMLElement | null = null;
  private _handles: HTMLElement[] = [];
  private _rotationHandle: HTMLElement | null = null;

  constructor(selectionLayer: HTMLElement) {
    this._selectionLayer = selectionLayer;
  }

  /**
   * Render selection highlights for the given bounding rects.
   * Each rect represents the bounding box of a selected object.
   */
  renderSelection(objects: Rect[]): void {
    this.clear();

    for (const bounds of objects) {
      // Selection bounding box outline
      const box = document.createElement("div");
      box.style.position = "absolute";
      box.style.left = `${bounds.x}px`;
      box.style.top = `${bounds.y}px`;
      box.style.width = `${bounds.width}px`;
      box.style.height = `${bounds.height}px`;
      box.style.border = "2px solid #4a9eff";
      box.style.borderRadius = "2px";
      box.style.pointerEvents = "none";
      box.style.boxSizing = "border-box";
      this._selectionLayer.appendChild(box);
      this._box = box;

      // Resize handles at corners and midpoints
      this._createHandle(bounds.x - HANDLE_SIZE / 2, bounds.y - HANDLE_SIZE / 2, "nw-resize");
      this._createHandle(bounds.x + bounds.width / 2 - HANDLE_SIZE / 2, bounds.y - HANDLE_SIZE / 2, "n-resize");
      this._createHandle(bounds.x + bounds.width - HANDLE_SIZE / 2, bounds.y - HANDLE_SIZE / 2, "ne-resize");
      this._createHandle(bounds.x + bounds.width - HANDLE_SIZE / 2, bounds.y + bounds.height / 2 - HANDLE_SIZE / 2, "e-resize");
      this._createHandle(bounds.x + bounds.width - HANDLE_SIZE / 2, bounds.y + bounds.height - HANDLE_SIZE / 2, "se-resize");
      this._createHandle(bounds.x + bounds.width / 2 - HANDLE_SIZE / 2, bounds.y + bounds.height - HANDLE_SIZE / 2, "s-resize");
      this._createHandle(bounds.x - HANDLE_SIZE / 2, bounds.y + bounds.height - HANDLE_SIZE / 2, "sw-resize");
      this._createHandle(bounds.x - HANDLE_SIZE / 2, bounds.y + bounds.height / 2 - HANDLE_SIZE / 2, "w-resize");

      // Rotation handle (above top center)
      this._createRotationHandle(bounds);
    }
  }

  /** Clear all selection visuals. */
  clear(): void {
    this._selectionLayer.innerHTML = "";
    this._box = null;
    this._handles = [];
    this._rotationHandle = null;
  }

  /** Hide/Show selection visuals. */
  setVisible(visible: boolean): void {
    this._selectionLayer.style.display = visible ? "block" : "none";
  }

  // ── Private ──────────────────────────────────────────────────────
  private _createHandle(x: number, y: number, cursor: string): void {
    const handle = document.createElement("div");
    handle.style.position = "absolute";
    handle.style.left = `${x}px`;
    handle.style.top = `${y}px`;
    handle.style.width = `${HANDLE_SIZE}px`;
    handle.style.height = `${HANDLE_SIZE}px`;
    handle.style.backgroundColor = "#ffffff";
    handle.style.border = "2px solid #4a9eff";
    handle.style.borderRadius = "50%";
    handle.style.cursor = cursor;
    handle.style.pointerEvents = "auto";
    handle.style.zIndex = "1";
    handle.className = "pdf-overlay-handle";
    this._selectionLayer.appendChild(handle);
    this._handles.push(handle);
  }

  private _createRotationHandle(bounds: Rect): void {
    const handle = document.createElement("div");
    const rotX = bounds.x + bounds.width / 2 - HANDLE_SIZE / 2;
    const rotY = bounds.y - 24;
    handle.style.position = "absolute";
    handle.style.left = `${rotX}px`;
    handle.style.top = `${rotY}px`;
    handle.style.width = `${HANDLE_SIZE}px`;
    handle.style.height = `${HANDLE_SIZE}px`;
    handle.style.backgroundColor = "#ffffff";
    handle.style.border = "2px solid #4a9eff";
    handle.style.borderRadius = "50%";
    handle.style.cursor = "grab";
    handle.style.pointerEvents = "auto";
    handle.style.zIndex = "1";
    handle.className = "pdf-overlay-rotation-handle";
    this._selectionLayer.appendChild(handle);
    this._rotationHandle = handle;
  }
}
