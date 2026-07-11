/**
 * InteractionManager.ts — Interaction Manager
 *
 * Purpose: Receive raw DOM events from the viewer / editor surface,
 * normalize them into InteractionEvents, and route them to the
 * currently active tool via the ToolManager.
 *
 * Future responsibility:
 *
 *   DOM Event
 *       │
 *       ▼
 *   normalize(event)   ──→  InteractionEvent
 *       │
 *       ▼
 *   route(event)       ──→  ActiveTool.onPointerDown/Move/Up(event)
 *       │
 *       ▼
 *   Tool returns Command(s) → CommandManager.execute()
 *
 * This file defines the normalization and routing infrastructure.
 * Actual DOM attachment will be done in the viewer component.
 */

import type { InteractionEvent, EventType } from "../types/interaction";
import { EventType as EventTypeConst } from "../types/interaction";
import type { InteractionPhase } from "../types/editor";
import { InteractionPhase as InteractionPhaseConst } from "../types/editor";
import type { ToolManager } from "../tools/ToolSystem";

// ── Interaction Manager ────────────────────────────────────────────
export class InteractionManager {
  private _toolManager: ToolManager;
  private _currentPhase: InteractionPhase = InteractionPhaseConst.Idle;

  constructor(toolManager: ToolManager) {
    this._toolManager = toolManager;
  }

  // ── Event Normalization ──────────────────────────────────────────
  /**
   * Convert a raw DOM PointerEvent into a normalized InteractionEvent.
   * This hides browser quirks from every tool implementation.
   */
  normalizePointerEvent(
    event: PointerEvent,
    pagePoint: { x: number; y: number },
  ): InteractionEvent {
    return {
      point: pagePoint,
      clientPoint: { x: event.clientX, y: event.clientY },
      button: event.button,
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      phase: this._currentPhase,
      delta: undefined,
      defaultPrevented: event.defaultPrevented,
      originalEvent: event,
      timestamp: Date.now(),
    };
  }

  /**
   * Convert a raw DOM WheelEvent into a normalized InteractionEvent.
   */
  normalizeWheelEvent(
    event: WheelEvent,
    pagePoint: { x: number; y: number },
  ): InteractionEvent {
    return {
      point: pagePoint,
      clientPoint: { x: event.clientX, y: event.clientY },
      button: -1,
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      phase: this._currentPhase,
      delta: { x: event.deltaX, y: event.deltaY },
      defaultPrevented: event.defaultPrevented,
      originalEvent: event,
      timestamp: Date.now(),
    };
  }

  /**
   * Convert a raw DOM KeyboardEvent into a normalized InteractionEvent.
   */
  normalizeKeyboardEvent(event: KeyboardEvent): InteractionEvent {
    return {
      point: { x: 0, y: 0 },
      clientPoint: { x: 0, y: 0 },
      button: -1,
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      phase: this._currentPhase,
      delta: undefined,
      defaultPrevented: event.defaultPrevented,
      originalEvent: event,
      timestamp: Date.now(),
    };
  }

  // ── Event Routing ────────────────────────────────────────────────
  /**
   * Route a normalized InteractionEvent to the active tool.
   * Returns the route object that was created (for debugging / testing).
   */
  route(eventType: EventType, event: InteractionEvent): void {
    const tool = this._toolManager.activeTool;
    if (!tool) return;

    switch (eventType) {
      case EventTypeConst.PointerDown:
        tool.onPointerDown(event);
        break;
      case EventTypeConst.PointerMove:
        tool.onPointerMove(event);
        break;
      case EventTypeConst.PointerUp:
        tool.onPointerUp(event);
        break;
      case EventTypeConst.DoubleClick:
        tool.onDoubleClick(event);
        break;
      case EventTypeConst.Wheel:
        tool.onWheel(event);
        break;
      case EventTypeConst.KeyDown:
        tool.onKeyDown(event.originalEvent as KeyboardEvent);
        break;
      case EventTypeConst.KeyUp:
        tool.onKeyUp(event.originalEvent as KeyboardEvent);
        break;
    }
  }

  // ── Phase Management ─────────────────────────────────────────────
  /** Update the current interaction phase (called by event handlers). */
  setPhase(phase: InteractionPhase): void {
    this._currentPhase = phase;
  }

  get phase(): InteractionPhase {
    return this._currentPhase;
  }
}
