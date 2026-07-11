/**
 * StampTool.ts — Stamp Tool
 *
 * Purpose: Create document stamp objects (e.g. "APPROVED", "DRAFT",
 * "CONFIDENTIAL") that simulate physical document stamps with
 * coloured borders and semi-transparent fills.
 *
 * Capabilities:
 *   - Preset stamps: Approved, Rejected, Draft, Confidential,
 *     Paid, Received
 *   - Custom text stamps
 *   - Choose stamp color from presets
 *   - Rotation, opacity, resize support
 *   - Undo, duplicate support
 *   - Export flattening
 *
 * Flow:
 *   1. User clicks on page → creates StampObject with current preset
 *   2. Stamp renders as styled div with coloured border + text
 *   3. User can move/resize/rotate via SelectTool handles
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import { ObjectType } from "../../types/objects";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { generateId } from "../../utils/id";
import type { EditableObject } from "../../types/objects";
import { commandPipeline } from "../../core/CommandPipeline";
import { CreateObjectCommand } from "../../commands/CreateObjectCommand";

const DEFAULT_STAMP_WIDTH = 140;
const DEFAULT_STAMP_HEIGHT = 60;

export interface StampPreset {
  name: string;
  label: string;
  color: string;
}

export const STAMP_PRESETS: StampPreset[] = [
  { name: "approved", label: "APPROVED", color: "#2e7d32" },
  { name: "rejected", label: "REJECTED", color: "#c62828" },
  { name: "draft", label: "DRAFT", color: "#f57f17" },
  { name: "confidential", label: "CONFIDENTIAL", color: "#d32f2f" },
  { name: "paid", label: "PAID", color: "#2e7d32" },
  { name: "received", label: "RECEIVED", color: "#1565c0" },
];

export class StampTool implements Tool {
  readonly type = ToolType.Stamp;
  readonly label = "Stamp";
  readonly shortcut = "p"; // 's' used by SignatureTool
  readonly cursor = CursorStyle.Crosshair;

  /** Currently selected stamp preset. */
  activePreset: StampPreset = STAMP_PRESETS[0];
  /** Custom text override (if set, overrides preset label). */
  customText: string = "";

  private _page: number = 1;

  onActivate(): void {
    document.body.style.cursor = "crosshair";
  }

  onDeactivate(): void {
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    this._page = store.activePage;
    this._createStamp(event.point.x, event.point.y);
  }

  onPointerMove(_event: InteractionEvent): void {
    // No-op: stamp placement is click-only
  }

  onPointerUp(_event: InteractionEvent): void {
    // No-op
  }

  onDoubleClick(_event: InteractionEvent): void {
    // No-op
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      // Cancel pending
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _createStamp(x: number, y: number): void {
    const now = Date.now();
    const newId = `stamp_${generateId()}`;

    const stampText = this.customText || this.activePreset.label;

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Stamp,
      page: this._page,
      position: { x, y },
      size: {
        width: DEFAULT_STAMP_WIDTH,
        height: DEFAULT_STAMP_HEIGHT,
      },
      rotation: -15, // Slight rotation for realistic stamp look
      opacity: 0.8,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        presetName: this.activePreset.name,
        text: stampText,
        color: this.activePreset.color,
      },
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }
}
