/**
 * matrix.ts — Matrix Transformation Placeholders
 *
 * Purpose: Placeholder for 2D affine transformation utilities
 * that will be needed for rotation, scaling, and coordinate
 * conversion between screen-space and page-space.
 *
 * Future responsibilities:
 *   - Build transformation matrices from position, size, rotation
 *   - Apply matrix transforms to points and rectangles
 *   - Invert matrices for screen-to-page coordinate conversion
 */

import type { Point } from "../types/editor";

/** Future: create an SVGMatrix-compatible 2D affine transform. */
export function createTransform(
  _position: Point,
  _size: { width: number; height: number },
  _rotation: number,
): unknown {
  return null;
}

/** Future: apply a transform matrix to a point. */
export function applyTransform(
  _point: Point,
  _matrix: unknown,
): Point {
  return { x: 0, y: 0 };
}

/** Future: invert a transform matrix. */
export function invertTransform(_matrix: unknown): unknown {
  return null;
}
