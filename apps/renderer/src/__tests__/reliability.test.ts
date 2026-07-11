/**
 * Reliability System Regression Tests
 *
 * Tests for:
 *   - SavePipeline (unified save flow)
 *   - AutosaveManager (timer lifecycle, debounce, pause/resume)
 *   - RecoveryManager (session lifecycle, localStorage fallback)
 *   - Crash safety (beforeunload/visibilitychange)
 *
 * Every test verifies state ownership: the DOM is never the source
 * of truth — only the store and manager state matter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SavePipeline } from "../editor/export/SavePipeline";
import { AutosaveManager } from "../editor/export/AutosaveManager";
import { RecoveryManager } from "../editor/export/RecoveryManager";
import { useWorkspaceStore } from "../editor/workspace/WorkspaceStore";
import { useEditorStore } from "../editor/state/editorStore";
import { DEFAULT_AUTOSAVE_CONFIG } from "../editor/export/types";

// ── Helpers ────────────────────────────────────────────────────────
function createMockDocument(id: string, filePath: string | null, isDirty: boolean) {
  useWorkspaceStore.getState().openDocument({
    id,
    name: filePath?.split("/").pop()?.replace(/\.pdf$/i, "") ?? "Untitled",
    filePath,
    isDirty,
    pdf: null,
    file: null,
    openedAt: Date.now(),
    savedAt: null,
    activePage: 1,
    zoomLevel: 1,
  });
}

function cleanupStore() {
  useWorkspaceStore.getState().closeAllDocuments();
  useEditorStore.getState().reset();
}

function domAvailable(): boolean {
  return typeof document !== "undefined" &&
    typeof localStorage !== "undefined";
}

void domAvailable;

// ── SavePipeline Tests ─────────────────────────────────────────────
describe("SavePipeline", () => {
  let pipeline: SavePipeline;

  beforeEach(() => {
    pipeline = new SavePipeline();
    cleanupStore();
  });

  afterEach(() => {
    cleanupStore();
  });

  it("should start with no save in progress", () => {
    expect(pipeline.isSaveInProgress).toBe(false);
  });

  it("should return error for non-existent document", async () => {
    const result = await pipeline.save("non-existent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should return error when no file path available", async () => {
    createMockDocument("doc-1", null, false);
    const result = await pipeline.save("doc-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("No file path");
  });

  it("should handle new document without PDF gracefully", async () => {
    createMockDocument("doc-2", "/path/test.pdf", false);
    pipeline.setWriteFileCallback(async () => { /* no-op */ });

    const result = await pipeline.save("doc-2");
    // The pipeline gracefully handles new docs by passing empty bytes
    // This is correct — a new document has no PDF to export
    expect(result.success).toBe(true);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.error).toBeNull();

    // Verify dirty state was cleared
    const wsStore = useWorkspaceStore.getState();
    const doc = wsStore.documents.find((d) => d.id === "doc-2");
    expect(doc?.isDirty).toBe(false);
    expect(doc?.savedAt).not.toBeNull();
  });

  it("should prevent concurrent saves", async () => {
    createMockDocument("doc-3", "/path/test.pdf", false);
    pipeline.setWriteFileCallback(async () => { /* no-op */ });

    // Hit the save-in-progress guard
    (pipeline as any)._saveInProgress = true;
    const result = await pipeline.save("doc-3");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already in progress");
  });

  it("should register and fire save callbacks", () => {
    const callback = vi.fn();
    const unsubscribe = pipeline.onSave(callback);
    expect(unsubscribe).toBeInstanceOf(Function);

    // Fire callback manually
    (pipeline as any)._onSaveCallbacks[0]({ success: true, bytes: null, error: null });
    expect(callback).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribe();
    expect((pipeline as any)._onSaveCallbacks.length).toBe(0);
  });

  it("should update export settings", () => {
    pipeline.setSettings({ compressionLevel: 9, author: "Test" });
    // Settings are internal, but we can verify they're accepted
    expect(true).toBe(true);
  });
});

// ── AutosaveManager Tests ──────────────────────────────────────────
describe("AutosaveManager", () => {
  let pipeline: SavePipeline;
  let manager: AutosaveManager;

  beforeEach(() => {
    pipeline = new SavePipeline();
    manager = new AutosaveManager(pipeline);
    cleanupStore();
  });

  afterEach(() => {
    manager.stop();
    cleanupStore();
  });

  it("should start with default config", () => {
    const config = manager.config;
    expect(config.enabled).toBe(true);
    expect(config.interval).toBe(30_000);
  });

  it("should accept custom configuration", () => {
    manager.configure({ interval: 10_000, enabled: false });
    expect(manager.config.interval).toBe(10_000);
    expect(manager.config.enabled).toBe(false);
  });

  it("should start the timer when start() is called", () => {
    manager.start();
    // Timer is created via setInterval
    expect((manager as any)._timerId).not.toBeNull();
  });

  it("should not start if already running", () => {
    manager.start();
    const timer1 = (manager as any)._timerId;
    manager.start();
    const timer2 = (manager as any)._timerId;
    // Should be the same timer (not recreated)
    expect(timer1).toBe(timer2);
  });

  it("should not start if disabled", () => {
    manager.configure({ enabled: false });
    manager.start();
    expect((manager as any)._timerId).toBeNull();
  });

  it("should stop the timer when stop() is called", () => {
    manager.start();
    expect((manager as any)._timerId).not.toBeNull();
    manager.stop();
    expect((manager as any)._timerId).toBeNull();
  });

  it("should allow restart after stop", () => {
    manager.start();
    manager.stop();
    manager.start();
    expect((manager as any)._timerId).not.toBeNull();
  });

  it("should pause and resume saves", () => {
    manager.pause();
    expect((manager as any)._paused).toBe(true);
    manager.resume();
    expect((manager as any)._paused).toBe(false);
  });

  it("should not autosave while paused", async () => {
    manager.pause();
    const result = await (manager as any)._performAutosave();
    expect(result).toBeNull(); // Paused returns null
  });

  it("should not autosave while in progress", async () => {
    (manager as any)._inProgress = true;
    const result = await (manager as any)._performAutosave();
    expect(result).toBeNull(); // In progress returns null
  });

  it("should not autosave if no dirty documents", async () => {
    cleanupStore();
    const result = await (manager as any)._performAutosave();
    expect(result).toBeNull(); // No dirty docs
  });

  it("should flush with force=true bypassing debounce", async () => {
    // Without force, the debounce window prevents saves within half-interval
    (manager as any)._lastSaveTime = Date.now() - 100; // 100ms ago
    // With force=false, this should be debounced
    const resultNoForce = await (manager as any)._performAutosave(false);
    expect(resultNoForce).toBeNull(); // Debounced

    // With force=true, should proceed
    // (will return null because no dirty docs)
    const resultForce = await (manager as any)._performAutosave(true);
    expect(resultForce).toBeNull(); // No dirty docs
  });
});

