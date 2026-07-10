/**
 * KeyboardShortcuts.ts — Keyboard Shortcut Handler
 *
 * Purpose: Register global keyboard shortcuts for editing operations.
 * Integrates with the editor store and clipboard manager.
 *
 * Shortcuts:
 *   Ctrl+C / Cmd+C     — Copy
 *   Ctrl+V / Cmd+V     — Paste
 *   Ctrl+X / Cmd+X     — Cut
 *   Ctrl+D / Cmd+D     — Duplicate
 *   Delete              — Delete selected
 *   Backspace           — Delete selected
 *   Escape              — Clear selection / cancel editing
 *   Enter               — Finish editing (inline editor)
 *   Arrow keys          — Nudge selection (with Shift for 10px)
 *   Ctrl+A / Cmd+A     — Select all (future)
 */

import { useEditorStore } from "../state/editorStore";
import { clipboardManager } from "./ClipboardManager";
import { inlineEditor } from "./InlineTextEditor";
import { commandPipeline } from "../core/CommandPipeline";
import { ToolType } from "../types/tools";
import { MoveObjectCommand } from "../commands/MoveObjectCommand";
import { generateId } from "../utils/id";

// ── Keyboard Shortcuts ─────────────────────────────────────────────
export class KeyboardShortcuts {
  private _attached = false;
  private _handleKeyDown = (e: KeyboardEvent): void => {
    // If inline editor is active, let it handle keyboard first
    if (inlineEditor.isActive) {
      // Inline editor handles its own keys (Escape, Enter)
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;
    const store = useEditorStore.getState();
    const hasSelection = store.selectedIds.length > 0;

    // Tool switching (no modifier keys, only when not in an input field)
    if (!isMod && !e.altKey) {
      const tag = document.activeElement?.tagName ?? "";
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        switch (e.key.toLowerCase()) {
          case "v": store.setActiveTool(ToolType.Select); e.preventDefault(); return;
          case "h": store.setActiveTool(ToolType.Hand); e.preventDefault(); return;
          case "t": store.setActiveTool(ToolType.Text); e.preventDefault(); return;
          case "i": store.setActiveTool(ToolType.Image); e.preventDefault(); return;
          case "r": store.setActiveTool(ToolType.Shape); e.preventDefault(); return;
          case "d": store.setActiveTool(ToolType.Draw); e.preventDefault(); return;
          case "u": store.setActiveTool(ToolType.Highlight); e.preventDefault(); return;
          case "s": store.setActiveTool(ToolType.Signature); e.preventDefault(); return;
          case "p": store.setActiveTool(ToolType.Stamp); e.preventDefault(); return;
          case "e": store.setActiveTool(ToolType.Erase); e.preventDefault(); return;
        }
      }
    }

    // Space → temporary Hand tool (future)

    switch (e.key) {
      case "c":
      case "C":
        if (isMod && hasSelection) {
          e.preventDefault();
          clipboardManager.copy();
        }
        break;

      case "v":
      case "V":
        if (isMod && clipboardManager.canPaste) {
          e.preventDefault();
          clipboardManager.paste();
        }
        break;

      case "x":
      case "X":
        if (isMod && hasSelection) {
          e.preventDefault();
          clipboardManager.cut();
        }
        break;

      case "d":
      case "D":
        if (isMod && hasSelection) {
          e.preventDefault();
          clipboardManager.duplicate();
        }
        break;

      case "a":
      case "A":
        if (isMod) {
          e.preventDefault();
          // Future: select all
        }
        break;

      case "Delete":
      case "Backspace":
        if (hasSelection) {
          e.preventDefault();
          clipboardManager.delete();
        }
        break;

      case "Escape":
        e.preventDefault();
        store.clearSelection();
        break;

      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        if (hasSelection) {
          e.preventDefault();
          this._nudge(e.key, e.shiftKey);
        }
        break;
    }

    // Ctrl+Z / Ctrl+Y undo/redo
    if (isMod && e.key === "z") {
      e.preventDefault();
      commandPipeline.undo();
    }
    if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      commandPipeline.redo();
    }

    // Workspace shortcuts
    if (isMod && e.key === "w") {
      e.preventDefault();
      // Close current tab
      const store = useEditorStore.getState();
      store.reset();
    }
    if (isMod && !e.shiftKey && e.key === "n") {
      e.preventDefault();
      // New document - trigger file input
      document.querySelector<HTMLInputElement>("#pdf-file-input")?.click();
    }
    if (isMod && e.shiftKey && e.key === "s") {
      e.preventDefault();
      // Save As - future
    }
  };

  /** Attach the keyboard shortcut listener. */
  attach(): void {
    if (this._attached) return;
    document.addEventListener("keydown", this._handleKeyDown);
    this._attached = true;
  }

  /** Detach the keyboard shortcut listener. */
  detach(): void {
    if (!this._attached) return;
    document.removeEventListener("keydown", this._handleKeyDown);
    this._attached = false;
  }

  /** Whether the listener is currently attached. */
  get isAttached(): boolean {
    return this._attached;
  }

  // ── Private ──────────────────────────────────────────────────────
  private _nudge(key: string, shift: boolean): void {
    const store = useEditorStore.getState();
    const step = shift ? 10 : 1;

    for (const id of store.selectedIds) {
      const obj = store.overlayObjects.find((o) => o.id === id);
      if (!obj || obj.locked) continue;

      let dx = 0;
      let dy = 0;

      switch (key) {
        case "ArrowUp":
          dy = -step;
          break;
        case "ArrowDown":
          dy = step;
          break;
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
      }

      const newPos = {
        x: obj.position.x + dx,
        y: obj.position.y + dy,
      };
      const cmd = new MoveObjectCommand(`cmd_${generateId()}`, id, obj.position, newPos);
      commandPipeline.execute(cmd);
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const keyboardShortcuts = new KeyboardShortcuts();
