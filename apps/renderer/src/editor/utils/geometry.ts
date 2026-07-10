/**
 * geometry.ts — Geometry Helpers
 *
 * Purpose: General-purpose geometry operations used across
 * tools, selection, and rendering.
 */

import type { Point } from "../types/editor";

/** Linear interpolation between two values. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert degrees to radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Rotate a point around an origin by the given angle (radians). */
export function rotatePoint(
  point: Point,
  origin: Point,
  angleRad: number,
): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Compute the aspect ratio of a width/height pair. */
export function aspectRatio(width: number, height: number): number {
  if (height === 0) return 1;
  return width / height;
}
