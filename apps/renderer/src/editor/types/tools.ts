/**
 * tools.ts — Tool System Types
 *
 * Purpose: Define the enum of built-in tool names and the interface
 * that every tool must implement.
 *
 * Tools are stateless strategy objects: they receive interaction
 * events from the InteractionManager and return commands that the
 * CommandManager executes. This keeps tools pure and testable.
 */

import type { CursorStyle } from "./editor";
import type { EditableObject } from "./objects";
import type { InteractionEvent } from "./interaction";

// ── Tool Identifiers ───────────────────────────────────────────────
export const ToolType = {
  Hand: "hand",
  Select: "select",
  Text: "text",
  Image: "image",
  Shape: "shape",
  Draw: "draw",
  Highlight: "highlight",
  Erase: "erase",
  Signature: "signature",
  Stamp: "stamp",
} as const;

export type ToolType = (typeof ToolType)[keyof typeof ToolType];

// ── Tool Interface ─────────────────────────────────────────────────
/**
 * Every tool exposes the same lifecycle. The InteractionManager
 * calls these hooks as DOM events are dispatched.
 *
 * Methods return void — tools dispatch their results via a
 * callback or mutation of the editor store (future wiring).
 *
 * For now the interface is defined so that V2–V4 can implement
 * concrete behaviors without changing the contract.
 */
export interface Tool {
  /** Unique identifier for this tool. */
  readonly type: ToolType;
  /** Human-readable label (e.g. for a toolbar tooltip). */
  readonly label: string;
  /** Optional keyboard shortcut (e.g. "v", "h", "t"). */
  readonly shortcut?: string;
  /** Cursor to show when this tool is active. */
  readonly cursor: CursorStyle;

  // ── Lifecycle hooks ────────────────────────────────────────────
  /** Called when the tool becomes active. */
  onActivate(): void;
  /** Called when the tool is deactivated (another tool selected). */
  onDeactivate(): void;

  // ── Interaction event handlers ─────────────────────────────────
  onPointerDown(event: InteractionEvent): void;
  onPointerMove(event: InteractionEvent): void;
  onPointerUp(event: InteractionEvent): void;
  onDoubleClick(event: InteractionEvent): void;
  onWheel(event: InteractionEvent): void;

  // ── Keyboard handlers ──────────────────────────────────────────
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;
}

// ── Tool Registration ──────────────────────────────────────────────
export interface ToolDefinition {
  type: ToolType;
  factory: () => Tool;
}
