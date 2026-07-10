/**
 * RenderingManager.ts — Central Rendering Manager
 *
 * Purpose: Coordinate overlay rendering across all pages.
 * Acts as the bridge between the editor store and the DOM,
 * managing page overlay containers, renderers, and scheduling.
 *
 * Responsibilities:
 *   - Register renderer factories by object type
 *   - Create/destroy page overlay containers
 *   - Mount, update, and unmount object renderers
 *   - Delegate dirty objects to the render scheduler
 *   - Maintain the render lifecycle for every object
 *
 * Future (V2–V4):
 *   - Virtual page rendering (skip off-screen pages)
 *   - Canvas-based rendering for selected types
 *   - Render cache for static objects
 */

import type { EditableObject, ObjectType } from "../types/objects";
import type {
  ObjectRenderer,
  RendererFactory,
  PageOverlayContainer,
  RenderStats,
} from "../types/rendering";
import { RenderLifecycle } from "../types/rendering";
import { ObjectRegistry } from "./ObjectRegistry";
import { DirtyTracker } from "./DirtyTracker";
import { RenderScheduler } from "./RenderScheduler";
import { ZIndexManager } from "./renderOrder";
import {
  TextRenderer,
  ImageRenderer,
  ShapeRenderer,
  DrawingRenderer,
  HighlightRenderer,
  SignatureRenderer,
  StampRenderer,
} from "./renderers";

// ── Rendering Manager ──────────────────────────────────────────────
export class RenderingManager {
  /** Registry for overlay containers by page number. */
  private _containers = new Map<number, PageOverlayContainer>();
  /** Map of object type → renderer factory. */
  private _rendererFactories = new Map<ObjectType, RendererFactory>();
  /** Object registry for lookups. */
  private _registry = new ObjectRegistry();
  /** Dirty tracker for change detection. */
  private _dirtyTracker = new DirtyTracker();
  /** Render scheduler for batching. */
  private _scheduler = new RenderScheduler();
  /** Z-index manager for stacking order. */
  private _zIndex = new ZIndexManager();

  constructor() {
    this._registerDefaultRenderers();
    this._scheduler.onRender = (dirty) => this._processDirty(dirty);
  }

  // ── Renderer Registration ────────────────────────────────────────
  /** Register a custom renderer factory for a specific object type. */
  registerRenderer(type: ObjectType, factory: RendererFactory): void {
    this._rendererFactories.set(type, factory);
  }

  // ── Page Container Management ────────────────────────────────────
  /**
   * Create an overlay container for a given page inside the wrapper element.
   * The wrapper should already contain the PDF canvas.
   */
  createPageContainer(page: number, wrapper: HTMLElement): void {
    if (this._containers.has(page)) {
      this.destroyPageContainer(page);
    }

    // Create overlay container
    const container = document.createElement("div");
    container.className = "pdf-overlay-container";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.overflow = "hidden";

    // Selection layer (on top of overlays)
    const selectionLayer = document.createElement("div");
    selectionLayer.className = "pdf-overlay-selection";
    selectionLayer.style.position = "absolute";
    selectionLayer.style.top = "0";
    selectionLayer.style.left = "0";
    selectionLayer.style.width = "100%";
    selectionLayer.style.height = "100%";
    selectionLayer.style.pointerEvents = "none";

    // Interaction layer (on top of selection)
    const interactionLayer = document.createElement("div");
    interactionLayer.className = "pdf-overlay-interaction";
    interactionLayer.style.position = "absolute";
    interactionLayer.style.top = "0";
    interactionLayer.style.left = "0";
    interactionLayer.style.width = "100%";
    interactionLayer.style.height = "100%";
    interactionLayer.style.pointerEvents = "none";

    container.appendChild(selectionLayer);
    container.appendChild(interactionLayer);
    wrapper.appendChild(container);
    wrapper.style.position = "relative";

    this._containers.set(page, {
      page,
      container,
      selectionLayer,
      interactionLayer,
      renderers: new Map(),
    });
  }

  /** Remove an overlay container for a given page. */
  destroyPageContainer(page: number): void {
    const entry = this._containers.get(page);
    if (!entry) return;

    // Destroy all renderers for this page
    for (const renderer of entry.renderers.values()) {
      renderer.destroy();
    }
    entry.renderers.clear();
    entry.container.remove();
    this._containers.delete(page);
  }

  /** Destroy all page containers. */
  destroyAllContainers(): void {
    for (const page of Array.from(this._containers.keys())) {
      this.destroyPageContainer(page);
    }
  }

