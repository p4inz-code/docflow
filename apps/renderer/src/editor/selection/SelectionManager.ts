/**
 * SelectionManager.ts — Selection System Foundation
 *
 * Purpose: Provide a helper class for managing selection state
 * in coordination with the editor store. Handles single-selection,
 * multi-selection (Shift/Ctrl+click), marquee rectangle, and
 * hit-testing against overlay objects.
 *
 * The SelectionManager does NOT render selection visuals — it
 * only manages the logical selection state. Rendering belongs
 * in the SelectionLayer (future).
 *
 * Future expansion (V2–V4):
 *   - Resize handles
 *   - Rotation handles
 *   - Snapping guides
 */

import type { SelectionState, MarqueeState, HitTestResult } from "../types/selection";
import type { HandleDirection } from "../types/editor";
import type { EditableObject } from "../types/objects";

// ── Selection Manager ──────────────────────────────────────────────
export class SelectionManager {
  private _state: SelectionState = {
    selectedIds: [],
    activeId: null,
    bounds: null,
    marquee: null,
    activeHandle: null,
  };

  /** Return a snapshot of the current selection state. */
  get state(): SelectionState {
    return { ...this._state, marquee: this._state.marquee ? { ...this._state.marquee } : null };
  }

  // ── Single Selection ─────────────────────────────────────────────
  /** Select only the given object ID (clears previous selection). */
  selectSingle(id: string): void {
    this._state.selectedIds = [id];
    this._state.activeId = id;
    this._updateBounds();
  }

  /** Deselect all objects. */
  clear(): void {
    this._state.selectedIds = [];
    this._state.activeId = null;
    this._state.bounds = null;
    this._state.marquee = null;
    this._state.activeHandle = null;
  }

  // ── Multi-Selection ──────────────────────────────────────────────
  /** Toggle the selection state of an object ID (for Shift/Ctrl+click). */
  toggleSelection(id: string): void {
    const index = this._state.selectedIds.indexOf(id);
    if (index >= 0) {
      this._state.selectedIds = [
        ...this._state.selectedIds.slice(0, index),
        ...this._state.selectedIds.slice(index + 1),
      ];
      if (this._state.activeId === id) {
        this._state.activeId = this._state.selectedIds[0] ?? null;
      }
    } else {
      this._state.selectedIds = [...this._state.selectedIds, id];
      this._state.activeId = id;
    }
    this._updateBounds();
  }

  /** Add an ID to the selection set without clearing existing selection. */
  addToSelection(id: string): void {
    if (!this._state.selectedIds.includes(id)) {
      this._state.selectedIds = [...this._state.selectedIds, id];
      this._state.activeId = id;
      this._updateBounds();
    }
  }

  /** Remove an ID from the selection set. */
  removeFromSelection(id: string): void {
    this._state.selectedIds = this._state.selectedIds.filter((i) => i !== id);
    if (this._state.activeId === id) {
      this._state.activeId = this._state.selectedIds[0] ?? null;
    }
    this._updateBounds();
  }

  // ── Marquee (Selection Rectangle) ────────────────────────────────
  /** Begin a selection marquee at the given origin point. */
  beginMarquee(origin: { x: number; y: number }): void {
    this._state.marquee = { origin, current: { ...origin } };
  }

  /** Update the marquee's current corner during drag. */
  updateMarquee(current: { x: number; y: number }): void {
    if (this._state.marquee) {
      this._state.marquee.current = current;
    }
  }

  /** End the marquee and select objects within it. */
  endMarquee(objects: EditableObject[]): void {
    if (!this._state.marquee) return;

    const sel = this._marqueeRect();
    this._state.selectedIds = objects
      .filter((obj) => this._objectIntersectsRect(obj, sel))
      .map((obj) => obj.id);
    this._state.activeId = this._state.selectedIds[0] ?? null;
    this._state.marquee = null;
    this._updateBounds();
  }

  /** Cancel the marquee without selecting anything. */
  cancelMarquee(): void {
    this._state.marquee = null;
  }

  // ── Hit Testing ──────────────────────────────────────────────────
  /**
   * Find the topmost object at the given page-space point.
   * Returns a HitTestResult with the object ID or null.
   */
  hitTest(
    point: { x: number; y: number },
    objects: EditableObject[],
  ): HitTestResult {
    // Iterate in reverse (topmost last-drawn objects first).
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (!obj.visible) continue;

      const { position, size } = obj;
      if (
        point.x >= position.x &&
        point.x <= position.x + size.width &&
        point.y >= position.y &&
        point.y <= position.y + size.height
      ) {
        return { objectId: obj.id, distance: 0, handle: null };
      }
    }
    return { objectId: null, distance: Infinity, handle: null };
  }

  // ── Private Helpers ──────────────────────────────────────────────
  /** Recalculate the bounding box of all selected objects. */
  private _updateBounds(): void {
    // Future: compute union rectangle from selected objects' positions + sizes.
    this._state.bounds = null;
  }

  /** Compute the normalized selection rectangle from marquee state. */
  private _marqueeRect(): { x: number; y: number; width: number; height: number } {
    if (!this._state.marquee) return { x: 0, y: 0, width: 0, height: 0 };
    const { origin, current } = this._state.marquee;
    const x = Math.min(origin.x, current.x);
    const y = Math.min(origin.y, current.y);
    return {
      x,
      y,
      width: Math.abs(current.x - origin.x),
      height: Math.abs(current.y - origin.y),
    };
  }

  /** Check if an object's bounding box intersects a rectangle. */
  private _objectIntersectsRect(
    obj: EditableObject,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return !(
      obj.position.x + obj.size.width < rect.x ||
      obj.position.x > rect.x + rect.width ||
      obj.position.y + obj.size.height < rect.y ||
      obj.position.y > rect.y + rect.height
    );
  }
}
