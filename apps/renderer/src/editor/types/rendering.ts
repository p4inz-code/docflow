/**
 * rendering.ts — Rendering Engine Types
 *
 * Purpose: Define types for the object rendering system including
 * renderer interfaces, lifecycle states, and render statistics.
 */

import type { EditableObject } from "./objects";
import type { Point, Rect } from "./editor";

// ── Renderer Interface ─────────────────────────────────────────────
/**
 * Every object-type renderer must implement this interface.
 * Renderers manage the lifecycle of DOM elements representing
 * a single editable object on a page overlay.
 */
export interface ObjectRenderer {
  /** The object this renderer is responsible for. */
  readonly object: EditableObject;

  /** The root DOM element for this renderer's output. */
  readonly element: HTMLElement;

  /** Render (or re-render) the object to the DOM element. */
  render(): void;

  /**
   * Update the renderer with new object properties.
   * Called when the object is modified (move, resize, rotate, style change).
   */
  update(changes: Partial<EditableObject>): void;

  /** Destroy the renderer, cleaning up DOM elements and subscriptions. */
  destroy(): void;

  /**
   * Check if a point (relative to the overlay container) hits this object.
   * Returns true if the point is within the rendered element.
   */
  hitTest(point: Point): boolean;

  /**
   * Compute the axis-aligned bounding box of the rendered object
   * relative to the overlay container.
   */
  getBounds(): Rect;
}

// ── Renderer Factory ───────────────────────────────────────────────
/** A factory function that creates a renderer for a given object. */
export type RendererFactory = (object: EditableObject) => ObjectRenderer;

// ── Render Lifecycle ───────────────────────────────────────────────
export const RenderLifecycle = {
  Created: "created",
  Mounted: "mounted",
  Updated: "updated",
  Unmounted: "unmounted",
  Destroyed: "destroyed",
} as const;

export type RenderLifecycle =
  (typeof RenderLifecycle)[keyof typeof RenderLifecycle];

// ── Dirty Flags ────────────────────────────────────────────────────
export interface DirtyFlags {
  /** True if the object was newly created. */
  created: boolean;
  /** True if object properties changed. */
  updated: boolean;
  /** True if the object was deleted. */
  deleted: boolean;
  /** True if the object's selection state changed. */
  selected: boolean;
  /** True if the object's visibility changed. */
  visibility: boolean;
  /** True if the object's transform (position/size/rotation) changed. */
  transform: boolean;
}

// ── Page Overlay Container ─────────────────────────────────────────
/** Describes an overlay container attached to a PDF page wrapper. */
export interface PageOverlayContainer {
  /** 1-based page number. */
  page: number;
  /** The overlay container DOM element. */
  container: HTMLElement;
  /** The selection layer DOM element within the container. */
  selectionLayer: HTMLElement;
  /** The interaction layer DOM element within the container. */
  interactionLayer: HTMLElement;
  /** Map of object ID to its renderer. */
  renderers: Map<string, ObjectRenderer>;
}

// ── Render Stats ───────────────────────────────────────────────────
export interface RenderStats {
  totalPages: number;
  totalObjects: number;
  visibleObjects: number;
  dirtyObjects: number;
  lastRenderTime: number;
}
