/**
 * editor.ts — Core editor types
 *
 * Purpose: Define the foundational enums and primitive types used
 * across the entire editing architecture.
 *
 * These types are intentionally framework-agnostic so they can be
 * shared between the store, tools, commands, and rendering layers.
 */

// ── Editor Mode ────────────────────────────────────────────────────
/** Top-level mode the editor can be in. */
export const EditorMode = {
  /** Viewer-only mode — no editing interactions are active. */
  View: "view",
  /** Full editing mode — tools, selection, and commands are active. */
  Edit: "edit",
} as const;

export type EditorMode = (typeof EditorMode)[keyof typeof EditorMode];

// ── Orientation / Direction ────────────────────────────────────────
export const HandleDirection = {
  TopLeft: "top-left",
  Top: "top",
  TopRight: "top-right",
  Right: "right",
  BottomRight: "bottom-right",
  Bottom: "bottom",
  BottomLeft: "bottom-left",
  Left: "left",
} as const;

export type HandleDirection =
  (typeof HandleDirection)[keyof typeof HandleDirection];

export const CursorStyle = {
  Default: "default",
  Pointer: "pointer",
  Crosshair: "crosshair",
  Grab: "grab",
  Grabbing: "grabbing",
  Text: "text",
  Move: "move",
  NotAllowed: "not-allowed",
  NResize: "n-resize",
  SResize: "s-resize",
  EResize: "e-resize",
  WResize: "w-resize",
  NEResize: "ne-resize",
  NWResize: "nw-resize",
  SEResize: "se-resize",
  SWResize: "sw-resize",
} as const;

export type CursorStyle = (typeof CursorStyle)[keyof typeof CursorStyle];

// ── Point / Size / Rect (shared value types) ───────────────────────
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Interaction State ──────────────────────────────────────────────
export const InteractionPhase = {
  Idle: "idle",
  Started: "started",
  Dragging: "dragging",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export type InteractionPhase =
  (typeof InteractionPhase)[keyof typeof InteractionPhase];
