/**
 * Stress Testing — Large Documents & Rapid Operations
 *
 * Tests the application's ability to handle:
 *   - Large numbers of overlay objects (100, 500, 1000)
 *   - Rapid sequential operations (undo/redo, add/remove)
 *   - Memory pressure from repeated create/destroy cycles
 *   - Large page counts in virtual rendering
 *   - Concurrent operations
 *
 * IMPORTANT: All reads use useEditorStore.getState() directly rather than
 * storing a snapshot, because Zustand's getState() returns a snapshot that
 * becomes stale after the internal set() is called.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useEditorStore } from "../editor/state/editorStore";
import { useWorkspaceStore } from "../editor/workspace/WorkspaceStore";
import { CommandPipeline } from "../editor/core/CommandPipeline";
import { BaseCommand } from "../editor/commands/base";
import { ToolType } from "../editor/types/tools";
import type { CommandResult, CommandType } from "../editor/types/commands";
import type { EditableObject } from "../editor/types/objects";

// ── Test Helpers ───────────────────────────────────────────────────

function createTestObject(id: string): EditableObject {
  const now = Date.now();
  return {
    id,
    type: "text",
    page: 1,
    position: { x: Math.random() * 800, y: Math.random() * 600 },
    size: { width: 100, height: 50 },
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    selected: false,
    createdAt: now,
    updatedAt: now,
    data: { content: `Object ${id}`, fontSize: 16 },
  } as EditableObject;
}

function addBulk(count: number): void {
  const store = useEditorStore.getState();
  for (let i = 0; i < count; i++) {
    store.addOverlayObject(createTestObject(`bulk-${i}`));
  }
}

function countObjects(): number {
  return useEditorStore.getState().overlayObjects.length;
}

class BulkCreateCommand extends BaseCommand {
  private _ids: string[] = [];

  constructor(id: string, private _count: number) {
    super(id, "create-object" as CommandType, `Create ${_count} objects`);
  }

  execute(): CommandResult {
    const store = useEditorStore.getState();
    const ids: string[] = [];
    for (let i = 0; i < this._count; i++) {
      const objId = `bulk-${this.id}-${i}-${Date.now()}-${Math.random()}`;
      store.addOverlayObject(createTestObject(objId));
      ids.push(objId);
    }
    this._ids = ids;
    return {
      created: ids,
      deleted: [],
      updated: [],
      selectionChanged: [],
      needsRender: true,
    };
  }

  undo(): CommandResult {
    const store = useEditorStore.getState();
    for (const id of this._ids) {
      store.removeOverlayObject(id);
    }
    return {
      created: [],
      deleted: [...this._ids],
      updated: [],
      selectionChanged: [],
      needsRender: true,
    };
  }
}

// ── 100 Objects ────────────────────────────────────────────────────
describe("Stress: 100 Objects", () => {
  let pipeline: CommandPipeline;

  beforeEach(() => {
    pipeline = new CommandPipeline();
    useEditorStore.getState().reset();
  });

  it("should create 100 objects", () => {
    addBulk(100);
    expect(countObjects()).toBe(100);
  });

  it("should undo/redo 100 objects", () => {
    pipeline.execute(new BulkCreateCommand("stress-100", 100));
    expect(countObjects()).toBe(100);

    pipeline.undo();
    expect(countObjects()).toBe(0);

    pipeline.redo();
    expect(countObjects()).toBe(100);
  });

  it("should select and update all 100 objects", () => {
    addBulk(100);
    const ids = useEditorStore.getState().overlayObjects.map((o) => o.id);
    useEditorStore.getState().setSelectedIds(ids);
    expect(useEditorStore.getState().selectedIds).toHaveLength(100);

    // Update all selected
    for (const id of ids) {
      useEditorStore.getState().updateOverlayObject(id, { rotation: 45, opacity: 0.5 });
    }
    const objects = useEditorStore.getState().overlayObjects;
    expect(objects.every((o) => o.rotation === 45)).toBe(true);
    expect(objects.every((o) => o.opacity === 0.5)).toBe(true);
  });

  it("should remove all 100 objects", () => {
    addBulk(100);
    for (const obj of useEditorStore.getState().overlayObjects) {
      useEditorStore.getState().removeOverlayObject(obj.id);
    }
    expect(countObjects()).toBe(0);
  });
});

// ── 500 Objects ────────────────────────────────────────────────────
describe("Stress: 500 Objects", () => {
  let pipeline: CommandPipeline;

  beforeEach(() => {
    pipeline = new CommandPipeline();
    useEditorStore.getState().reset();
  });

  it("should create 500 objects", () => {
    addBulk(500);
    expect(countObjects()).toBe(500);
  });

  it("should undo/redo 500 objects", () => {
    pipeline.execute(new BulkCreateCommand("stress-500", 500));
    expect(countObjects()).toBe(500);

    pipeline.undo();
    expect(countObjects()).toBe(0);
  });

  it("should manage selection with 500 objects", () => {
    addBulk(500);
    const objects = useEditorStore.getState().overlayObjects;
    useEditorStore.getState().setSelectedIds([objects[0].id, objects[249].id, objects[499].id]);
    expect(useEditorStore.getState().selectedIds).toHaveLength(3);

    useEditorStore.getState().clearSelection();
    expect(useEditorStore.getState().selectedIds).toHaveLength(0);
  });
});

// ── 1000 Objects ───────────────────────────────────────────────────
describe("Stress: 1000 Objects", () => {
  let pipeline: CommandPipeline;

  beforeEach(() => {
    pipeline = new CommandPipeline();
    useEditorStore.getState().reset();
  });

  it("should create 1000 objects", () => {
    addBulk(1000);
    expect(countObjects()).toBe(1000);
  });

  it("should undo 1000 objects", () => {
    pipeline.execute(new BulkCreateCommand("stress-1000", 1000));
    expect(countObjects()).toBe(1000);

    pipeline.undo();
    expect(countObjects()).toBe(0);
  });
});

// ── Rapid Operations ───────────────────────────────────────────────
describe("Stress: Rapid Operations", () => {
  let pipeline: CommandPipeline;

  beforeEach(() => {
    pipeline = new CommandPipeline();
    useEditorStore.getState().reset();
  });

  it("should handle 100 rapid create/delete cycles", () => {
    for (let cycle = 0; cycle < 100; cycle++) {
      const obj = createTestObject(`rapid-${cycle}`);
      useEditorStore.getState().addOverlayObject(obj);
      useEditorStore.getState().removeOverlayObject(obj.id);
    }
    expect(countObjects()).toBe(0);
  });

  it("should handle 100 rapid undo/redo cycles", () => {
    pipeline.execute(new BulkCreateCommand("rapid-base", 1));

    for (let i = 0; i < 100; i++) {
      pipeline.undo();
      pipeline.redo();
    }
    expect(countObjects()).toBe(1);
  });

  it("should handle 50 commands then rapid undo/redo", () => {
    for (let i = 0; i < 50; i++) {
      pipeline.execute(new BulkCreateCommand(`seq-${i}`, 1));
    }
    expect(countObjects()).toBe(50);

    // Undo all then redo all
    for (let i = 0; i < 50; i++) pipeline.undo();
    expect(countObjects()).toBe(0);

    for (let i = 0; i < 50; i++) pipeline.redo();
    expect(countObjects()).toBe(50);
  });

  it("should not crash on double undo/redo", () => {
    expect(() => pipeline.undo()).not.toThrow();
    expect(() => pipeline.redo()).not.toThrow();

    pipeline.execute(new BulkCreateCommand("double-test", 10));
    pipeline.undo();
    expect(() => pipeline.undo()).not.toThrow();
    expect(() => pipeline.redo()).not.toThrow();
  });
});

// ── Repeated Open/Close Cycles ────────────────────────────────────
describe("Stress: Repeated Open/Close", () => {
  afterEach(() => {
    useWorkspaceStore.getState().closeAllDocuments();
    useEditorStore.getState().reset();
  });

  it("should handle 50 open/close cycles", () => {
    for (let cycle = 0; cycle < 50; cycle++) {
      useWorkspaceStore.getState().openDocument({
        id: `cycle-${cycle}`,
        name: `Cycle ${cycle}`,
        filePath: `/path/doc-${cycle}.pdf`,
        isDirty: false,
        pdf: null,
        file: null,
        openedAt: Date.now(),
        savedAt: null,
        activePage: 1,
        zoomLevel: 1,
      });
    }
    expect(useWorkspaceStore.getState().documents).toHaveLength(50);

    useWorkspaceStore.getState().closeAllDocuments();
    expect(useWorkspaceStore.getState().documents).toHaveLength(0);
  });

  it("should handle 100 rapid switch cycles", () => {
    // Open 10 documents
    for (let i = 0; i < 10; i++) {
      useWorkspaceStore.getState().openDocument({
        id: `switch-${i}`,
        name: `Switch ${i}`,
        filePath: `/path/doc-${i}.pdf`,
        isDirty: false,
        pdf: null,
        file: null,
        openedAt: Date.now(),
        savedAt: null,
        activePage: 1,
        zoomLevel: 1,
      });
    }

    // Rapidly switch between them
    for (let i = 0; i < 100; i++) {
      const targetId = `switch-${i % 10}`;
      useWorkspaceStore.getState().setActiveDocument(targetId);
      expect(useWorkspaceStore.getState().activeDocumentId).toBe(targetId);
    }
  });
});

// ── Rapid Page Changes ────────────────────────────────────────────
describe("Stress: Rapid Page Changes", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("should handle 1000 rapid page changes", () => {
    for (let i = 0; i < 1000; i++) {
      useEditorStore.getState().setActivePage((i % 100) + 1);
    }
    expect(useEditorStore.getState().activePage).toBe(100);
  });
});

// ── Selection Stress ──────────────────────────────────────────────
describe("Stress: Selection", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("should handle rapid selection changes", () => {
    for (let i = 0; i < 200; i++) {
      useEditorStore.getState().setSelectedIds([`obj-${i}`, `obj-${i + 1}`]);
      useEditorStore.getState().clearSelection();
    }
    expect(useEditorStore.getState().selectedIds).toHaveLength(0);
  });

  it("should handle add/remove selection rapidly", () => {
    for (let i = 0; i < 100; i++) {
      useEditorStore.getState().addToSelection(`obj-${i}`);
      useEditorStore.getState().removeFromSelection(`obj-${i}`);
    }
    expect(useEditorStore.getState().selectedIds).toHaveLength(0);
  });
});

// ── Concurrent-like Stress ─────────────────────────────────────────
describe("Stress: Mixed Operations", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("should maintain consistency under mixed operations", () => {
    // Add objects
    for (let i = 0; i < 100; i++) {
      useEditorStore.getState().addOverlayObject(createTestObject(`mixed-${i}`));
    }
    expect(useEditorStore.getState().overlayObjects).toHaveLength(100);

    // Update some
    for (let i = 0; i < 50; i++) {
      useEditorStore.getState().updateOverlayObject(`mixed-${i}`, { opacity: 0.3 });
    }

    // Remove some
    for (let i = 50; i < 75; i++) {
      useEditorStore.getState().removeOverlayObject(`mixed-${i}`);
    }

    // Verify consistency
    expect(useEditorStore.getState().overlayObjects).toHaveLength(75); // 100 - 25 removed
    const lowOpacity = useEditorStore.getState().overlayObjects.filter((o) => o.opacity === 0.3);
    expect(lowOpacity).toHaveLength(50);
  });

  it("should handle tool switching under load", () => {
    const tools: ToolType[] = [
      ToolType.Select, ToolType.Hand, ToolType.Text,
      ToolType.Image, ToolType.Shape, ToolType.Draw,
      ToolType.Highlight, ToolType.Signature, ToolType.Stamp,
      ToolType.Erase,
    ];

    for (let i = 0; i < 500; i++) {
      useEditorStore.getState().setActiveTool(tools[i % tools.length]);
    }
    expect(useEditorStore.getState().activeTool).toBe(tools[(500 - 1) % tools.length]);
  });
});

// ── History Version Stress ─────────────────────────────────────────
describe("Stress: History Version", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("should handle 1000 history version increments", () => {
    for (let i = 0; i < 1000; i++) {
      useEditorStore.getState().incrementHistoryVersion();
    }
    expect(useEditorStore.getState().historyVersion).toBe(1000);
  });
});

// ── Object Update Stress ──────────────────────────────────────────
describe("Stress: Object Updates", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    // Create baseline objects
    for (let i = 0; i < 100; i++) {
      useEditorStore.getState().addOverlayObject(createTestObject(`update-${i}`));
    }
  });

  it("should update 100 objects sequentially", () => {
    for (let i = 0; i < 100; i++) {
      useEditorStore.getState().updateOverlayObject(`update-${i}`, {
        position: { x: i * 10, y: i * 20 },
        rotation: i,
        opacity: 1 - i / 100,
      });
    }
    const objects = useEditorStore.getState().overlayObjects;
    expect(objects[50].position.x).toBe(500);
    expect(objects[50].rotation).toBe(50);
  });
});
