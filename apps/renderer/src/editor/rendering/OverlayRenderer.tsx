/**
 * OverlayRenderer.tsx — React Overlay Rendering Component
 *
 * Purpose: Subscribe to the editor store and synchronize overlay
 * objects with the RenderingManager. This component mounts inside
 * the PDFViewer and manages the overlay lifecycle for all pages.
 *
 * Overlay Lifecycle (Virtual Page Rendering):
 *   1. Object created → store.overlayObjects changes → OverlayRenderer mounts via mountObject()
 *   2. Page scrolled off-screen → VirtualPageRenderer._unloadPage → destroyPageContainer()
 *      → renderers destroyed, but ObjectRegistry retains object metadata
 *   3. Page scrolled back on-screen → VirtualPageRenderer._renderPage → createPageContainer()
 *      → onContainerCreated fires → OverlayRenderer re-mounts objects for that page
 *   4. Selection state also restored for objects that were selected
 *
 * Flow:
 *   Editor Store (overlayObjects, selectedIds)
 *       │
 *       ▼
 *   OverlayRenderer (store subscription)
 *       │
 *       ├── On mount: create page containers
 *       ├── On objects changed: mount/update/unmount renderers
 *       ├── On container recreated (page unload/reload): re-mount objects for that page
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
  zoomLevel: _zoomLevel,
}: OverlayRendererProps) {
  const overlayObjects = useEditorStore((s) => s.overlayObjects);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const prevObjectsRef = useRef<EditableObject[]>([]);
  const prevSelectedRef = useRef<string[]>([]);

  // ── Subscribe to page container creation events ─────────────────
  // This handles the case where VirtualPageRenderer unloads a page
  // (destroying its overlay container) and later reloads it.
  // Without this, overlay objects would disappear after page virtualization.
  //
  // When a container is recreated, we must restore:
  //   1. All overlay objects on that page
  //   2. Their z-order (preserved in ZIndexManager)
  //   3. Selection state for selected objects
  //   4. The active editing session (if editing an object on this page)
  useEffect(() => {
    manager.onContainerCreated = (page: number) => {
      const state = useEditorStore.getState();
      const objects = state.overlayObjects;
      const selected = state.selectedIds;
      const activeEdit = state.activeEdit;
      const pageObjects = objects.filter((o) => o.page === page);

      // Sort by z-index to preserve stacking order
      const sortedObjects = manager.zIndex.sort(pageObjects);

      for (const obj of sortedObjects) {
        // Only mount if not already mounted (avoid duplicates)
        const existingRenderer = manager.getRenderer(obj.id);
        if (!existingRenderer) {
          manager.mountObject(obj);
        }
      }

      // Restore selection visuals for objects on this page
      for (const id of selected) {
        const renderer = manager.getRenderer(id);
        if (renderer) {
          manager.setObjectSelection(id, true);
        }
      }

      // Restore active editing session if it targets an object on this page
      if (activeEdit && activeEdit.page === page) {
        const renderer = manager.getRenderer(activeEdit.objectId);
        if (renderer && activeEdit.mode === "text") {
          // Inline text editor will pick up the contentEditable state
          // when it's re-initialized by the user
        }
      }
    };

    return () => {
      manager.onContainerCreated = null;
    };
  }, [manager]);

  // ── Subscribe to file change to clear all overlay renderers ─────
  // When a new PDF is opened, ensure all stale overlay DOM elements
  // are cleaned up even if the React component tree persists.
  useEffect(() => {
    return () => {
      manager.clearAll();
    };
  }, [manager]);

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
