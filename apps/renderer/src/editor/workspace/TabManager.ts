/**
 * TabManager.ts — Multi-Document Tab Lifecycle Manager
 *
 * Purpose: Manage tab-level operations including tab ordering,
 * cycle navigation, duplicate detection, and tab-state transitions.
 * Works as a companion to WorkspaceStore.
 *
 * Provides:
 *   - Tab ordering and reindexing
 *   - Ctrl+Tab / Ctrl+Shift+Tab cycling logic
 *   - Duplicate document detection by file path
 *   - Active tab restoration on close
 *   - Tab close confirmation orchestration
 *   - Middle-click close handling
 */
import { useWorkspaceStore } from "./WorkspaceStore";
import type { WorkspaceDocument } from "./WorkspaceStore";

export type TabCloseResult = "close" | "cancel" | "save-and-close";

export interface TabCloseHandler {
  (doc: WorkspaceDocument): TabCloseResult | Promise<TabCloseResult>;
}

export class TabManager {
  private _closeHandlers: TabCloseHandler[] = [];

  /** Register a handler to be called before a tab is closed. */
  onBeforeClose(handler: TabCloseHandler): () => void {
    this._closeHandlers.push(handler);
    return () => {
      const idx = this._closeHandlers.indexOf(handler);
      if (idx >= 0) this._closeHandlers.splice(idx, 1);
    };
  }

  /** Attempt to close a tab, returning success/failure. */
  async closeTab(docId: string): Promise<boolean> {
    const store = useWorkspaceStore.getState();
    const doc = store.documents.find((d) => d.id === docId);
    if (!doc) return true;

    // Run close handlers (e.g., unsaved changes check)
    for (const handler of this._closeHandlers) {
      const result = await handler(doc);
      if (result === "cancel") return false;
      if (result === "save-and-close") {
        // Signal parent to save; then close
        return "save";
      }
    }

    store.closeDocument(docId);
    return true;
  }

  /** Close all tabs except the given one. */
  closeOtherTabs(docId: string): void {
    const store = useWorkspaceStore.getState();
    store.closeOtherDocuments(docId);
  }

  /** Close all tabs. */
  closeAllTabs(): void {
    const store = useWorkspaceStore.getState();
    store.closeAllDocuments();
  }

  /** Get the next tab ID in the cycle direction. */
  getNextTabId(direction: 1 | -1): string | null {
    const store = useWorkspaceStore.getState();
    if (store.documents.length < 2) return null;
    const currentIdx = store.documents.findIndex(
      (d) => d.id === store.activeDocumentId,
    );
    if (currentIdx === -1) return null;
    const nextIdx =
      (currentIdx + direction + store.documents.length) %
      store.documents.length;
    return store.documents[nextIdx].id;
  }

  /** Check if a document with the same file path is already open. */
  findExistingDocument(filePath: string): WorkspaceDocument | undefined {
    return useWorkspaceStore
      .getState()
      .documents.find((d) => d.filePath === filePath);
  }

  /** Get the tab index for a document ID. */
  getTabIndex(docId: string): number {
    return useWorkspaceStore
      .getState()
      .documents.findIndex((d) => d.id === docId);
  }

  /** Get the number of open tabs. */
  get tabCount(): number {
    return useWorkspaceStore.getState().documents.length;
  }

  /** Get all open tabs. */
  get tabs(): WorkspaceDocument[] {
    return useWorkspaceStore.getState().documents;
  }

  /** Get the active tab. */
  get activeTab(): WorkspaceDocument | null {
    const store = useWorkspaceStore.getState();
    return store.documents.find((d) => d.id === store.activeDocumentId) ?? null;
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const tabManager = new TabManager();
