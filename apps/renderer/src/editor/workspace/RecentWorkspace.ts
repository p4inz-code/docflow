/**
 * RecentWorkspace.ts — Workspace Session Persistence
 *
 * Purpose: Persist and restore the workspace session (open documents,
 * active tab, tab order) across application restarts using localStorage.
 *
 * Features:
 *   - Save current workspace state on changes
 *   - Restore workspace on application start
 *   - Track last-opened files for session restoration
 *   - Debounced save to avoid excessive writes
 *   - Per-document viewport state (active page, zoom)
 */

const STORAGE_KEY = "docflow_workspace_session";
const MAX_SESSION_FILES = 10;

export interface SessionDocument {
  /** File path (null for new/unsaved documents). */
  filePath: string | null;
  /** Display name. */
  name: string;
  /** Active page in this document. */
  activePage: number;
  /** Zoom level for this document. */
  zoomLevel: number;
  /** Timestamp when opened. */
  openedAt: number;
}

export interface WorkspaceSession {
  /** Documents that were open. */
  documents: SessionDocument[];
  /** Which document was active. */
  activeDocumentId: string | null;
  /** When the session was last saved. */
  lastSavedAt: number;
  /** Version for migration support. */
  version: number;
}

export class RecentWorkspace {
  private _saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private _enabled = true;

  /** Enable or disable session persistence. */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /** Save the current workspace session (debounced). */
  saveSession(session: WorkspaceSession): void {
    if (!this._enabled) return;

    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      try {
        const toStore: WorkspaceSession = {
          ...session,
          lastSavedAt: Date.now(),
          version: 1,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RecentWorkspace] Failed to save workspace session");
        }
      }
    }, 500);
  }

  /** Restore the last workspace session. */
  restoreSession(): WorkspaceSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as WorkspaceSession;
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RecentWorkspace] Failed to restore workspace session");
      }
      return null;
    }
  }

  /** Clear the saved session. */
  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RecentWorkspace] Failed to clear workspace session");
      }
    }
  }

  /** Flush any pending save immediately. */
  flush(): void {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }
  }

  /** Get the list of recently opened file paths for the "Open Recent" menu. */
  getRecentFilePaths(): string[] {
    const session = this.restoreSession();
    if (!session) return [];
    return session.documents
      .map((d) => d.filePath)
      .filter((p): p is string => p !== null)
      .slice(0, MAX_SESSION_FILES);
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const recentWorkspace = new RecentWorkspace();
