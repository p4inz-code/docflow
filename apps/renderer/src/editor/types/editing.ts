/**
 * editing.ts — Text Editing & Transformation Types
 *
 * Purpose: Define types for the text editing subsystem, object
 * transformation, smart guides, and whiteout overlays.
 */

import type { Point, Rect } from "./editor";
import type { EditableObject } from "./objects";

// ── Editing State ──────────────────────────────────────────────────
export const EditingMode = {
  /** No object is being edited. */
  None: "none",
  /** A text object is being edited inline. */
  Text: "text",
  /** An object is being moved. */
  Moving: "moving",
  /** An object is being resized. */
  Resizing: "resizing",
  /** An object is being rotated. */
  Rotating: "rotating",
} as const;

export type EditingMode = (typeof EditingMode)[keyof typeof EditingMode];

// ── Editor Instance ────────────────────────────────────────────────
export interface ActiveEdit {
  /** The editing mode currently active. */
  mode: EditingMode;
  /** ID of the object being edited. */
  objectId: string;
  /** Page number where editing is happening. */
  page: number;
  /** Starting point of the edit gesture (page space). */
  origin: Point;
  /** Current state of the edit (varies by mode). */
  state: Record<string, unknown>;
}

// ── Transform State ────────────────────────────────────────────────
export interface TransformState {
  /** Original position before transform started. */
  originalPosition: Point;
  /** Original size before transform started. */
  originalSize: { width: number; height: number };
  /** Original rotation before transform started. */
  originalRotation: number;
  /** Which handle is being dragged (for resize). */
  handle: string | null;
  /** Whether to maintain aspect ratio. */
  maintainAspectRatio: boolean;
  /** The cursor position at the start of the drag (page space). */
  dragStart: Point;
}

// ── Smart Guide ────────────────────────────────────────────────────
export interface GuideLine {
  /** Orientation of the guide. */
  orientation: "horizontal" | "vertical";
  /** Position in page space (x for vertical, y for horizontal). */
  position: number;
  /** Start of the guide line. */
  start: number;
  /** End of the guide line. */
  end: number;
}

export interface GuideState {
  /** Active guide lines to render. */
  lines: GuideLine[];
  /** Whether snapping is currently active. */
  snapping: boolean;
  /** The snap offset applied to the object. */
  snapOffset: Point;
}

// ── Whiteout Object ────────────────────────────────────────────────
export const ObjectTypeWhiteout = {
  Whiteout: "whiteout",
} as const;

export type WhiteoutOverrideType = "whiteout";

/** A whiteout overlay that covers original PDF text (Option B). */
export interface WhiteoutObject extends EditableObject {
  type: WhiteoutOverrideType;
  data: {
    /** Fill color of the whiteout (defaults to white). */
    fillColor?: string;
    /** Border radius for the whiteout rectangle. */
    cornerRadius?: number;
  };
}

// ── Clipboard Entry ────────────────────────────────────────────────
export interface ClipboardEntry {
  /** Serialized objects on the clipboard. */
  objects: EditableObject[];
  /** Timestamp when copied. */
  timestamp: number;
}
