/**
 * FileSerializer.ts — Editor State Serializer
 *
 * Purpose: Serialize overlay objects, editor settings, viewport,
 * selection, and history metadata to a portable JSON format.
 *
 * The serialized format is versioned to support forward/backward
 * compatibility as the application evolves.
 *
 * Serialized state excludes:
 *   - Temporary UI state (hover, interaction phase)
 *   - Runtime-only state (current tool, pending edits)
 *   - Internal manager state
 */

import type { EditableObject } from "../types/objects";
import type { SerializedDocument } from "./types";
import { CURRENT_FORMAT_VERSION } from "./types";

// ── Serializer ─────────────────────────────────────────────────────
export class FileSerializer {
  /**
   * Serialize the current document state to a JSON string.
   *
   * @param overlayObjects - All overlay objects to save.
   * @param metadata - Document metadata.
   * @param editorState - Editor state snapshot (viewport, selection).
   * @returns A JSON string representing the serialized document.
   */
  serialize(
    overlayObjects: EditableObject[],
    metadata: {
      title: string;
      author: string;
      subject: string;
      keywords: string;
    },
    editorState: {
      activePage: number;
      selectedIds: string[];
      activeId: string | null;
      zoomLevel: number;
      pan: { x: number; y: number };
    },
  ): string {
    const document: SerializedDocument = {
      formatVersion: CURRENT_FORMAT_VERSION,
      creator: "Docflow",
      createdAt: Date.now(),
      overlayObjects: this._sanitizeObjects(overlayObjects),
      metadata,
      editorState,
    };

    return JSON.stringify(document, null, 2);
  }

  /**
   * Sanitize objects for serialization — strip runtime-only fields
   * and ensure all required fields are present.
   */
  private _sanitizeObjects(objects: EditableObject[]): EditableObject[] {
    return objects.map((obj) => {
      // Deep clone to avoid mutating the original
      const sanitized = JSON.parse(JSON.stringify(obj)) as EditableObject;

      // Ensure all numerical fields are finite
      // Note: JSON.stringify converts NaN/Infinity to null, which passes isFinite()
      // because isFinite(null) → true (null coerces to 0). So we check !== null explicitly.
      sanitized.position.x = sanitized.position.x !== null && isFinite(sanitized.position.x) ? sanitized.position.x : 0;
      sanitized.position.y = sanitized.position.y !== null && isFinite(sanitized.position.y) ? sanitized.position.y : 0;
      sanitized.size.width = sanitized.size.width !== null && isFinite(sanitized.size.width) ? Math.max(1, sanitized.size.width) : 100;
      sanitized.size.height = sanitized.size.height !== null && isFinite(sanitized.size.height) ? Math.max(1, sanitized.size.height) : 50;
      sanitized.rotation = sanitized.rotation !== null && isFinite(sanitized.rotation) ? sanitized.rotation : 0;
      sanitized.opacity = sanitized.opacity !== null && isFinite(sanitized.opacity) ? Math.max(0, Math.min(1, sanitized.opacity)) : 1;

      return sanitized;
    });
  }
}
