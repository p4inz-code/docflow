/**
 * RecoveryManager.ts — Recovery Manager
 *
 * Purpose: Manage application crash recovery, power failure recovery,
 * and unexpected close recovery. Creates recovery sessions with
 * periodic autosave data that can be restored on next launch.
 *
 * Workflow:
 *   1. App starts → RecoveryManager checks for stale recovery sessions
 *   2. If found → generates recovery data for the UI to present
 *   3. User chooses to recover or discard
 *   4. Recovered documents are restored; stale sessions are cleaned up
 *
 * Integration:
 *   - Sessions are started when documents are opened
 *   - Sessions are ended when documents are closed
 *   - Autosave timestamps are updated after each autosave
 *   - On app startup, stale sessions are detected and presented
 */

import type { RecoverySession } from "./types";
import type { SavePipeline } from "./SavePipeline";
import { workspaceErrorHandler } from "../core/ErrorManager";

// ── Recovery Callbacks ─────────────────────────────────────────────
export interface RecoveryCallbacks {
  /** Read the contents of a file. */
  readFile: (path: string) => Promise<string>;
  /** Write recovery session data to a file. */
  writeFile: (path: string, data: string) => Promise<void>;
  /** Delete a file. */
  deleteFile: (path: string) => Promise<void>;
  /** Check if a file exists. */
  fileExists: (path: string) => Promise<boolean>;
  /** List files in a directory. */
  listFiles: (dir: string) => Promise<string[]>;
  /** Get the recovery data directory path. */
  getRecoveryDir: () => string;
}

// ── Recovery Data ──────────────────────────────────────────────────
export interface RecoveryData {
  sessions: RecoverySessionInfo[];
}

export interface RecoverySessionInfo {
  session: RecoverySession;
  /** Whether the session can be restored. */
  canRecover: boolean;
  /** Human-readable description. */
  description: string;
}

// ── Recovery Manager ───────────────────────────────────────────────
export class RecoveryManager {
  private _callbacks: RecoveryCallbacks | null = null;
  private _currentSession: RecoverySession | null = null;
  private _sessionMap = new Map<string, RecoverySession>();

  /**
   * Register recovery callbacks (file I/O operations).
   * Must be called before any session operations.
   */
  setCallbacks(callbacks: RecoveryCallbacks): void {
    this._callbacks = callbacks;
  }

  /**
   * Register the save pipeline for performing recovery saves.
   */
  setSavePipeline(_pipeline: SavePipeline): void {
    // Pipeline is accepted for future use with file-based recovery
  }

  /**
   * Start a new recovery session when a document is opened.
   * Call this after opening a PDF file.
   *
   * In browser context, sessions are tracked in-memory and serialized
   * to localStorage. In Electron, they'd use the real filesystem.
   */
  async startSession(
    originalFilePath: string | null,
    sessionId?: string,
  ): Promise<RecoverySession> {
    const session: RecoverySession = {
      sessionId: sessionId ?? crypto.randomUUID(),
      startedAt: Date.now(),
      lastAutosaveAt: Date.now(),
      originalFilePath,
      autosavePath: null,
    };

    this._currentSession = session;
    this._sessionMap.set(session.sessionId, session);
    await this._persistSession(session);
    return session;
  }

  /** Update the current session's autosave timestamp. */
  async updateAutosaveTimestamp(): Promise<void> {
    if (!this._currentSession) return;
    this._currentSession.lastAutosaveAt = Date.now();
    await this._persistSession(this._currentSession);
  }

  /**
   * End the current recovery session (on successful save or document close).
   * Cleans up recovery session data from storage.
   */
  async endSession(): Promise<void> {
    if (!this._currentSession) return;
    await this._cleanupSession(this._currentSession.sessionId);
    this._sessionMap.delete(this._currentSession.sessionId);
    this._currentSession = null;
  }

  /**
   * End all active recovery sessions (on workspace close / app shutdown).
   */
  async endAllSessions(): Promise<void> {
    for (const [sessionId] of this._sessionMap) {
      await this._cleanupSession(sessionId);
    }
    this._sessionMap.clear();
    this._currentSession = null;
  }