  // ── Object Lifecycle ─────────────────────────────────────────────
  /** Mount an object into its page's overlay container. */
  mountObject(object: EditableObject): void {
    const entry = this._containers.get(object.page);
    if (!entry) return;

    const factory = this._rendererFactories.get(object.type);
    if (!factory) return;

    const renderer = factory(object);
    const zIndex = this._zIndex.assign(object);

    renderer.element.style.zIndex = String(zIndex);
    entry.container.insertBefore(renderer.element, entry.selectionLayer);
    entry.renderers.set(object.id, renderer);
    this._registry.register(object);
    this._dirtyTracker.markCreated(object.id);
    this._scheduler.schedule(object.id, { created: true });
  }

  /** Update a mounted object with new properties. */
  updateObject(id: string, changes: Partial<EditableObject>): void {
    const renderer = this._findRenderer(id);
    if (!renderer) return;

    renderer.update(changes);
    this._registry.getById(id);
    this._dirtyTracker.markUpdated(id);
    this._scheduler.schedule(id, { updated: true });
  }

  /** Unmount and destroy an object's renderer. */
  unmountObject(id: string): void {
    for (const entry of this._containers.values()) {
      const renderer = entry.renderers.get(id);
      if (renderer) {
        renderer.destroy();
        entry.renderers.delete(id);
        this._registry.unregister(id);
        this._zIndex.remove(id);
        this._dirtyTracker.markDeleted(id);
        this._scheduler.schedule(id, { deleted: true });
        return;
      }
    }
  }

  /** Update the selection visual state of an object. */
  setObjectSelection(id: string, selected: boolean): void {
    const renderer = this._findRenderer(id);
    if (!renderer) return;

    if (selected) {
      this._registry.select(id);
    } else {
      this._registry.deselect(id);
    }

    renderer.element.classList.toggle("selected", selected);
    renderer.element.style.outline = selected ? "2px solid #4a9eff" : "";
    renderer.element.style.outlineOffset = selected ? "1px" : "";

    this._dirtyTracker.markSelectionChanged(id);
    this._scheduler.schedule(id, { selected: true });
  }

  /** Clear all objects from the overlay. */
  clearAll(): void {
    this.destroyAllContainers();
    this._registry.clear();
    this._dirtyTracker.clear();
    this._scheduler.clear();
    this._zIndex.clear();
  }

  // ── Queries ──────────────────────────────────────────────────────
  /** Get the overlay container for a page, or null. */
  getContainer(page: number): PageOverlayContainer | null {
    return this._containers.get(page) ?? null;
  }

  /** Get the renderer for a specific object, or null. */
  getRenderer(id: string): ObjectRenderer | null {
    return this._findRenderer(id);
  }

  /** Get the object registry. */
  get registry(): ObjectRegistry {
    return this._registry;
  }

  /** Get the z-index manager. */
  get zIndex(): ZIndexManager {
    return this._zIndex;
  }

  /** Get the dirty tracker. */
  get dirtyTracker(): DirtyTracker {
    return this._dirtyTracker;
  }

  /** Get the render scheduler. */
  get scheduler(): RenderScheduler {
    return this._scheduler;
  }

  /** Collect render statistics. */
  getStats(): RenderStats {
    let totalObjects = 0;
    for (const entry of this._containers.values()) {
      totalObjects += entry.renderers.size;
    }

    return {
      totalPages: this._containers.size,
      totalObjects,
      visibleObjects: this._registry.getAll().filter((o) => o.visible).length,
      dirtyObjects: this._dirtyTracker.dirtyCount,
      lastRenderTime: Date.now(),
    };
  }

  // ── Private ──────────────────────────────────────────────────────
  private _registerDefaultRenderers(): void {
    this._rendererFactories.set("text" as ObjectType, (obj) => new TextRenderer(obj));
    this._rendererFactories.set("image" as ObjectType, (obj) => new ImageRenderer(obj));
    this._rendererFactories.set("shape" as ObjectType, (obj) => new ShapeRenderer(obj));
    this._rendererFactories.set("drawing" as ObjectType, (obj) => new DrawingRenderer(obj));
    this._rendererFactories.set("highlight" as ObjectType, (obj) => new HighlightRenderer(obj));
    this._rendererFactories.set("signature" as ObjectType, (obj) => new SignatureRenderer(obj));
    this._rendererFactories.set("stamp" as ObjectType, (obj) => new StampRenderer(obj));
  }

  private _findRenderer(id: string): ObjectRenderer | null {
    for (const entry of this._containers.values()) {
      const renderer = entry.renderers.get(id);
      if (renderer) return renderer;
    }
    return null;
  }

  private _processDirty(_dirty: Map<string, unknown>): void {
    // Future: process dirty objects in batch
    this._dirtyTracker.clear();
  }
}
