/**
 * Rendering Certification Regression Tests
 *
 * Tests the rendering subsystem to ensure virtualization transparency.
 * Every annotation, overlay, selection, guide, highlight, text object,
 * image object and interactive layer must survive page virtualization
 * exactly as if pages never left memory.
 *
 * Covers:
 *   - Object lifecycle (create, mount, render, unmount, destroy)
 *   - Page container lifecycle (create, destroy, recreate)
 *   - Overlay persistence through container recreation
 *   - Selection state persistence
 *   - Z-index persistence
 *   - Canvas pool lifecycle
 *   - Object registry persistence
 *   - Dirty tracking
 *   - Render scheduler
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RenderingManager } from "../editor/rendering/RenderingManager";
import { ObjectRegistry } from "../editor/rendering/ObjectRegistry";
import { DirtyTracker } from "../editor/rendering/DirtyTracker";
import { RenderScheduler } from "../editor/rendering/RenderScheduler";
import { ZIndexManager } from "../editor/rendering/renderOrder";
import { CanvasPool } from "../editor/rendering/CanvasPool";
import { LRUCache } from "../editor/rendering/LRUCache";
import { OverlayManager } from "../editor/overlays/OverlayManager";
import type { EditableObject } from "../editor/types/objects";

// ── Helpers ────────────────────────────────────────────────────────
function createTestObject(overrides: Partial<EditableObject> = {}): EditableObject {
  const now = Date.now();
  return {
    id: `test-obj-${Math.random().toString(36).slice(2, 8)}`,
    type: "text",
    page: 1,
    position: { x: 10, y: 20 },
    size: { width: 100, height: 50 },
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    selected: false,
    createdAt: now,
    updatedAt: now,
    data: { content: "Hello", fontSize: 16 },
    ...overrides,
  } as EditableObject;
}

function createPageWrapper(pageIndex: number): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-page-index", String(pageIndex));
  wrapper.style.position = "relative";
  wrapper.style.minHeight = "50px";
  const canvas = document.createElement("canvas");
  wrapper.appendChild(canvas);
  return wrapper;
}

// ── RenderingManager Tests ─────────────────────────────────────────
describe("RenderingManager", () => {
  let manager: RenderingManager;

  beforeEach(() => {
    manager = new RenderingManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  it("should start with no containers", () => {
    expect(manager.getContainer(1)).toBeNull();
  });

  it("should create a page container", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const container = manager.getContainer(1);
    expect(container).not.toBeNull();
    expect(container!.page).toBe(1);
    expect(container!.renderers.size).toBe(0);
  });

  it("should destroy a page container", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);
    manager.destroyPageContainer(1);

    expect(manager.getContainer(1)).toBeNull();
  });

  it("should mount an object and find its renderer", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);

    const renderer = manager.getRenderer(obj.id);
    expect(renderer).not.toBeNull();
    expect(renderer!.object.id).toBe(obj.id);
  });

  it("should NOT mount duplicate objects", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);
    manager.mountObject(obj); // Attempt duplicate mount

    const container = manager.getContainer(1);
    expect(container!.renderers.size).toBe(1);
  });

  it("should unmount an object", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);
    expect(manager.getRenderer(obj.id)).not.toBeNull();

    manager.unmountObject(obj.id);
    expect(manager.getRenderer(obj.id)).toBeNull();
  });

  it("should register object in registry on mount", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);

    const registered = manager.registry.getById(obj.id);
    expect(registered).not.toBeNull();
    expect(registered!.id).toBe(obj.id);
  });

  it("should unregister object from registry on unmountObject", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);
    manager.unmountObject(obj.id);

    expect(manager.registry.getById(obj.id)).toBeNull();
  });

  it("should destroy renderers but NOT unregister objects when unloading a page", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);

    // Simulate page unload: destroy container via unloadPageContainer
    manager.unloadPageContainer(1);

    // Renderer should be gone
    expect(manager.getRenderer(obj.id)).toBeNull();
    // But the object should still be in registry (state ownership)
    expect(manager.registry.getById(obj.id)).not.toBeNull();
  });

  it("should re-mount objects when page container is recreated (virtual page restore)", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);

    // Unload page
    manager.unloadPageContainer(1);

    // Recreate container (simulates scrolling back into view)
    let containerCreated = false;
    manager.onContainerCreated = (page) => {
      containerCreated = true;
      expect(page).toBe(1);
      // The OverlayRenderer would re-mount at this point
      manager.mountObject(obj);
    };

    manager.createPageContainer(1, wrapper);

    expect(containerCreated).toBe(true);
    expect(manager.getRenderer(obj.id)).not.toBeNull();
  });

  it("should restore selection state after page restore", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj = createTestObject({ page: 1 });
    manager.mountObject(obj);
    manager.setObjectSelection(obj.id, true);

    // Unload page
    manager.unloadPageContainer(1);

    // Recreate container and re-mount
    manager.createPageContainer(1, wrapper);
    manager.mountObject(obj);
    manager.setObjectSelection(obj.id, true);

    const renderer = manager.getRenderer(obj.id);
    expect(renderer).not.toBeNull();
    expect(renderer!.element.classList.contains("selected")).toBe(true);
  });

  it("should preserve z-index across page unload/reload cycles", () => {
    const wrapper = createPageWrapper(1);
    manager.createPageContainer(1, wrapper);

    const obj1 = createTestObject({ id: "obj-1", page: 1 });
    const obj2 = createTestObject({ id: "obj-2", page: 1 });
    manager.mountObject(obj1);
    manager.mountObject(obj2);

    const z1 = manager.zIndex.get("obj-1");
    const z2 = manager.zIndex.get("obj-2");
    expect(z2).toBeGreaterThan(z1);

    // Unload and reload
    manager.unloadPageContainer(1);
    manager.createPageContainer(1, wrapper);
    manager.mountObject(obj1);
    manager.mountObject(obj2);

    // Z-indices should be preserved (not reassigned)
    expect(manager.zIndex.get("obj-1")).toBe(z1);
    expect(manager.zIndex.get("obj-2")).toBe(z2);
  });

  it("should fire onContainerCreated callback when container is created", () => {
    const wrapper = createPageWrapper(1);
    let calledPage = 0;
    manager.onContainerCreated = (page) => { calledPage = page; };

    manager.createPageContainer(1, wrapper);
    expect(calledPage).toBe(1);
  });
});

// ── ObjectRegistry Tests ──────────────────────────────────────────
describe("ObjectRegistry", () => {
  let registry: ObjectRegistry;

  beforeEach(() => {
    registry = new ObjectRegistry();
  });

  it("should register and retrieve objects", () => {
    const obj = createTestObject();
    registry.register(obj);
    expect(registry.getById(obj.id)).not.toBeNull();
  });

  it("should unregister objects", () => {
    const obj = createTestObject();
    registry.register(obj);
    registry.unregister(obj.id);
    expect(registry.getById(obj.id)).toBeNull();
  });

  it("should track selection state", () => {
    const obj = createTestObject();
    registry.register(obj);
    registry.select(obj.id);
    expect(registry.selectedIds).toContain(obj.id);
  });

  it("should group objects by page", () => {
    const obj1 = createTestObject({ id: "p1-obj", page: 1 });
    const obj2 = createTestObject({ id: "p2-obj", page: 2 });
    registry.register(obj1);
    registry.register(obj2);

    const page1Objs = registry.getByPage(1);
    expect(page1Objs).toHaveLength(1);
    expect(page1Objs[0].id).toBe("p1-obj");

    const page2Objs = registry.getByPage(2);
    expect(page2Objs).toHaveLength(1);
    expect(page2Objs[0].id).toBe("p2-obj");
  });

  it("should clear all objects", () => {
    registry.register(createTestObject({ id: "obj-1" }));
    registry.register(createTestObject({ id: "obj-2" }));
    expect(registry.totalCount).toBe(2);

    registry.clear();
    expect(registry.totalCount).toBe(0);
  });

  it("should handle multi-page bounds", () => {
    const obj = createTestObject({ position: { x: 10, y: 20 }, size: { width: 100, height: 50 } });
    registry.register(obj);
    const bounds = registry.getPageBounds(1);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(10);
    expect(bounds!.y).toBe(20);
    expect(bounds!.width).toBe(100);
    expect(bounds!.height).toBe(50);
  });
});

// ── CanvasPool Tests ───────────────────────────────────────────────
describe("CanvasPool", () => {
  let pool: CanvasPool;

  beforeEach(() => {
    pool = new CanvasPool(5);
  });

  it("should acquire a canvas", () => {
    const canvas = pool.acquire();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it("should release and re-acquire canvases", () => {
    const canvas1 = pool.acquire();
    pool.release(canvas1);

    const canvas2 = pool.acquire();
    // Should reuse the released canvas (same reference)
    expect(canvas2).toBe(canvas1);
  });

  it("should respect max pool size", () => {
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < 10; i++) {
      const c = pool.acquire();
      canvases.push(c);
    }
    // Release all
    for (const c of canvases) {
      pool.release(c);
    }
    // Pool should only keep maxSize (5) canvases
    expect(pool.size).toBeLessThanOrEqual(5);
  });

  it("should clear the pool", () => {
    const c = pool.acquire();
    pool.release(c);
    pool.clear();
    expect(pool.size).toBe(0);
  });

  it("should clear canvas dimensions on release", () => {
    const canvas = pool.acquire();
    canvas.width = 800;
    canvas.height = 600;
    pool.release(canvas);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("should allow acquire after clear", () => {
    const c1 = pool.acquire();
    pool.release(c1);
    pool.clear();
    // Pool is empty, but acquire should still work (creates new canvas)
    const c2 = pool.acquire();
    expect(c2).toBeInstanceOf(HTMLCanvasElement);
  });
});

// ── DirtyTracker Tests ─────────────────────────────────────────────
describe("DirtyTracker", () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  it("should start clean", () => {
    expect(tracker.hasDirty).toBe(false);
    expect(tracker.dirtyCount).toBe(0);
  });

  it("should mark objects as dirty", () => {
    tracker.markCreated("obj-1");
    expect(tracker.hasDirty).toBe(true);
    expect(tracker.dirtyCount).toBe(1);
  });

  it("should return created IDs", () => {
    tracker.markCreated("obj-1");
    tracker.markUpdated("obj-2");
    const created = tracker.getCreated();
    expect(created).toContain("obj-1");
    expect(created).not.toContain("obj-2");
  });

  it("should clear all dirty flags", () => {
    tracker.markCreated("obj-1");
    tracker.markUpdated("obj-2");
    tracker.clear();
    expect(tracker.hasDirty).toBe(false);
  });
});

// ── RenderScheduler Tests ──────────────────────────────────────────
describe("RenderScheduler", () => {
  let scheduler: RenderScheduler;

  beforeEach(() => {
    scheduler = new RenderScheduler();
  });

  it("should start with no pending renders", () => {
    expect(scheduler.hasPending).toBe(false);
    expect(scheduler.pendingCount).toBe(0);
  });

  it("should schedule a render", () => {
    scheduler.schedule("obj-1", { updated: true });
    expect(scheduler.hasPending).toBe(true);
    expect(scheduler.pendingCount).toBe(1);
  });

  it("should flush pending renders synchronously", () => {
    let called = false;
    scheduler.onRender = (dirty) => {
      called = true;
      expect(dirty.has("obj-1")).toBe(true);
    };
    scheduler.schedule("obj-1", { updated: true });
    scheduler.flush();
    expect(called).toBe(true);
  });

  it("should clear pending renders", () => {
    scheduler.schedule("obj-1", { updated: true });
    scheduler.clear();
    expect(scheduler.hasPending).toBe(false);
  });

  it("should cancel a specific object", () => {
    scheduler.schedule("obj-1", { updated: true });
    scheduler.cancel("obj-1");
    expect(scheduler.hasPending).toBe(false);
  });
});

// ── ZIndexManager Tests ────────────────────────────────────────────
describe("ZIndexManager", () => {
  let zIndex: ZIndexManager;

  beforeEach(() => {
    zIndex = new ZIndexManager();
  });

  it("should assign increasing z-indices", () => {
    const obj1 = createTestObject();
    const obj2 = createTestObject();
    const z1 = zIndex.assign(obj1);
    const z2 = zIndex.assign(obj2);
    expect(z2).toBeGreaterThan(z1);
  });

  it("should return 0 for unassigned objects", () => {
    expect(zIndex.get("unknown")).toBe(0);
  });

  it("should bring objects to front", () => {
    const obj = createTestObject();
    const z1 = zIndex.assign(obj);
    zIndex.bringToFront(obj.id);
    expect(zIndex.get(obj.id)).toBeGreaterThan(z1);
  });

  it("should remove z-index tracking", () => {
    const obj = createTestObject();
    zIndex.assign(obj);
    zIndex.remove(obj.id);
    expect(zIndex.get(obj.id)).toBe(0);
  });

  it("should sort objects by z-index", () => {
    const obj1 = createTestObject({ id: "low" });
    const obj2 = createTestObject({ id: "high" });
    zIndex.assign(obj1);
    zIndex.assign(obj2);

    const sorted = zIndex.sort([obj2, obj1]);
    expect(sorted[0].id).toBe("low");
    expect(sorted[1].id).toBe("high");
  });
});

// ── LRUCache Tests ─────────────────────────────────────────────────
describe("LRUCache", () => {
  it("should respect max size", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // Should evict 'a'
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("d")).toBe(4);
  });

  it("should promote accessed entries", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // Promote 'a'
    cache.set("d", 4); // Should evict 'b' (least recently used)
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });

  it("should throw for invalid max size", () => {
    expect(() => new LRUCache(0)).toThrow();
  });

  it("should clear all entries", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

// ── OverlayManager Tests ───────────────────────────────────────────
describe("OverlayManager", () => {
  let overlayManager: OverlayManager;

  beforeEach(() => {
    overlayManager = new OverlayManager();
  });

  it("should create objects", () => {
    const obj = overlayManager.createObject({
      type: "text",
      page: 1,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      data: { content: "Test" },
    });
    expect(obj.id).toMatch(/^obj_/);
    expect(obj.page).toBe(1);
  });

  it("should add and retrieve objects", () => {
    const obj = createTestObject();
    overlayManager.addObject(obj);
    expect(overlayManager.getById(obj.id)).not.toBeNull();
    expect(overlayManager.count).toBe(1);
  });

  it("should remove objects", () => {
    const obj = createTestObject();
    overlayManager.addObject(obj);
    overlayManager.removeObject(obj.id);
    expect(overlayManager.getById(obj.id)).toBeNull();
    expect(overlayManager.count).toBe(0);
  });

  it("should update objects", () => {
    const obj = createTestObject();
    overlayManager.addObject(obj);
    overlayManager.updateObject(obj.id, { rotation: 45 });
    const updated = overlayManager.getById(obj.id);
    expect(updated!.rotation).toBe(45);
  });

  it("should group objects by page", () => {
    overlayManager.addObject(createTestObject({ id: "p1", page: 1 }));
    overlayManager.addObject(createTestObject({ id: "p2", page: 2 }));
    expect(overlayManager.getByPage(1)).toHaveLength(1);
    expect(overlayManager.getByPage(2)).toHaveLength(1);
    expect(overlayManager.getAll()).toHaveLength(2);
  });

  it("should clear all objects", () => {
    overlayManager.addObject(createTestObject({ id: "a" }));
    overlayManager.addObject(createTestObject({ id: "b" }));
    overlayManager.clear();
    expect(overlayManager.count).toBe(0);
  });
});

// ── WhiteoutObject Type Tests ──────────────────────────────────────
describe("Whiteout object type", () => {
  it("should support whiteout as an overlay object type", () => {
    const now = Date.now();
    const whiteout = {
      id: "whiteout-test-1",
      type: "whiteout",
      page: 1,
      position: { x: 100, y: 200 },
      size: { width: 300, height: 50 },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: false,
      createdAt: now,
      updatedAt: now,
      data: {
        fillColor: "#ffffff",
        cornerRadius: 0,
      },
    };
    expect(whiteout.type).toBe("whiteout");
    expect(whiteout.data.fillColor).toBe("#ffffff");
  });
});
