/**
 * FileDeserializer.ts — Editor State Deserializer
 *
 * Purpose: Restore editor state from the serialized JSON format.
 * Handles version compatibility checking and gracefully rejects
 * unsupported format versions.
 *
 * Restoration includes:
 *   - Overlay objects
 *   - Editor settings
 *   - Viewport state
 *   - Document metadata
 *   - Selection state (where appropriate)
 */

import type { EditableObject } from "../types/objects";
import type { SerializedDocument } from "./types";
import { ExportErrorCategory, createExportError } from "./types";
import type { ExportError } from "./types";

// ── Deserialization Result ─────────────────────────────────────────
export interface DeserializationResult {
  /** The deserialized document, or null if deserialization failed. */
  document: SerializedDocument | null;
  /** Whether deserialization succeeded. */
  success: boolean;
  /** Any errors that occurred. */
  errors: ExportError[];
}

// ── Deserializer ───────────────────────────────────────────────────
export class FileDeserializer {
  private readonly MIN_SUPPORTED_VERSION = 1;
  private readonly MAX_SUPPORTED_VERSION = 1;

  /**
   * Deserialize a JSON string back into a document state.
   *
   * @param json - The JSON string to deserialize.
   * @returns Deserialization result with the restored document or errors.
   */
  deserialize(json: string): DeserializationResult {
    const errors: ExportError[] = [];

    try {
      const parsed = JSON.parse(json);

      // Validate basic structure
      if (!parsed || typeof parsed !== "object") {
        errors.push(
          createExportError(
            ExportErrorCategory.Deserialization,
            "Invalid document format: expected a JSON object",
            false,
          ),
        );
        return { document: null, success: false, errors };
      }

      const doc = parsed as SerializedDocument;

      // Check format version
      if (typeof doc.formatVersion !== "number") {
        errors.push(
          createExportError(
            ExportErrorCategory.Deserialization,
            "Invalid document format: missing formatVersion",
            false,
          ),
        );
        return { document: null, success: false, errors };
      }

      if (
        doc.formatVersion < this.MIN_SUPPORTED_VERSION ||
        doc.formatVersion > this.MAX_SUPPORTED_VERSION
      ) {
        errors.push(
          createExportError(
            ExportErrorCategory.Deserialization,
            `Unsupported document format version: ${doc.formatVersion}. ` +
            `Supported versions: ${this.MIN_SUPPORTED_VERSION}–${this.MAX_SUPPORTED_VERSION}`,
            false,
            { formatVersion: doc.formatVersion },
          ),
        );
        return { document: null, success: false, errors };
      }

      // Validate required fields
      if (!Array.isArray(doc.overlayObjects)) {
        errors.push(
          createExportError(
            ExportErrorCategory.Deserialization,
            "Invalid document format: missing overlayObjects array",
            false,
          ),
        );
        return { document: null, success: false, errors };
      }

      // Restore default values for any missing fields on objects
      doc.overlayObjects = (doc.overlayObjects as unknown as Record<string, unknown>[]).map((obj: Record<string, unknown>) => ({
        id: obj.id ?? "",
        type: obj.type ?? "text",
        page: (obj.page as number) ?? 1,
        position: (obj.position as { x: number; y: number }) ?? { x: 0, y: 0 },
        size: (obj.size as { width: number; height: number }) ?? { width: 100, height: 50 },
        rotation: (obj.rotation as number) ?? 0,
        opacity: (obj.opacity as number) ?? 1,
        locked: (obj.locked as boolean) ?? false,
        visible: (obj.visible as boolean) ?? true,
        selected: false, // Always deselect on load
        createdAt: (obj.createdAt as number) ?? Date.now(),
        updatedAt: (obj.updatedAt as number) ?? Date.now(),
        data: (obj.data as Record<string, unknown>) ?? {},
      })) as EditableObject[];

      return {
        document: doc,
        success: true,
        errors: [],
      };
    } catch (err) {
      errors.push(
        createExportError(
          ExportErrorCategory.Deserialization,
          `Failed to parse document: ${err instanceof Error ? err.message : String(err)}`,
          false,
        ),
      );
      return { document: null, success: false, errors };
    }
  }
}
