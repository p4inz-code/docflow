/**
 * bounds.ts — Bounding Box Placeholders
 *
 * Purpose: Placeholder for computing bounding boxes of objects,
 * selections, and groups.
 *
 * Future responsibilities:
 *   - Compute tight bounding box for rotated objects
 *   - Compute union bounding box for multi-selections
 *   - Compute bounding box for freehand drawings (from path data)
 */

import type { Rect } from "../types/editor";
import type { EditableObject } from "../types/objects";

/**
 * Compute the axis-aligned bounding box for a single object.
 * Currently returns the object's position and size directly.
 * Future: account for rotation and object-specific geometry.
 */
export function objectBounds(object: EditableObject): Rect {
  return {
    x: object.position.x,
    y: object.position.y,
    width: object.size.width,
    height: object.size.height,
  };
}

/**
 * Compute the union bounding box for an array of objects.
 * Returns null when the array is empty.
 */
export function selectionBounds(objects: EditableObject[]): Rect | null {
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    const b = objectBounds(obj);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