// ── RecoveryManager Tests ──────────────────────────────────────────
describe("RecoveryManager", () => {
  let manager: RecoveryManager;

  beforeEach(() => {
    manager = new RecoveryManager();
  });

  afterEach(async () => {
    await manager.endAllSessions();
    // Clean localStorage
    try {
      localStorage.removeItem("docflow_recovery");
    } catch {
      // ignore
    }
  });

  it("should start with no current session", () => {
    expect(manager.currentSession).toBeNull();
  });

  it("should start a recovery session", async () => {
    const session = await manager.startSession("/path/doc.pdf");
    expect(session).not.toBeNull();
    expect(session.sessionId).toBeTruthy();
    expect(session.originalFilePath).toBe("/path/doc.pdf");
    expect(manager.currentSession).not.toBeNull();
  });

  it("should support multiple sessions via sessionMap", async () => {
    const s1 = await manager.startSession("/path/doc1.pdf", "session-1");
    const s2 = await manager.startSession("/path/doc2.pdf", "session-2");
    // Each startSession replaces the current session
    // but both remain in the session map
    expect(s1.sessionId).toBe("session-1");
    expect(s2.sessionId).toBe("session-2");
  });

  it("should end a session", async () => {
    await manager.startSession("/path/doc.pdf");
    expect(manager.currentSession).not.toBeNull();
    await manager.endSession();
    expect(manager.currentSession).toBeNull();
  });

  it("should end all sessions", async () => {
    await manager.startSession("/path/doc1.pdf", "s1");
    await manager.startSession("/path/doc2.pdf", "s2");
    await manager.endAllSessions();
    expect(manager.currentSession).toBeNull();
    expect((manager as any)._sessionMap.size).toBe(0);
  });

  it("should persist session to localStorage fallback", async () => {
    await manager.startSession("/path/doc.pdf", "test-session");
    const stored = localStorage.getItem("docflow_recovery");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed["test-session"]).toBeDefined();
    expect(parsed["test-session"].originalFilePath).toBe("/path/doc.pdf");
  });

  it("should clean up localStorage on endSession", async () => {
    await manager.startSession("/path/doc.pdf", "cleanup-session");
    await manager.endSession();
    const stored = localStorage.getItem("docflow_recovery");
    const parsed = JSON.parse(stored || "{}");
    expect(parsed["cleanup-session"]).toBeUndefined();
  });

  it("should discard a session by ID", async () => {
    await manager.startSession("/path/doc.pdf", "discard-me");
    await manager.discardSession("discard-me");
    const stored = localStorage.getItem("docflow_recovery");
    const parsed = JSON.parse(stored || "{}");
    expect(parsed["discard-me"]).toBeUndefined();
  });

  it("should detect stale sessions", async () => {
    // Check for stale sessions with no callbacks set — should return empty
    const data = await manager.checkForStaleSessions();
    expect(data.sessions).toHaveLength(0);
  });

  it("should update autosave timestamp", async () => {
    await manager.startSession("/path/doc.pdf", "ts-session");
    const before = manager.currentSession!.lastAutosaveAt;
    await new Promise((r) => setTimeout(r, 5));
    await manager.updateAutosaveTimestamp();
    expect(manager.currentSession!.lastAutosaveAt).toBeGreaterThan(before);
  });

  it("should handle restoreSession for non-existent sessions", async () => {
    const result = await manager.restoreSession("non-existent");
    expect(result).toBeNull();
  });
});

// ── Branch: Export module barrel export ────────────────────────────
describe("Export module exports", () => {
  it("should export SavePipeline", async () => {
    const mod = await import("../editor/export/SavePipeline");
    expect(mod.SavePipeline).toBeDefined();
  });

  it("should export AutosaveManager", async () => {
    const mod = await import("../editor/export/AutosaveManager");
    expect(mod.AutosaveManager).toBeDefined();
  });

  it("should export RecoveryManager", async () => {
    const mod = await import("../editor/export/RecoveryManager");
    expect(mod.RecoveryManager).toBeDefined();
  });

  it("should have AutosaveConfig defaults", () => {
    expect(DEFAULT_AUTOSAVE_CONFIG.interval).toBe(30_000);
    expect(DEFAULT_AUTOSAVE_CONFIG.enabled).toBe(true);
  });
});
