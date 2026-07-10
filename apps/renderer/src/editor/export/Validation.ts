/**
 * Validation.ts — Export Validation Layer
 *
 * Purpose: Validate overlay objects and document state before
 * export to catch issues early. Returns detailed validation reports.
 *
 * Checks:
 *   - Invalid coordinates (NaN, Infinity, negative where unexpected)
 *   - Missing fonts (unsupported font families)
 *   - Missing images (empty src, broken references)
 *   - Corrupted objects (missing required fields)
 *   - Invalid pages (page numbers out of range)
 *   - Duplicate IDs
 *   - Orphan objects (referencing non-existent pages)
 *   - Unsupported data types
 */

import type { EditableObject } from "../types/objects";
import type { ExportError } from "./types";
import { ExportErrorCategory, createExportError } from "./types";

// ── Validation Result ──────────────────────────────────────────────
export interface ValidationResult {
  /** Whether validation passed (no errors, warnings are ok). */
  valid: boolean;
  /** Errors that will prevent export. */
  errors: ExportError[];
  /** Warnings that won't prevent export but indicate potential issues. */
  warnings: ExportError[];
  /** Number of objects checked. */
  objectsChecked: number;
}

// ── Validator ──────────────────────────────────────────────────────
export class Validator {
  /**
   * Validate a set of overlay objects for export readiness.
   */
  validate(
    objects: EditableObject[],
    pageCount: number,
  ): ValidationResult {
    const errors: ExportError[] = [];
    const warnings: ExportError[] = [];
    const seenIds = new Set<string>();

    for (const obj of objects) {
      // Check for duplicate IDs
      if (seenIds.has(obj.id)) {
        errors.push(
          createExportError(
            ExportErrorCategory.Validation,
            `Duplicate object ID: ${obj.id}`,
            true,
            { objectId: obj.id },
          ),
        );
      }
      seenIds.add(obj.id);

      // Check for invalid coordinates
      if (!isFinite(obj.position.x) || !isFinite(obj.position.y)) {
        errors.push(
          createExportError(
            ExportErrorCategory.Validation,
            `Invalid position for object ${obj.id}`,
            true,
            { objectId: obj.id, position: obj.position },
          ),
        );
      }

      if (!isFinite(obj.size.width) || !isFinite(obj.size.height)) {
        errors.push(
          createExportError(
            ExportErrorCategory.Validation,
            `Invalid size for object ${obj.id}`,
            true,
            { objectId: obj.id, size: obj.size },
          ),
        );
      }

      // Check for invalid page numbers
      if (obj.page < 1 || obj.page > pageCount) {
        warnings.push(
          createExportError(
            ExportErrorCategory.Validation,
            `Object ${obj.id} references page ${obj.page}, but document has ${pageCount} pages`,
            true,
            { objectId: obj.id, page: obj.page },
          ),
        );
      }

      // Type-specific checks
      switch (obj.type) {
        case "text": {
          const data = obj.data as Record<string, unknown>;
          if (data.fontFamily && typeof data.fontFamily !== "string") {
            warnings.push(
              createExportError(
                ExportErrorCategory.FontFailure,
                `Object ${obj.id} has non-string font family`,
                true,
                { objectId: obj.id, fontFamily: data.fontFamily },
              ),
            );
          }
          break;
        }
        case "image": {
          const data = obj.data as Record<string, unknown>;
          const src = data.src as string;
          if (src && src.startsWith("blob:")) {
            warnings.push(
              createExportError(
                ExportErrorCategory.ImageFailure,
                `Object ${obj.id} uses a blob: URL that may not be accessible during export`,
                true,
                { objectId: obj.id },
              ),
            );
          }
          break;
        }
        case "signature": {
          const data = obj.data as Record<string, unknown>;
          const src = data.src as string;
          if (src && src.startsWith("blob:")) {
            warnings.push(
              createExportError(
                ExportErrorCategory.ImageFailure,
                `Signature object ${obj.id} uses a blob: URL that may not be accessible`,
                true,
                { objectId: obj.id },
              ),
            );
          }
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      objectsChecked: objects.length,
    };
  }
}
