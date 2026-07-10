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
 */

import type { RecoverySession } from "./types";

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
  private readonly SESSION_FILE = "session.json";

  /** Register recovery callbacks. */
  setCallbacks(callbacks: RecoveryCallbacks): void {
    this._callbacks = callbacks;
  }

  /**
   * Start a new recovery session when a document is opened.
   * Call this after opening a PDF file.
   */
  async startSession(
    originalFilePath: string | null,
    autosavePath: string | null,
  ): Promise<RecoverySession> {
    const session: RecoverySession = {
      sessionId: crypto.randomUUID(),
      startedAt: Date.now(),
      lastAutosaveAt: Date.now(),
      originalFilePath,
      autosavePath,
    };

    this._currentSession = session;
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
   * Cleans up recovery session data.
   */
  async endSession(): Promise<void> {
    if (!this._currentSession) return;

    await this._cleanupSession(this._currentSession.sessionId);
    this._currentSession = null;
  }

  /**
   * Check for stale recovery sessions (from previous launches).
   * Call this on application startup.
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

          // Check if this session is stale (> 5 minutes since last autosave
          // and the app presumably crashed)
          const isStale = Date.now() - session.lastAutosaveAt > 300_000; // 5 minutes

          if (isStale) {
            data.sessions.push({
              session,
              canRecover: true,
              description: session.originalFilePath
                ? `Recover unsaved changes to "${session.originalFilePath}"`
                : "Recover unsaved changes to a new document",
            });
          } else {
            // Session is recent — might still be active
            data.sessions.push({
              session,
              canRecover: true,
              description: "Active session",
            });
          }
        } catch {
          // Skip unparseable session files
        }
      }
    } catch {
      // Recovery directory may not exist yet
    }

    return data;
  }

  /**
   * Restore a session from its session ID.
   * Returns the autosave file contents if available.
   */
  async restoreSession(sessionId: string): Promise<string | null> {
    if (!this._callbacks) return null;

    try {
      const recoveryDir = this._callbacks.getRecoveryDir();
      const content = await this._callbacks.readFile(
        `${recoveryDir}/${sessionId}.json`,
      );
      const session = JSON.parse(content) as RecoverySession;

      if (session.autosavePath && (await this._callbacks.fileExists(session.autosavePath))) {
        return await this._callbacks.readFile(session.autosavePath);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Discard a stale session without recovery.
   */
  async discardSession(sessionId: string): Promise<void> {
    await this._cleanupSession(sessionId);
  }

  /** Get the current session info. */
  get currentSession(): RecoverySession | null {
    return this._currentSession;
  }

  // ── Private ──────────────────────────────────────────────────────
  private async _persistSession(session: RecoverySession): Promise<void> {
    if (!this._callbacks) return;

    try {
      const recoveryDir = this._callbacks.getRecoveryDir();
      const sessionPath = `${recoveryDir}/${session.sessionId}.json`;
      await this._callbacks.writeFile(sessionPath, JSON.stringify(session, null, 2));
    } catch {
      // Session persistence is best-effort
    }
  }

  private async _cleanupSession(sessionId: string): Promise<void> {
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
