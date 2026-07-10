/**
 * selectors.ts — Editor Store Selectors
 *
 * Purpose: Provide memoizable selector hooks that let components
 * subscribe to slices of the editor store without re-rendering
 * on unrelated changes.
 */

import { useEditorStore } from "./editorStore";
import type { EditableObject } from "../types/objects";

// ── Object Lookups ─────────────────────────────────────────────────
/** Selector: return the overlay object with the given ID. */
export function useOverlayObjectById(id: string | null): EditableObject | null {
  return useEditorStore(
    (state) =>
      id ? state.overlayObjects.find((o) => o.id === id) ?? null : null,
  );
}

/** Selector: return all overlay objects on a given page. */
export function useOverlayObjectsByPage(page: number): EditableObject[] {
  return useEditorStore(
    (state) => state.overlayObjects.filter((o) => o.page === page),
  );
}

/** Selector: return currently selected overlay objects. */
export function useSelectedObjects(): EditableObject[] {
  return useEditorStore((state) =>
    state.overlayObjects.filter((o) => state.selectedIds.includes(o.id)),
  );
}

// ── Boolean Flags ──────────────────────────────────────────────────
export function useIsEditing(): boolean {
  return useEditorStore((state) => state.mode === "edit");
}

export function useHasSelection(): boolean {
  return useEditorStore((state) => state.selectedIds.length > 0);
}

export function useIsToolActive(toolType: string): boolean {
  return useEditorStore((state) => state.activeTool === toolType);
}

// ── Derived Values ─────────────────────────────────────────────────
export function useObjectCount(): number {
  return useEditorStore((state) => state.overlayObjects.length);
}

export function useObjectCountByPage(page: number): number {
  return useEditorStore(
    (state) => state.overlayObjects.filter((o) => o.page === page).length,
  );
}
