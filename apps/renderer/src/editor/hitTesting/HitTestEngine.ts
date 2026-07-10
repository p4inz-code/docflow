/**
 * HitTestEngine.ts — Hit-Testing Engine
 *
 * Purpose: Provide accurate hit-testing for overlay objects.
 * Supports point hits (for selection) and rectangle hits
 * (for marquee selection).
 *
 * Future (V2–V4):
 *   - Pixel-level hit testing for rotated objects
 *   - Shape-aware hit testing (ellipses, drawings)
 *   - Z-order aware hit testing
 *   - Transparency-aware hit testing
 */

import type { Point, Rect } from "../types/editor";
import type { EditableObject } from "../types/objects";
import type { HitTestResult } from "../types/selection";
import { pointInRect, rectsIntersect } from "../utils/rect";

// ── Hit-Test Engine ────────────────────────────────────────────────
export class HitTestEngine {
  /**
   * Find the topmost visible object at a given point.
   * Iterates in reverse order (topmost objects are last in the array).
   */
  pointHit(
    point: Point,
    objects: EditableObject[],
  ): HitTestResult {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (!obj.visible) continue;

      if (this._pointInObject(point, obj)) {
        return { objectId: obj.id, distance: 0, handle: null };
      }
    }
    return { objectId: null, distance: Infinity, handle: null };
  }

  /**
   * Find all objects whose bounding box intersects a rectangle.
   * Used for marquee / lasso selection.
   */
  rectHit(
    rect: Rect,
    objects: EditableObject[],
  ): EditableObject[] {
    return objects.filter(
      (obj) => obj.visible && this._objectIntersectsRect(obj, rect),
    );
  }

  /**
   * Check if any object at a point is within a given tolerance.
   * Useful for "generous" click targets.
   */
  pointHitWithTolerance(
    point: Point,
    objects: EditableObject[],
    tolerance: number,
  ): HitTestResult {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (!obj.visible) continue;

      const expanded = {
        x: obj.position.x - tolerance,
        y: obj.position.y - tolerance,
        width: obj.size.width + tolerance * 2,
        height: obj.size.height + tolerance * 2,
      };

      if (pointInRect(point, expanded)) {
        return { objectId: obj.id, distance: 0, handle: null };
      }
    }
    return { objectId: null, distance: Infinity, handle: null };
  }

  // ── Private ──────────────────────────────────────────────────────
  private _pointInObject(point: Point, obj: EditableObject): boolean {
    const rect: Rect = {
      x: obj.position.x,
      y: obj.position.y,
      width: obj.size.width,
      height: obj.size.height,
    };
    return pointInRect(point, rect);
  }

  private _objectIntersectsRect(obj: EditableObject, rect: Rect): boolean {
    const objRect: Rect = {
      x: obj.position.x,
      y: obj.position.y,
      width: obj.size.width,
      height: obj.size.height,
    };
    return rectsIntersect(objRect, rect);
  }
}
