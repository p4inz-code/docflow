/**
 * editorStore.ts — Zustand Editor Store
 *
 * Purpose: Central state management for the editing engine.
 * Manages tool selection, object selection, interaction state,
 * clipboard, editing state, and placeholder slots for future features.
 *
 * Viewer state (zoom, pan, fit mode) remains in PDFViewer and
 * is intentionally independent of the editor store.
 */

import { create } from "zustand";
import type { EditorMode } from "../types/editor";
import { EditorMode as EditorModeConst } from "../types/editor";
import type { ToolType } from "../types/tools";
import { ToolType as ToolTypeConst } from "../types/tools";
import type { InteractionPhase } from "../types/editor";
import type { SelectionState } from "../types/selection";
import type { EditableObject } from "../types/objects";
import type { HistoryState } from "../types/history";
import type { EditingMode, ActiveEdit } from "../types/editing";

// ── Store Shape ────────────────────────────────────────────────────
export interface EditorState {
  // ── Mode & Tool ──
  /** Top-level editing mode (view | edit). */
  mode: EditorMode;
  /** ID of the currently active tool. */
  activeTool: ToolType;
  /** Previously active tool (for quick toggle, e.g. hand <-> select). */
  previousTool: ToolType | null;

  // ── Selection ──
  /** IDs of currently selected objects. */
  selectedIds: string[];
  /** ID of the most recently selected / clicked object. */
  activeId: string | null;
  /** Selection rectangle drag (marquee) state. */
  marquee: SelectionState["marquee"];

  // ── Hover ──
  /** ID of the object the pointer is currently over. */
  hoveredObjectId: string | null;

  // ── Active Page ──
  /** 1-based index of the current active page. */
  activePage: number;

  // ── Clipboard ──
  /** Serialised objects held for paste / duplicate. */
  clipboard: EditableObject[] | null;

  // ── Interaction State ──
  /** Current phase of the active pointer gesture. */
  interactionPhase: InteractionPhase;
  /** Whether the editor is currently processing an interaction. */
  isInteracting: boolean;

  // ── Overlay Objects (managed by OverlayManager) ──
  /** All editable objects across all pages. */
  overlayObjects: EditableObject[];

  // ── Editing State ──
  /** Current editing mode (none, text, moving, resizing, rotating). */
  editingMode: EditingMode;
  /** Active editing session details. */
  activeEdit: ActiveEdit | null;

  // ── Text Inspector Integration ──
  /** Exposed properties for the future properties panel. */
  inspectorSelection: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    opacity: number;
    rotation: number;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
  } | null;

  // ── Document State ──
  /** Whether the document has unsaved changes. */
  isDirty: boolean;
  /** Current file path (null if never saved). */
  filePath: string | null;
  /** Last save timestamp, or null. */
  lastSavedAt: number | null;
  /** Current file name (for title bar). */
  fileName: string | null;
  /** Whether the document is currently being saved. */
  isSaving: boolean;
  /** Version counter that increments on history changes (for reactive undo/redo buttons). */
  historyVersion: number;

  // ── Future Placeholders ──
  /** Future: history manager state snapshot. */
  _history: HistoryState | null;
  /** Future: active guide lines. */
  _guides: unknown[];
  /** Future: snap-to-grid / snap-to-object settings. */
  _snappingEnabled: boolean;
}

// ── Store Actions ──────────────────────────────────────────────────
export interface EditorActions {
  setMode: (mode: EditorMode) => void;
  setActiveTool: (tool: ToolType) => void;
  toggleTool: (tool: ToolType) => void;
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setActiveId: (id: string | null) => void;
  setMarquee: (marquee: SelectionState["marquee"]) => void;
  setHoveredObjectId: (id: string | null) => void;
  setActivePage: (page: number) => void;
  setClipboard: (objects: EditableObject[] | null) => void;
  setInteractionPhase: (phase: InteractionPhase) => void;
  setIsInteracting: (value: boolean) => void;
  setOverlayObjects: (objects: EditableObject[]) => void;
  addOverlayObject: (object: EditableObject) => void;
  removeOverlayObject: (id: string) => void;
  updateOverlayObject: (id: string, changes: Partial<EditableObject>) => void;
  /** Set the current editing mode. */
  setEditingMode: (mode: EditingMode) => void;
  /** Set the active editing session. */
  setActiveEdit: (edit: ActiveEdit | null) => void;
  /** Update the inspector selection from the current active object. */
  updateInspectorSelection: () => void;
  // ── Document State Actions ──
  setDirty: (dirty: boolean) => void;
  setFilePath: (path: string | null, name: string | null) => void;
  setLastSavedAt: (timestamp: number | null) => void;
  setIsSaving: (saving: boolean) => void;
  /** Increment the history version counter (for reactive undo/redo buttons). */
  incrementHistoryVersion: () => void;
  reset: () => void;
}

