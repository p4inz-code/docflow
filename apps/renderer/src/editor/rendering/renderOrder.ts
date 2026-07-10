/**
 * renderOrder.ts — Render Order (Z-Index) System
 *
 * Purpose: Manage the visual stacking order of overlay objects.
 * Objects with higher z-index values appear on top.
 *
 * Future commands (V2–V4):
 *   - bringForward / sendBackward (single step)
 *   - bringToFront / sendToBack (extremes)
 *   - z-index presets / layers
 */

import type { EditableObject } from "../types/objects";

// ── Z-Index Manager ────────────────────────────────────────────────
export class ZIndexManager {
  private _nextZ = 1;
  /** Map of object ID → current z-index. */
  private _zIndices = new Map<string, number>();

  /** Assign the next available z-index to an object. */
  assign(object: EditableObject): number {
    const z = this._nextZ++;
    this._zIndices.set(object.id, z);
    return z;
  }

  /** Get the current z-index of an object, or 0 if unassigned. */
  get(objectId: string): number {
    return this._zIndices.get(objectId) ?? 0;
  }

  /** Move an object to the top of the stack. */
  bringToFront(objectId: string): void {
    this._zIndices.set(objectId, this._nextZ++);
  }

  /** Move an object to the bottom of the stack. */
  sendToBack(objectId: string): void {
    // Find the minimum z-index and place this object below it.
    let minZ = Infinity;
    for (const z of this._zIndices.values()) {
      if (z < minZ) minZ = z;
    }
    this._zIndices.set(objectId, minZ - 1);
  }

  /** Move an object one step forward in the stack. */
  bringForward(objectId: string): void {
    const current = this._zIndices.get(objectId) ?? 0;
    this._zIndices.set(objectId, current + 1);
  }

  /** Move an object one step backward in the stack. */
  sendBackward(objectId: string): void {
    const current = this._zIndices.get(objectId) ?? 0;
    this._zIndices.set(objectId, current - 1);
  }

  /** Sort an array of objects by their z-index (ascending). */
  sort(objects: EditableObject[]): EditableObject[] {
    return [...objects].sort(
      (a, b) => (this._zIndices.get(a.id) ?? 0) - (this._zIndices.get(b.id) ?? 0),
    );
  }

  /** Remove an object from z-index tracking. */
  remove(objectId: string): void {
    this._zIndices.delete(objectId);
  }

  /** Clear all z-index data. */
  clear(): void {
    this._zIndices.clear();
    this._nextZ = 1;
  }
}
