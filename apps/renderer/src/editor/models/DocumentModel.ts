/**
 * DocumentModel.ts — Document Model
 *
 * Purpose: Provide a high-level abstraction over the document
 * structure. In the future this will coordinate layers, pages,
 * and the object tree.
 *
 * Currently a placeholder that documents the intended shape.
 * V2–V4 will add page management, object tree traversal, and
 * serialization.
 */

import type { EditableObject } from "../types/objects";
import type { PageLayerState } from "./layers";

/**
 * Document model — conceptual owner of the document state.
 *
 * Responsibilities (future):
 *  - Maintain the list of pages and their layer states.
 *  - Provide lookups by page and object ID.
 *  - Handle import / export of the editing document format.
 */
export interface DocumentModel {
  /** Total number of pages in the document. */
  readonly pageCount: number;
  /** Layer state for each page. */
  readonly pageLayers: Map<number, PageLayerState>;
  /** All overlay objects across all pages (indexed by ID). */
  readonly objectsById: Map<string, EditableObject>;
}
