/**
 * TransformSystem.ts — Object Transformation System
 *
 * Purpose: Handle interactive object transformation (move, resize,
 * rotate) with live visual feedback.
 *
 * The TransformSystem tracks the active transform gesture and
 * computes new position/size/rotation values from pointer deltas.
 * It does NOT directly modify the store — instead it computes
 * the transformed values and the caller applies them.
 *
 * Features:
 *   - Move by dragging the object body
 *   - Resize via 8 handles (4 corners + 4 edges)
 *   - Rotate via rotation handle (top center)
 *   - Maintain aspect ratio during resize (Shift held)
 *   - Minimum/maximum size constraints
 *   - Snap to page edges, center, margins
 *   - Live visual feedback
 */

import type { Point } from "../types/editor";
import { MIN_OBJECT_SIZE, MAX_OBJECT_SIZE, SNAP_DISTANCE } from "../core/constants";
import type { HandleDirection } from "../types/editor";
import { HandleDirection as HD } from "../types/editor";

// ── Transform System ───────────────────────────────────────────────
export class TransformSystem {
  // ── Movement ─────────────────────────────────────────────────────
  /**
   * Compute a new position from a pointer delta, with optional snapping.
   */
  computeMove(
    originalPosition: Point,
    delta: Point,
    snapToGuides: boolean,
    pageWidth: number,
    pageHeight: number,
  ): Point {
    let x = originalPosition.x + delta.x;
    let y = originalPosition.y + delta.y;

    if (snapToGuides) {
      // Snap to page edges
      if (Math.abs(x) < SNAP_DISTANCE) x = 0;
      if (Math.abs(y) < SNAP_DISTANCE) y = 0;
      if (Math.abs(x - pageWidth) < SNAP_DISTANCE) x = pageWidth;
      if (Math.abs(y - pageHeight) < SNAP_DISTANCE) y = pageHeight;

      // Snap to page center
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      if (Math.abs(x - centerX) < SNAP_DISTANCE) x = centerX;
      if (Math.abs(y - centerY) < SNAP_DISTANCE) y = centerY;
    }

    return { x: Math.max(0, x), y: Math.max(0, y) };
  }

  // ── Resize ───────────────────────────────────────────────────────
  /**
   * Compute new position and size from a handle drag delta.
   *
   * @param handle - Which handle is being dragged.
   * @param originalPos - Original top-left position.
   * @param originalSize - Original width/height.
   * @param delta - Mouse delta from the drag start.
   * @param maintainAspect - Whether to lock aspect ratio.
   * @param aspectRatio - width/height aspect ratio.
   */
  computeResize(
    handle: HandleDirection,
    originalPos: Point,
    originalSize: { width: number; height: number },
    delta: Point,
    maintainAspect: boolean,
    aspectRatio: number,
  ): { position: Point; size: { width: number; height: number } } {
    let { x, y } = originalPos;
    let { width, height } = originalSize;

    const minSize = MIN_OBJECT_SIZE;
    const maxSize = MAX_OBJECT_SIZE;

    // Helper to clamp size
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    switch (handle) {
      case HD.TopLeft:
        width = clamp(width - delta.x, minSize, maxSize);
        height = clamp(height - delta.y, minSize, maxSize);
        if (maintainAspect) {
          const aspectW = width;
          width = aspectW;
          height = clamp(aspectW / aspectRatio, minSize, maxSize);
        }
        x = originalPos.x + originalSize.width - width;
        y = originalPos.y + originalSize.height - height;
        break;

      case HD.Top:
        height = clamp(height - delta.y, minSize, maxSize);
        y = originalPos.y + originalSize.height - height;
        break;

      case HD.TopRight:
        width = clamp(width + delta.x, minSize, maxSize);
        height = clamp(height - delta.y, minSize, maxSize);
        if (maintainAspect) {
          height = clamp(width / aspectRatio, minSize, maxSize);
          width = clamp(height * aspectRatio, minSize, maxSize);
        }
        y = originalPos.y + originalSize.height - height;
        break;

      case HD.Right:
        width = clamp(width + delta.x, minSize, maxSize);
        if (maintainAspect) {
          height = clamp(width / aspectRatio, minSize, maxSize);
        }
        break;

      case HD.BottomRight:
        width = clamp(width + delta.x, minSize, maxSize);
        height = clamp(height + delta.y, minSize, maxSize);
        if (maintainAspect) {
          const h = width / aspectRatio;
          height = clamp(h, minSize, maxSize);
          width = clamp(height * aspectRatio, minSize, maxSize);
        }
        break;

      case HD.Bottom:
        height = clamp(height + delta.y, minSize, maxSize);
        if (maintainAspect) {
          width = clamp(height * aspectRatio, minSize, maxSize);
        }
        break;

      case HD.BottomLeft:
        width = clamp(width - delta.x, minSize, maxSize);
        height = clamp(height + delta.y, minSize, maxSize);
        if (maintainAspect) {
          const h = width / aspectRatio;
          height = clamp(h, minSize, maxSize);
          width = clamp(height * aspectRatio, minSize, maxSize);
        }
        x = originalPos.x + originalSize.width - width;
        break;

      case HD.Left:
        width = clamp(width - delta.x, minSize, maxSize);
        if (maintainAspect) {
          height = clamp(width / aspectRatio, minSize, maxSize);
        }
        x = originalPos.x + originalSize.width - width;
        break;
    }

    return {
      position: { x, y },
      size: { width, height },
    };
  }

  // ── Rotation ─────────────────────────────────────────────────────
  /**
   * Compute a new rotation angle from a pointer delta relative to
   * the object's center.
   */
  computeRotation(
    objectCenter: Point,
    pointerPos: Point,
  ): number {
    const dx = pointerPos.x - objectCenter.x;
    const dy = pointerPos.y - objectCenter.y;
    const radians = Math.atan2(dy, dx);
    // Convert to degrees, subtract 90° because the handle is at the top
    let degrees = (radians * 180) / Math.PI - 90;
    // Normalize to 0-360
    degrees = ((degrees % 360) + 360) % 360;
    // Snap to 45° increments when close
    const snapAngle = 45;
    const remainder = degrees % snapAngle;
    if (Math.abs(remainder) < 5 || Math.abs(remainder - snapAngle) < 5) {
      degrees = Math.round(degrees / snapAngle) * snapAngle;
    }
    return Math.round(degrees);
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const transformSystem = new TransformSystem();
