/**
 * InlineTextEditor.ts — Inline Text Editor
 *
 * Purpose: Provide a professional inline text editing experience
 * directly on the canvas using contentEditable.
 *
 * Features:
 *   - Blinking caret
 *   - Text selection
 *   - Multi-line support with word wrapping
 *   - Clipboard support (paste plain text)
 *   - Keyboard navigation (arrows, Home, End, Delete, Backspace)
 *   - Placeholder handling
 *   - Exit on Escape, Enter (single-line), click outside
 *   - Auto-cancel when empty
 */

import type { EditableObject } from "../types/objects";

// ── Inline Editor Controller ───────────────────────────────────────
export class InlineTextEditor {
  private _element: HTMLElement | null = null;
  private _active = false;
  private _onFinish: ((content: string) => void) | null = null;
  private _onCancel: (() => void) | null = null;

  /** Start editing a text object on its rendered element. */
  startEditing(
    object: EditableObject,
    element: HTMLElement,
    callbacks: {
      onFinish: (content: string) => void;
      onCancel: () => void;
    },
  ): void {
    // Clean up any previous editing session
    this.stopEditing();

    this._element = element;
    this._active = true;
    this._onFinish = callbacks.onFinish;
    this._onCancel = callbacks.onCancel;

    const textData = (object.data || {}) as Record<string, unknown>;
    const content = (textData.content as string) || "";

    // Transform the element into an editable field
    element.contentEditable = "true";
    element.classList.add("text-object-editing");
    element.spellcheck = true;
    element.style.cursor = "text";
    element.style.outline = "2px solid #4a9eff";
    element.style.outlineOffset = "1px";
    element.style.caretColor = "#000000";
    element.style.userSelect = "text";
    element.style.webkitUserSelect = "text";
    element.style.whiteSpace = "pre-wrap";
    element.style.overflow = "visible";
    element.style.minHeight = "20px";
    element.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
    element.style.borderRadius = "2px";

    // Set initial content and focus
    element.textContent = content;
    this._placeCaretAtEnd(element);

    // Add event listeners
    element.addEventListener("keydown", this._handleKeyDown);
    element.addEventListener("blur", this._handleBlur);
    element.addEventListener("paste", this._handlePaste);
  }

  /** Stop editing and clean up. */
  stopEditing(): void {
    if (!this._element || !this._active) return;

    const el = this._element;
    el.contentEditable = "false";
    el.classList.remove("text-object-editing");
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.cursor = "";
    el.style.userSelect = "";
    el.style.caretColor = "";
    el.style.backgroundColor = "";
    el.style.whiteSpace = "";
    el.style.overflow = "";
    el.style.minHeight = "";

    el.removeEventListener("keydown", this._handleKeyDown);
    el.removeEventListener("blur", this._handleBlur);
    el.removeEventListener("paste", this._handlePaste);

    this._element = null;
    this._active = false;
    this._onFinish = null;
    this._onCancel = null;
  }

  /** Get the current content from the editable element. */
  getContent(): string {
    return this._element?.textContent ?? "";
  }

  /** Whether an editing session is active. */
  get isActive(): boolean {
    return this._active;
  }

  // ── Private Handlers ─────────────────────────────────────────────
  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (!this._active) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this._cancel();
        break;

      case "Enter":
        if (!e.shiftKey) {
          e.preventDefault();
          this._finish();
        }
        // Shift+Enter creates a new line (default behavior)
        break;

      case "Tab":
        e.preventDefault();
        // Insert tab space
        document.execCommand("insertText", false, "  ");
        break;
    }
  };

  private _handleBlur = (): void => {
    // Small delay to allow click events on other elements to fire
    requestAnimationFrame(() => {
      if (this._active) {
        this._finish();
      }
    });
  };

  private _handlePaste = (e: ClipboardEvent): void => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text);
  };

  private _finish(): void {
    if (!this._active) return;
    const content = this.getContent();

    // Auto-cancel if empty
    if (!content || content.trim() === "") {
      this._cancel();
      return;
    }

    this._onFinish?.(content);
    this.stopEditing();
  }

  private _cancel(): void {
    this._onCancel?.();
    this.stopEditing();
  }

  private _placeCaretAtEnd(el: HTMLElement): void {
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    if (sel) {
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

// ── Singleton instance ─────────────────────────────────────────────
export const inlineEditor = new InlineTextEditor();
