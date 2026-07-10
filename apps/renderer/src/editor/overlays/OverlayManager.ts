/**
 * OverlayManager.ts — Overlay Manager
 *
 * Purpose: Manage editable overlay objects (text, images, shapes,
 * drawings, highlights, signatures, stamps) — their lifecycle,
 * lookup, and future render-ordering and z-index management.
 *
 * The OverlayManager is the single source of truth for what
 * overlay objects exist in the document. It does NOT render
 * them — it only manages the data model.
 *
 * Future expansion (V2–V4):
 *   - Render ordering / z-index
 *   - Grouping / ungrouping
 *   - Batch operations
 *   - Serialization / deserialization
 */

import type { EditableObject, CreateObjectParams, ObjectType } from "../types/objects";
import { generateId } from "../utils/id";

// ── Overlay Manager ────────────────────────────────────────────────
export class OverlayManager {
  /** All overlay objects across all pages, indexed by ID for fast lookup. */
  private _objectsById = new Map<string, EditableObject>();
  /** Objects grouped by page number for page-specific iteration. */
  private _objectsByPage = new Map<number, EditableObject[]>();

  // ── Lifecycle Methods ────────────────────────────────────────────
  /**
   * Create and register a new overlay object from the given params.
   * Returns the newly created object with auto-generated fields filled in.
   */
  createObject(params: CreateObjectParams): EditableObject {
    const now = Date.now();
    const object: EditableObject = {
      id: `obj_${generateId()}`,
      type: params.type as ObjectType,
      page: params.page,
      position: { ...params.position },
      size: { ...params.size },
      rotation: params.rotation ?? 0,
      opacity: params.opacity ?? 1,
      locked: params.locked ?? false,
      visible: params.visible ?? true,
      selected: false,
      createdAt: now,
      updatedAt: now,
      data: params.data ?? {},
    } as EditableObject;

    this._add(object);
    return object;
  }

  /** Register an already-constructed object. */
  addObject(object: EditableObject): void {
    this._add(object);
  }

  /** Remove an object by ID. Returns true if found and removed. */
  removeObject(id: string): boolean {
    const existing = this._objectsById.get(id);
    if (!existing) return false;

    this._objectsById.delete(id);
    const pageList = this._objectsByPage.get(existing.page);
    if (pageList) {
      const idx = pageList.findIndex((o) => o.id === id);
      if (idx >= 0) {
        pageList.splice(idx, 1);
        if (pageList.length === 0) {
          this._objectsByPage.delete(existing.page);
        }
      }
    }
    return true;
  }

  /**
   * Update properties on an existing object.
   * Returns the updated object, or null if not found.
   */
  updateObject(id: string, changes: Partial<EditableObject>): EditableObject | null {
    const existing = this._objectsById.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...changes, updatedAt: Date.now() } as EditableObject;
    this._objectsById.set(id, updated);

    // Update the reference in the page list.
    const pageList = this._objectsByPage.get(existing.page);
    if (pageList) {
      const idx = pageList.findIndex((o) => o.id === id);
      if (idx >= 0) {
        pageList[idx] = updated;
      }
    }
    return updated;
  }

  // ── Lookups ──────────────────────────────────────────────────────
  /** Get a single object by ID, or null. */
  getById(id: string): EditableObject | null {
    return this._objectsById.get(id) ?? null;
  }

  /** Get all overlay objects on a given page. */
  getByPage(page: number): EditableObject[] {
    return this._objectsByPage.get(page) ?? [];
  }

  /** Get all overlay objects across all pages. */
  getAll(): EditableObject[] {
    return Array.from(this._objectsById.values());
  }

  /** Total count of overlay objects. */
  get count(): number {
    return this._objectsById.size;
  }

  // ── Bulk Operations ──────────────────────────────────────────────
  /** Remove all objects from all pages. */
  clear(): void {
    this._objectsById.clear();
    this._objectsByPage.clear();
  }

  // ── Private ──────────────────────────────────────────────────────
  private _add(object: EditableObject): void {
    this._objectsById.set(object.id, object);

    let pageList = this._objectsByPage.get(object.page);
    if (!pageList) {
      pageList = [];
      this._objectsByPage.set(object.page, pageList);
    }
    pageList.push(object);
  }
}
