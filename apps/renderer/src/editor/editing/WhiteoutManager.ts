/**
 * WhiteoutManager.ts — Whiteout Manager (Option B)
 *
 * Purpose: Create whiteout overlay objects that cover original PDF
 * text when the user wants to replace it. The original PDF is never
 * modified — a white rectangle covers the old text, and a new
 * editable text object is placed on top.
 *
 * Workflow:
 *   1. User clicks existing PDF text (or manually places a whiteout)
 *   2. System creates a whiteout rectangle matching the target bounds
 *   3. A new editable text object is created on top
 *   4. User edits the replacement text
 *   5. Original PDF remains untouched underneath
 *
 * Future: Automatic PDF text detection will provide precise bounds.
 * For now, the whiteout is placed at the click position with
 * configurable dimensions.
 */

import type { Point } from "../types/editor";
import type { EditableObject } from "../types/objects";
import { ObjectType } from "../types/objects";
import type { WhiteoutObject } from "../types/editing";
import { generateId } from "../utils/id";
import { useEditorStore } from "../state/editorStore";

// ── Whiteout Manager ───────────────────────────────────────────────
export class WhiteoutManager {
  /**
   * Create a whiteout overlay at the given position, then create a
   * new editable text object on top of it.
   *
   * @param page - The page number.
   * @param position - Top-left corner of the replacement area.
   * @param size - Dimensions of the replacement area.
   * @returns The ID of the newly created text object.
   */
  createReplacement(
    page: number,
    position: Point,
    size: { width: number; height: number },
  ): string {
    const store = useEditorStore.getState();

    // Create whiteout object
    const now = Date.now();
    const whiteoutId = `whiteout_${generateId()}`;
    const whiteout: WhiteoutObject = {
      id: whiteoutId,
      type: "whiteout",
      page,
      position: { ...position },
      size: { ...size },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: false,
      createdAt: now,
      updatedAt: now,
      data: {
        fillColor: "#ffffff",
        cornerRadius: 0,
      },
    };

    store.addOverlayObject(whiteout as unknown as EditableObject);

    // Create text object on top
    const textId = `text_${generateId()}`;
    const padding = 8;
    const textObject = {
      id: textId,
      type: ObjectType.Text,
      page,
      position: { x: position.x + padding, y: position.y + padding },
      size: {
        width: Math.max(20, size.width - padding * 2),
        height: Math.max(20, size.height - padding * 2),
      },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        content: "",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color: "#000000",
        textAlign: "left",
        lineHeight: 1.4,
      },
    } as EditableObject;

    store.addOverlayObject(textObject);
    store.setSelectedIds([textId]);
    store.setActiveId(textId);

    return textId;
  }

  /**
   * Check if an object is a whiteout overlay.
   */
  isWhiteout(object: Record<string, unknown>): boolean {
    return object.type === "whiteout";
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const whiteoutManager = new WhiteoutManager();
