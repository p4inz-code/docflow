/**
 * OverlayRenderer.tsx — React Overlay Rendering Component
 *
 * Purpose: Subscribe to the editor store and synchronize overlay
 * objects with the RenderingManager. This component mounts inside
 * the PDFViewer and manages the overlay lifecycle for all pages.
 *
 * Flow:
 *   Editor Store (overlayObjects, selectedIds)
 *       │
 *       ▼
 *   OverlayRenderer (store subscription)
 *       │
 *       ├── On mount: create page containers
 *       ├── On objects changed: mount/update/unmount renderers
 *       └── On selection changed: update selection visuals
 */

import { useEffect, useRef } from "react";
import { useEditorStore } from "../state/editorStore";
import type { RenderingManager } from "./RenderingManager";
import type { EditableObject } from "../types/objects";

// ── Props ──────────────────────────────────────────────────────────
export interface OverlayRendererProps {
  /** The rendering manager instance. */
  manager: RenderingManager;
  /** Total number of PDF pages. */
  pageCount: number;
  /** Function to get page wrapper elements by page index. */
  getPageWrapper: (pageIndex: number) => HTMLElement | null;
  /** Current zoom level (for scale calculations). */
  zoomLevel: number;
}

// ── Overlay Renderer Component ─────────────────────────────────────
/**
 * This component does not render any visible JSX.
 * It manages overlay DOM elements imperatively through the
 * RenderingManager, keeping them synchronized with the editor store.
 */
export function OverlayRenderer({
  manager,
  pageCount,
  getPageWrapper,
  zoomLevel: _zoomLevel,
}: OverlayRendererProps) {
  const overlayObjects = useEditorStore((s) => s.overlayObjects);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const prevObjectsRef = useRef<EditableObject[]>([]);
  const prevSelectedRef = useRef<string[]>([]);
  const initializedRef = useRef(false);

  // ── Synchronize objects ─────────────────────────────────────────
  useEffect(() => {
    const prevObjects = prevObjectsRef.current;
    const prevIds = new Set(prevObjects.map((o) => o.id));
    const currentIds = new Set(overlayObjects.map((o) => o.id));

    // Objects to remove (in prev but not in current)
    for (const prev of prevObjects) {
      if (!currentIds.has(prev.id)) {
        manager.unmountObject(prev.id);
      }
    }

    // Objects to add or update (in current)
    for (const obj of overlayObjects) {
      if (!prevIds.has(obj.id)) {
        manager.mountObject(obj);
      } else {
        const prev = prevObjects.find((o) => o.id === obj.id);
        if (prev && hasObjectChanged(prev, obj)) {
          manager.updateObject(obj.id, obj);
        }
      }
    }

    prevObjectsRef.current = overlayObjects;
  }, [overlayObjects, manager]);

  // ── Synchronize selection state ──────────────────────────────────
  useEffect(() => {
    const prevSet = new Set(prevSelectedRef.current);
    const currentSet = new Set(selectedIds);

    // Deselect objects that are no longer selected
    for (const id of prevSelectedRef.current) {
      if (!currentSet.has(id)) {
        manager.setObjectSelection(id, false);
      }
    }

    // Select newly selected objects
    for (const id of selectedIds) {
      if (!prevSet.has(id)) {
        manager.setObjectSelection(id, true);
      }
    }

    prevSelectedRef.current = selectedIds;
  }, [selectedIds, manager]);

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────
function hasObjectChanged(a: EditableObject, b: EditableObject): boolean {
  return (
    a.position.x !== b.position.x ||
    a.position.y !== b.position.y ||
    a.size.width !== b.size.width ||
    a.size.height !== b.size.height ||
    a.rotation !== b.rotation ||
    a.opacity !== b.opacity ||
    a.visible !== b.visible ||
    a.selected !== b.selected ||
    JSON.stringify(a.data) !== JSON.stringify(b.data)
  );
}
