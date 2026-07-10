/**
 * interaction.ts — Interaction Event Types
 *
 * Purpose: Define a unified interaction event that normalizes
 * pointer, keyboard, and wheel events into a shape that tools
 * can consume without depending on DOM event details.
 *
 * The InteractionManager converts raw DOM events into these
 * normalized InteractionEvents before routing them to the
 * active tool.
 */

import type { Point, InteractionPhase } from "./editor";

// ── Normalized Event ───────────────────────────────────────────────
export interface InteractionEvent {
  /** The page-space coordinate where the event occurred. */
  point: Point;
  /** Screen-space client coordinate. */
  clientPoint: Point;
  /** Which mouse button (0 = left, 1 = middle, 2 = right). */
  button: number;
  /** Keyboard modifiers held during the event. */
  modifiers: ModifierKeys;
  /** Current phase of the interaction gesture. */
  phase: InteractionPhase;
  /** Change in wheel scroll (for wheel events). */
  delta?: Point;
  /** Whether the event's default was already prevented. */
  defaultPrevented: boolean;
  /** Reference to the original DOM event (for advanced use). */
  originalEvent: PointerEvent | WheelEvent | KeyboardEvent;
  /** Timestamp of the event (ms). */
  timestamp: number;
}

// ── Modifier Keys ──────────────────────────────────────────────────
export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

// ── Event Routing ──────────────────────────────────────────────────
export const EventType = {
  PointerDown: "pointerdown",
  PointerMove: "pointermove",
  PointerUp: "pointerup",
  DoubleClick: "dblclick",
  Wheel: "wheel",
  KeyDown: "keydown",
  KeyUp: "keyup",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

// ── Event Handler Registry ─────────────────────────────────────────
export type EventHandler = (event: InteractionEvent) => void;

/** Map of event types to their handlers. */
export type EventHandlerMap = Partial<Record<EventType, EventHandler>>;
