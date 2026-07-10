/**
 * ToolSystem.ts — Generic Tool System & Tool Manager
 *
 * Purpose: Provide a registry for tool instances and manage the
 * active tool lifecycle.
 *
 * The ToolManager holds all tool instances in a Map. When the
 * active tool changes it calls onDeactivate on the previous tool
 * and onActivate on the new one. The InteractionManager consults
 * the ToolManager to find the current tool before routing events.
 *
 * Tools are created lazily and cached after first instantiation.
 */

import type { Tool, ToolType } from "../types/tools";

// ── Tool Manager ───────────────────────────────────────────────────
export class ToolManager {
  /** Registered tool factories. */
  private _factories = new Map<ToolType, () => Tool>();
  /** Cached tool instances. */
  private _instances = new Map<ToolType, Tool>();
  /** Currently active tool. */
  private _activeTool: Tool | null = null;

  /**
   * Register a tool factory. Overwrites any previous factory for
   * the same tool type.
   */
  register(type: ToolType, factory: () => Tool): void {
    this._factories.set(type, factory);
    // Invalidate cached instance so next activation uses the new factory.
    this._instances.delete(type);
  }

  /** Unregister a tool type. */
  unregister(type: ToolType): void {
    this._factories.delete(type);
    this._instances.delete(type);
  }

  /**
   * Retrieve (or create) a tool instance by type.
   * Returns null if no factory is registered.
   */
  getTool(type: ToolType): Tool | null {
    const cached = this._instances.get(type);
    if (cached) return cached;

    const factory = this._factories.get(type);
    if (!factory) return null;

    const tool = factory();
    this._instances.set(type, tool);
    return tool;
  }

  /** Return the currently active tool, or null. */
  get activeTool(): Tool | null {
    return this._activeTool;
  }

  /** Activate a tool by type. Deactivates the previous tool. */
  activate(type: ToolType): void {
    const next = this.getTool(type);
    if (!next || next === this._activeTool) return;

    this._activeTool?.onDeactivate();
    this._activeTool = next;
    this._activeTool.onActivate();
  }

  /** Deactivate the current tool without activating another. */
  deactivate(): void {
    this._activeTool?.onDeactivate();
    this._activeTool = null;
  }

  /** Remove all registered tools and deactivate. */
  clear(): void {
    this.deactivate();
    this._factories.clear();
    this._instances.clear();
  }
}
