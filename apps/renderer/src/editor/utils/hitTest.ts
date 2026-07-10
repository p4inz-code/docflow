/**
 * hitTest.ts — Hit-Test Placeholders
 *
 * Purpose: Placeholder for advanced hit-testing logic that will
 * be implemented when object rendering exists (V2–V4).
 *
 * Future responsibilities:
 *   - Per-object-type hit-testing
 *   - Handle hit-testing (resize / rotation handles)
 *   - Distance-field-based hit testing for freehand drawings
 *   - Snap-point hit testing
 */

import type { Point } from "../types/editor";
import type { EditableObject } from "../types/objects";
import { pointInRect } from "./rect";

/**
 * Basic axis-aligned bounding box hit test.
 * Returns the topmost visible object at the given point, or null.
 *
 * Future: replace with per-object-type hit-testing that considers
 * rotation, shape geometry, and drawing paths.
 */
export function hitTestObjects(
  point: Point,
  objects: EditableObject[],
): EditableObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (!obj.visible) continue;

    const rect = {
      x: obj.position.x,
      y: obj.position.y,
      width: obj.size.width,
      height: obj.size.height,
    };

    if (pointInRect(point, rect)) {
      return obj;
    }
  }
  return null;
}

/**
 * Future: hit-test resize/rotation handles and return which
 * handle was hit.
 */
export function hitTestHandles(
  _point: Point,
  _object: EditableObject,
): string | null {
  return null;
}
