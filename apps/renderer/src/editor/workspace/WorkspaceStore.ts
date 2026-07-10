/**
 * WorkspaceStore.ts — Workspace State
 *
 * Purpose: Zustand store for the multi-document workspace.
 * Manages open documents (tabs), their lifecycle, dirty state,
 * and session persistence.
 *
 * Each workspace document tracks:
 *   - Unique tab ID
 *   - Display name
 *   - File path (null for new/unsaved docs)
 *   - Dirty flag
 *   - PDFDocumentProxy reference
 *   - File reference (for re-saving)
 */

import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist";

// ── Workspace Doc ──────────────────────────────────────────────────
export interface WorkspaceDocument {
  /** Unique tab identifier. */
  id: string;
  /** Display name shown in the tab. */
  name: string;
  /** Real file system path (null for new/unsaved documents). */
  filePath: string | null;
  /** Whether the document has unsaved changes. */
  isDirty: boolean;
  /** The PDF document proxy (null if not yet loaded). */
  pdf: PDFDocumentProxy | null;
  /** The source File object (for re-saving). */
  file: File | null;
  /** Timestamp when the document was opened. */
  openedAt: number;
  /** Timestamp when the document was last saved. */
  savedAt: number | null;
  /** Current active page in this document. */
  activePage: number;
  /** Zoom level for this document. */
  zoomLevel: number;
}

// ── Store Shape ────────────────────────────────────────────────────
export interface WorkspaceState {
  /** All open documents in order (left to right). */
  documents: WorkspaceDocument[];
  /** ID of the currently active document. */
  activeDocumentId: string | null;
  /** Ordered list of recently closed document IDs (for undo close). */
  recentlyClosed: string[];

  // ── Actions ──
  /** Open a new document tab. */
  openDocument: (doc: WorkspaceDocument) => void;
  /** Close a document tab by ID. */
  closeDocument: (id: string) => void;
  /** Close all documents except the one with the given ID. */
  closeOtherDocuments: (id: string) => void;
  /** Close all documents. */
  closeAllDocuments: () => void;
  /** Switch to a specific document tab. */
  setActiveDocument: (id: string) => void;
  /** Update a document's properties. */
  updateDocument: (id: string, changes: Partial<WorkspaceDocument>) => void;
  /** Mark a document as dirty/clean. */
  setDocumentDirty: (id: string, dirty: boolean) => void;
  /** Rename a document tab. */
  renameDocument: (id: string, name: string) => void;
  /** Reorder documents (drag & drop). */
  reorderDocuments: (fromIndex: number, toIndex: number) => void;
  /** Move to the next tab (Ctrl+Tab / Ctrl+Shift+Tab). */
  cycleTab: (direction: 1 | -1) => void;
  /** Get the number of open documents. */
  get count(): number;
}

// ── Store ──────────────────────────────────────────────────────────
export const useWorkspaceStore = create<WorkspaceState>()(
  (set, get) => ({
    documents: [],
    activeDocumentId: null,
    recentlyClosed: [],

    openDocument: (doc) =>
      set((state) => {
        // Prevent duplicate documents (same file path)
        if (doc.filePath && state.documents.some((d) => d.filePath === doc.filePath)) {
          // Just switch to the existing tab instead
          const existing = state.documents.find((d) => d.filePath === doc.filePath);
          if (existing) {
            return { activeDocumentId: existing.id };
          }
        }
        return {
          documents: [...state.documents, doc],
          activeDocumentId: doc.id,
        };
      }),

    closeDocument: (id) =>
      set((state) => {
        const idx = state.documents.findIndex((d) => d.id === id);
        if (idx === -1) return state;
        const doc = state.documents[idx];

        // Track recently closed for undo-close
        const recentlyClosed = [...state.recentlyClosed, id].slice(-20);

        const documents = state.documents.filter((d) => d.id !== id);

        // Determine next active tab
        let activeDocumentId = state.activeDocumentId;
        if (activeDocumentId === id) {
          if (documents.length === 0) {
            activeDocumentId = null;
          } else if (idx < documents.length) {
            activeDocumentId = documents[idx].id;
          } else {
            activeDocumentId = documents[documents.length - 1].id;
          }
        }

        return { documents, activeDocumentId, recentlyClosed };
      }),

    closeOtherDocuments: (id) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === id);
        if (!doc) return state;
        return {
          documents: [doc],
          activeDocumentId: id,
        };
      }),

    closeAllDocuments: () =>
      set({
        documents: [],
        activeDocumentId: null,
      }),

    setActiveDocument: (id) => set({ activeDocumentId: id }),

    updateDocument: (id, changes) =>
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...changes } : d,
        ),
      })),

    setDocumentDirty: (id, dirty) =>
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, isDirty: dirty } : d,
        ),
      })),

    renameDocument: (id, name) =>
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, name } : d,
        ),
      })),

    reorderDocuments: (fromIndex, toIndex) =>
      set((state) => {
        const docs = [...state.documents];
        const [moved] = docs.splice(fromIndex, 1);
        docs.splice(toIndex, 0, moved);
        return { documents: docs };
      }),

    cycleTab: (direction) => {
      const state = get();
      if (state.documents.length < 2) return;
      const currentIdx = state.documents.findIndex(
        (d) => d.id === state.activeDocumentId,
      );
      if (currentIdx === -1) return;
      const nextIdx =
        (currentIdx + direction + state.documents.length) %
        state.documents.length;
      set({ activeDocumentId: state.documents[nextIdx].id });
    },

    get count(): number {
      return get().documents.length;
    },
  }),
);

// ── Selector Helpers ───────────────────────────────────────────────
/** Get the currently active workspace document. */
export function useActiveDocument(): WorkspaceDocument | null {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  return documents.find((d) => d.id === activeId) ?? null;
}

/** Get the PDFDocumentProxy for the active document. */
export function useActivePDF(): PDFDocumentProxy | null {
  const doc = useActiveDocument();
  return doc?.pdf ?? null;
}

/** Check if a specific document is the active one. */
export function useIsActiveDocument(id: string): boolean {
  return useWorkspaceStore((s) => s.activeDocumentId === id);
}
