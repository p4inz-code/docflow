/**
 * point.ts — Point Helpers
 *
 * Purpose: Provide reusable operations on 2D points for use by tools,
 * selection, and geometry code.
 */

import type { Point } from "../types/editor";

/** Create a Point from two numbers. */
export function createPoint(x: number, y: number): Point {
  return { x, y };
}

/** Add two points (vector addition). */
export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract point b from point a (vector subtraction). */
export function subtractPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a point by a scalar factor. */
export function scalePoint(point: Point, factor: number): Point {
  return { x: point.x * factor, y: point.y * factor };
}

/** Compute the Euclidean distance between two points. */
export function distanceBetween(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp a point's components to the given min/max ranges. */
export function clampPoint(
  point: Point,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): Point {
  return {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y)),
  };
}

/** Check if two points are approximately equal within a tolerance. */
export function pointsEqual(a: Point, b: Point, tolerance = 0.001): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}
