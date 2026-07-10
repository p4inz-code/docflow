/**
 * constants.ts — Centralized Editor Constants
 *
 * Purpose: Single source of truth for every magic number, default
 * value, and configuration knob in the editing engine.
 *
 * These are gathered here so that tuning the feel of the application
 * never requires hunting through dozens of files.
 */

// ── Object Size Limits (page-space pixels) ─────────────────────────
export const MIN_OBJECT_SIZE = 4;
export const MAX_OBJECT_SIZE = 10_000;

// ── Default Values ─────────────────────────────────────────────────
export const DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif";
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_WEIGHT = 400;
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_FILL_COLOR = "#ffffff";
export const DEFAULT_STROKE_COLOR = "#000000";
export const DEFAULT_TEXT_COLOR = "#000000";
export const DEFAULT_HIGHLIGHT_COLOR = "rgba(255, 255, 0, 0.3)";
export const DEFAULT_OPACITY = 1;

// ── Selection & Interaction ────────────────────────────────────────
/** Maximum distance (px) from an object edge to register a hit. */
export const SELECTION_TOLERANCE = 6;
/** Minimum drag distance (px) before a marquee begins. */
export const MARQUEE_THRESHOLD = 3;
/** Handle clickable size (px) for resize / rotation handles. */
export const HANDLE_SIZE = 10;

// ── Snap ───────────────────────────────────────────────────────────
/** Distance (px) within which objects snap to guides / grid. */
export const SNAP_DISTANCE = 5;
/** Default grid spacing (px) for snap-to-grid. */
export const GRID_SIZE = 20;

// ── History ────────────────────────────────────────────────────────
/** Maximum number of undo steps retained. */
export const MAX_HISTORY_ENTRIES = 100;

// ── Zoom ───────────────────────────────────────────────────────────
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.1;
export const WHEEL_ZOOM_STEP = 0.1;

// ── Misc ───────────────────────────────────────────────────────────
/** Minimum dimensions for a newly created object (px). */
export const MIN_NEW_OBJECT_WIDTH = 20;
export const MIN_NEW_OBJECT_HEIGHT = 20;
