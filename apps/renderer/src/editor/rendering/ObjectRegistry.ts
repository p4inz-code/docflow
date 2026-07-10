/**
 * ObjectRegistry.ts — Object Registry
 *
 * Purpose: Central registry for overlay objects with efficient
 * lookups by ID, page, type, and selection state.
 *
 * Future expansion (V2–V4):
 *   - Grouping / ungrouping queries
 *   - Layer-based queries
 *   - Spatial indexing for fast hit-testing
 */

import type { EditableObject, ObjectType } from "../types/objects";
import type { Rect } from "../types/editor";

// ── Object Registry ────────────────────────────────────────────────
export class ObjectRegistry {
  /** All objects indexed by ID. */
  private _byId = new Map<string, EditableObject>();
  /** Objects grouped by page number. */
  private _byPage = new Map<number, EditableObject[]>();
  /** Objects grouped by type. */
  private _byType = new Map<ObjectType, EditableObject[]>();
  /** Currently selected object IDs (ordered by selection time). */
  private _selectedIds: string[] = [];
  /** Last assigned render order counter. */
  private _zCounter = 0;

  // ── Registration ────────────────────────────────────────────────
  /** Register a new object. */
  register(object: EditableObject): void {
    this._byId.set(object.id, object);
    this._addToPageList(object);
    this._addToTypeList(object);
  }

  /** Unregister an object by ID. */
  unregister(id: string): boolean {
    const obj = this._byId.get(id);
    if (!obj) return false;

    this._byId.delete(id);
    this._removeFromPageList(obj);
    this._removeFromTypeList(obj);
    this._selectedIds = this._selectedIds.filter((sid) => sid !== id);
    return true;
  }

  /** Clear all registered objects. */
  clear(): void {
    this._byId.clear();
    this._byPage.clear();
    this._byType.clear();
    this._selectedIds = [];
    this._zCounter = 0;
  }

  // ── Lookups ──────────────────────────────────────────────────────
  /** Get an object by ID, or null. */
  getById(id: string): EditableObject | null {
    return this._byId.get(id) ?? null;
  }

  /** Get all objects on a given page. */
  getByPage(page: number): EditableObject[] {
    return this._byPage.get(page) ?? [];
  }

  /** Get all objects of a given type. */
  getByType(type: ObjectType): EditableObject[] {
    return this._byType.get(type) ?? [];
  }

  /** Get all registered objects. */
  getAll(): EditableObject[] {
    return Array.from(this._byId.values());
  }

  /** Get all selected objects. */
  getSelected(): EditableObject[] {
    return this._selectedIds
      .map((id) => this._byId.get(id))
      .filter((o): o is EditableObject => o != null);
  }

  /** Get IDs of selected objects. */
  get selectedIds(): string[] {
    return [...this._selectedIds];
  }

  // ── Selection Tracking ───────────────────────────────────────────
  /** Mark an object as selected. */
  select(id: string): void {
    if (!this._selectedIds.includes(id)) {
      this._selectedIds.push(id);
    }
  }

  /** Unmark an object as selected. */
  deselect(id: string): void {
    this._selectedIds = this._selectedIds.filter((sid) => sid !== id);
  }

  /** Clear all selection. */
  clearSelection(): void {
    this._selectedIds = [];
  }

  // ── Counts ───────────────────────────────────────────────────────
  get totalCount(): number {
    return this._byId.size;
  }

  get selectedCount(): number {
    return this._selectedIds.length;
  }

  pageCount(page: number): number {
    return this._byPage.get(page)?.length ?? 0;
  }

  // ── Render Order ─────────────────────────────────────────────────
  /** Get the next render order value (ascending for later rendering). */
  nextZIndex(): number {
    return this._zCounter++;
  }

  /** Sort objects by their render order (stable insertion order). */
  sortByRenderOrder(objects: EditableObject[]): EditableObject[] {
    return [...objects];
  }

  // ── Bounding Box ─────────────────────────────────────────────────
  /** Compute the union bounding rect for all objects on a page. */
  getPageBounds(page: number): Rect | null {
    const objects = this.getByPage(page);
    if (objects.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const obj of objects) {
      minX = Math.min(minX, obj.position.x);
      minY = Math.min(minY, obj.position.y);
      maxX = Math.max(maxX, obj.position.x + obj.size.width);
      maxY = Math.max(maxY, obj.position.y + obj.size.height);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  // ── Private Helpers ──────────────────────────────────────────────
  private _addToPageList(object: EditableObject): void {
    let list = this._byPage.get(object.page);
    if (!list) {
      list = [];
      this._byPage.set(object.page, list);
    }
    list.push(object);
  }

  private _removeFromPageList(object: EditableObject): void {
    const list = this._byPage.get(object.page);
    if (list) {
      const idx = list.findIndex((o) => o.id === object.id);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) this._byPage.delete(object.page);
    }
  }

  private _addToTypeList(object: EditableObject): void {
    let list = this._byType.get(object.type);
    if (!list) {
      list = [];
      this._byType.set(object.type, list);
    }
    list.push(object);
  }

  private _removeFromTypeList(object: EditableObject): void {
    const list = this._byType.get(object.type);
    if (list) {
      const idx = list.findIndex((o) => o.id === object.id);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) this._byType.delete(object.type);
    }
  }
}