// ── Initial State ──────────────────────────────────────────────────
const initialEditorState: EditorState = {
  mode: EditorModeConst.View,
  activeTool: ToolTypeConst.Select,
  previousTool: null,
  selectedIds: [],
  activeId: null,
  marquee: null,
  hoveredObjectId: null,
  activePage: 1,
  clipboard: null,
  interactionPhase: "idle" as InteractionPhase,
  isInteracting: false,
  overlayObjects: [],
  editingMode: "none" as EditingMode,
  activeEdit: null,
  inspectorSelection: null,
  isDirty: false,
  filePath: null,
  lastSavedAt: null,
  fileName: null,
  isSaving: false,
  historyVersion: 0,
  _history: null,
  _guides: [],
  _snappingEnabled: false,
};

// ── Store ──────────────────────────────────────────────────────────
export const useEditorStore = create<EditorState & EditorActions>()(
  (set, get) => ({
    ...initialEditorState,

    // ── Actions ──
    setMode: (mode) => set({ mode }),

    setActiveTool: (tool) =>
      set((state) => ({
        activeTool: tool,
        previousTool: state.activeTool,
      })),

    toggleTool: (tool) =>
      set((state) => ({
        activeTool: state.activeTool === tool ? ToolTypeConst.Select : tool,
        previousTool: state.activeTool,
      })),

    setSelectedIds: (ids) => set({ selectedIds: ids }),
    addToSelection: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds
          : [...state.selectedIds, id],
      })),
    removeFromSelection: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.filter((i) => i !== id),
      })),
    clearSelection: () => set({ selectedIds: [], activeId: null, marquee: null, inspectorSelection: null }),

    setActiveId: (id) => set({ activeId: id }),
    setMarquee: (marquee) => set({ marquee }),
    setHoveredObjectId: (id) => set({ hoveredObjectId: id }),
    setActivePage: (page) => set({ activePage: page }),
    setClipboard: (objects) => set({ clipboard: objects }),

    setInteractionPhase: (phase) => set({ interactionPhase: phase }),
    setIsInteracting: (value) => set({ isInteracting: value }),

    setOverlayObjects: (objects) => set({ overlayObjects: objects }),
    addOverlayObject: (object) =>
      set((state) => ({
        overlayObjects: [...state.overlayObjects, object],
      })),
    removeOverlayObject: (id) =>
      set((state) => ({
        overlayObjects: state.overlayObjects.filter((o) => o.id !== id),
      })),
    updateOverlayObject: (id, changes) =>
      set((state) => {
        const newObjects = state.overlayObjects.map((o) =>
          o.id === id ? { ...o, ...changes, updatedAt: Date.now() } as EditableObject : o,
        );
        return { overlayObjects: newObjects };
      }),

    setEditingMode: (mode) => set({ editingMode: mode }),
    setActiveEdit: (edit) => set({ activeEdit: edit }),
    setDirty: (dirty) => set({ isDirty: dirty }),
    setFilePath: (path, name) => set({ filePath: path, fileName: name }),
    setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
    setIsSaving: (saving) => set({ isSaving: saving }),
    incrementHistoryVersion: () => set((state) => ({ historyVersion: state.historyVersion + 1 })),

    updateInspectorSelection: () => {
      const state = get();
      const activeObj = state.overlayObjects.find(
        (o) => o.id === state.activeId,
      );
      if (!activeObj) {
        set({ inspectorSelection: null });
        return;
      }
      const data = activeObj.data as Record<string, unknown>;
      set({
        inspectorSelection: {
          fontFamily: (data.fontFamily as string) ?? "Inter, system-ui, sans-serif",
          fontSize: (data.fontSize as number) ?? 16,
          fontWeight: (data.fontWeight as number) ?? 400,
          color: (data.color as string) ?? "#000000",
          opacity: activeObj.opacity,
          rotation: activeObj.rotation,
          position: { ...activeObj.position },
          dimensions: { ...activeObj.size },
        },
      });
    },

    reset: () => set(initialEditorState),
  }),
);