  /**
   * Check for stale recovery sessions (from previous launches).
   * Call this on application startup.
   *
   * In browser mode, recovery sessions are stored in localStorage.
   * In Electron, they'd be on the filesystem.
   *
   * A session is stale if the last autosave was more than 5 minutes ago.
   * Recent sessions (≤ 5 min) are assumed to be from a crash.
   */
  async checkForStaleSessions(): Promise<RecoveryData> {
    const data: RecoveryData = { sessions: [] };
    if (!this._callbacks) return data;

    try {
      const recoveryDir = this._callbacks.getRecoveryDir();
      const files = await this._callbacks.listFiles(recoveryDir);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await this._callbacks.readFile(`${recoveryDir}/${file}`);
          const session = JSON.parse(content) as RecoverySession;

          // Session is stale if > 5 minutes since last autosave
          const isStale = Date.now() - session.lastAutosaveAt > 300_000; // 5 minutes

          data.sessions.push({
            session,
            canRecover: true,
            description: isStale
              ? (session.originalFilePath
                  ? `Recover unsaved changes to "${session.originalFilePath}"`
                  : "Recover unsaved changes to a new document")
              : "Active session (may still be in progress)",
          });
        } catch {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Recovery] Failed to parse session file:", file);
          }
        }
      }
    } catch {
      // Recovery directory not available — expected on first launch
    }

    return data;
  }

  /**
   * Restore a session from its session ID.
   * Returns the autosave file contents if available.
   */
  async restoreSession(sessionId: string): Promise<string | null> {
    const session = this._sessionMap.get(sessionId);
    if (!session) {
      // Try loading from storage
      if (!this._callbacks) return null;
      try {
        const recoveryDir = this._callbacks.getRecoveryDir();
        const content = await this._callbacks.readFile(
          `${recoveryDir}/${sessionId}.json`,
        );
        const loaded = JSON.parse(content) as RecoverySession;
        this._sessionMap.set(sessionId, loaded);
        return sessionId; // Return session ID as identifier
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Recovery] Session not found in storage:", sessionId);
        }
        return null;
      }
    }
    return sessionId; // Session exists
  }

  /**
   * Discard a stale session without recovery.
   */
  async discardSession(sessionId: string): Promise<void> {
    await this._cleanupSession(sessionId);
    this._sessionMap.delete(sessionId);
    if (this._currentSession?.sessionId === sessionId) {
      this._currentSession = null;
    }
  }

  /** Get the current session info. */
  get currentSession(): RecoverySession | null {
    return this._currentSession;
  }

  /**
   * Update recovery session after a save completes.
   */
  async onSaveComplete(): Promise<void> {
    await this.updateAutosaveTimestamp();
  }

  // ── Private ──────────────────────────────────────────────────────
  /**
   * Persist session to localStorage (browser) or filesystem (Electron).
   * In browser mode, we use localStorage since there's no real filesystem
   * access. The session data is lightweight (no PDF bytes).
   */
  private async _persistSession(session: RecoverySession): Promise<void> {
    if (!this._callbacks) {
      // Fallback: store in localStorage
      try {
        const existing = JSON.parse(
          localStorage.getItem("docflow_recovery") || "{}",
        );
        existing[session.sessionId] = session;
        localStorage.setItem("docflow_recovery", JSON.stringify(existing));
      } catch {
        workspaceErrorHandler.warn("Recovery", "localStorage may be full; cannot persist recovery session");
      }
      return;
    }

    try {
      const recoveryDir = this._callbacks.getRecoveryDir();
      await this._callbacks.writeFile(
        `${recoveryDir}/${session.sessionId}.json`,
        JSON.stringify(session, null, 2),
      );      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Recovery] Failed to persist recovery session to disk");
        }
      }
  }

  private async _cleanupSession(sessionId: string): Promise<void> {
    // Clean up localStorage fallback
    try {
      const existing = JSON.parse(
        localStorage.getItem("docflow_recovery") || "{}",
      );
      delete existing[sessionId];
      localStorage.setItem("docflow_recovery", JSON.stringify(existing));
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Recovery] Failed to cleanup localStorage recovery data");
      }
    }

    if (!this._callbacks) return;
    try {
      const recoveryDir = this._callbacks.getRecoveryDir();
      const sessionPath = `${recoveryDir}/${sessionId}.json`;
      if (await this._callbacks.fileExists(sessionPath)) {
        await this._callbacks.deleteFile(sessionPath);
      }
    } catch {
      // Cleanup is best-effort
    }
  }
}
