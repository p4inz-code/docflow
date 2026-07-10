/**
 * EventFlow.ts — Event Flow Architecture
 *
 * Purpose: Define the canonical route that every user interaction
 * follows through the editing engine.
 *
 * Future flow:
 *
 *   DOM Event (pointer / keyboard / wheel)
 *        │
 *        ▼
 *   InteractionManager.normalize()   ──→  InteractionEvent
 *        │
 *        ▼
 *   InteractionManager.route()       ──→  ActiveTool
 *        │
 *        ▼
 *   Tool handler                      ──→  Command(s)
 *        │
 *        ▼
 *   CommandManager.execute()
 *        │
 *        ├──→ OverlayManager         (modify object data)
 *        ├──→ EditorStore            (update selection / state)
 *        └──→ HistoryManager.push()  (record for undo)
 *             │
 *             ▼
 *   EventBus.emit("change")          ──→  React re-render
 *
 * This file documents the intended flow and provides the routing
 * interfaces. No actual DOM wiring happens here — that belongs
 * in the InteractionManager.
 */
import type { InteractionEvent, EventType } from "../types/interaction";
import type { Tool } from "../types/tools";
import type { Command } from "../types/commands";

// ── Event Route ────────────────────────────────────────────────────
export interface EventRoute {
  /** The type of DOM event that triggered this route. */
  eventType: EventType;
  /** The tool that will handle the event. */
  tool: Tool;
  /** The normalized interaction event payload. */
  event: InteractionEvent;
  /** Commands produced by the tool (populated after handling). */
  commands: Command[];
  /** Whether the event was consumed (prevent further processing). */
  consumed: boolean;
}

// ── Route Builder ──────────────────────────────────────────────────
/**
 * Create an EventRoute from an interaction event and the active tool.
 * This is the skeleton that the InteractionManager will call.
 */
export function createRoute(
  eventType: EventType,
  tool: Tool,
  event: InteractionEvent,
): EventRoute {
  return {
    eventType,
    tool,
    event,
    commands: [],
    consumed: false,
  };
}
