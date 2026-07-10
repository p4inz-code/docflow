/**
 * selection.ts — Selection System Types
 *
 * Purpose: Define types for managing selected objects, selection
 * rectangles (marquee), and future handle states.
 *
 * The selection system operates on object IDs rather than object
 * references so that it remains decoupled from the overlay manager.
 */

import type { Rect } from "./editor";
import type { HandleDirection } from "./editor";

// ── Selection State ────────────────────────────────────────────────
export interface SelectionState {
  /** IDs of currently selected objects. */
  selectedIds: string[];
  /** ID of the most recently selected / clicked object. */
  activeId: string | null;
  /** Bounding rectangle encompassing all selected objects (page space). */
  bounds: Rect | null;
  /** Whether a selection marquee is currently being dragged. */
  marquee: MarqueeState | null;
  /** Future: which resize/rotation handle is being dragged. */
  activeHandle: HandleDirection | null;
}

// ── Marquee (Selection Rectangle) ──────────────────────────────────
export interface MarqueeState {
  /** Page-space origin where the drag started. */
  origin: { x: number; y: number };
  /** Current page-space corner of the drag. */
  current: { x: number; y: number };
}

// ── Hit-Test Result ────────────────────────────────────────────────
export interface HitTestResult {
  /** ID of the object that was hit, or null. */
  objectId: string | null;
  /** Distance from the hit point to the object edge. */
  distance: number;
  /** Which handle was hit, if any. */
  handle: HandleDirection | null;
}
