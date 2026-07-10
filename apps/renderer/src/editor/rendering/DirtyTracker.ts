/**
 * DirtyTracker.ts — Dirty Object Tracking
 *
 * Purpose: Track which objects have been created, updated, deleted,
 * selected, or changed in visibility since the last render pass.
 *
 * This enables the render scheduler to only re-render objects that
 * actually changed, avoiding unnecessary DOM operations.
 *
 * Future: Partial rendering — only update changed CSS properties
 * instead of re-rendering the entire element.
 */

import type { DirtyFlags } from "../types/rendering";

// ── Dirty Tracker ──────────────────────────────────────────────────
export class DirtyTracker {
  /** Map of object ID → dirty flags. */
  private _dirty = new Map<string, DirtyFlags>();

  /** Mark an object as created. */
  markCreated(id: string): void {
    this._dirty.set(id, {
      created: true,
      updated: false,
      deleted: false,
      selected: false,
      visibility: false,
      transform: false,
    });
  }

  /** Mark an object as updated. */
  markUpdated(id: string): void {
    const existing = this._dirty.get(id);
    if (existing) {
      existing.updated = true;
    } else {
      this._dirty.set(id, {
        created: false,
        updated: true,
        deleted: false,
        selected: false,
        visibility: false,
        transform: false,
      });
    }
  }

  /** Mark an object as deleted. */
  markDeleted(id: string): void {
    const existing = this._dirty.get(id);
    if (existing) {
      existing.deleted = true;
    } else {
      this._dirty.set(id, {
        created: false,
        updated: false,
        deleted: true,
        selected: false,
        visibility: false,
        transform: false,
      });
    }
  }

  /** Mark selection state change for an object. */
  markSelectionChanged(id: string): void {
    const existing = this._dirty.get(id);
    if (existing) {
      existing.selected = true;
    } else {
      this._dirty.set(id, {
        created: false,
        updated: false,
        deleted: false,
        selected: true,
        visibility: false,
        transform: false,
      });
    }
  }

  /** Mark visibility change for an object. */
  markVisibilityChanged(id: string): void {
    const existing = this._dirty.get(id);
    if (existing) {
      existing.visibility = true;
    } else {
      this._dirty.set(id, {
        created: false,
        updated: false,
        deleted: false,
        selected: false,
        visibility: true,
        transform: false,
      });
    }
  }

  /** Mark transform (position/size/rotation) change for an object. */
  markTransformChanged(id: string): void {
    const existing = this._dirty.get(id);
    if (existing) {
      existing.transform = true;
    } else {
      this._dirty.set(id, {
        created: false,
        updated: false,
        deleted: false,
        selected: false,
        visibility: false,
        transform: true,
      });
    }
  }

  // ── Queries ──────────────────────────────────────────────────────
  /** Return all dirty object IDs and their flags. */
  getAllDirty(): Map<string, DirtyFlags> {
    return new Map(this._dirty);
  }

  /** Return IDs of objects marked as created. */
  getCreated(): string[] {
    return Array.from(this._dirty.entries())
      .filter(([, flags]) => flags.created)
      .map(([id]) => id);
  }

  /** Return IDs of objects marked as updated. */
  getUpdated(): string[] {
    return Array.from(this._dirty.entries())
      .filter(([, flags]) => flags.updated)
      .map(([id]) => id);
  }

  /** Return IDs of objects marked as deleted. */
  getDeleted(): string[] {
    return Array.from(this._dirty.entries())
      .filter(([, flags]) => flags.deleted)
      .map(([id]) => id);
  }

  /** Return IDs of objects with selection changes. */
  getSelectionChanged(): string[] {
    return Array.from(this._dirty.entries())
      .filter(([, flags]) => flags.selected)
      .map(([id]) => id);
  }

  /** Return IDs of objects with visibility changes. */
  getVisibilityChanged(): string[] {
    return Array.from(this._dirty.entries())
      .filter(([, flags]) => flags.visibility)
      .map(([id]) => id);
  }

  /** Whether there are any dirty objects. */
  get hasDirty(): boolean {
    return this._dirty.size > 0;
  }

  /** Total number of dirty objects. */
  get dirtyCount(): number {
    return this._dirty.size;
  }

  /** Clear all dirty flags — call after a render pass completes. */
  clear(): void {
    this._dirty.clear();
  }
}
