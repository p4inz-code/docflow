/**
 * TextRenderer.ts — Text Object Renderer
 *
 * Purpose: Render TextObject instances as absolutely-positioned
 * HTML div elements styled to match the object's data.
 *
 * Supports:
 *   - Professional anti-aliased rendering via CSS
 *   - Proper line spacing, alignment, word wrapping
 *   - Overflow handling and clipping
 *   - Transparency and rotation
 *   - Zoom/pan compatibility (via parent transform)
 *   - Editing mode styling (contentEditable)
 *   - Selection highlight
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, TextObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class TextRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _textObject: TextObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._textObject = object as TextObject;
    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.pointerEvents = "auto";
    this.element.style.overflow = "hidden";
    this.element.style.wordWrap = "break-word";
    this.element.style.overflowWrap = "break-word";
    this.element.style.whiteSpace = "pre-wrap";
    this.element.style.boxSizing = "border-box";
    this.element.style.borderRadius = "2px";
    (this.element.style as unknown as Record<string, string>)["fontSmooth"] = "antialiased";
    (this.element.style as unknown as Record<string, string>)["webkitFontSmoothing"] = "antialiased";
    (this.element.style as unknown as Record<string, string>)["MozOsxFontSmoothing"] = "grayscale";
    this.element.style.transition = "box-shadow 0.15s ease";
    this.render();
  }

  render(): void {
    const data = this._textObject.data;
    const el = this.element;

    // Position and transform
    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${this.object.size.width}px`;
    el.style.height = `${this.object.size.height}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${this.object.opacity}`;
    el.style.display = this.object.visible ? "block" : "none";

    // Typography
    el.style.fontFamily = data.fontFamily ?? "Inter, system-ui, sans-serif";
    el.style.fontSize = `${data.fontSize ?? 16}px`;
    el.style.fontWeight = `${data.fontWeight ?? 400}`;
    el.style.fontStyle = "normal";
    el.style.color = data.color ?? "#000000";
    el.style.textAlign = data.textAlign ?? "left";
    el.style.lineHeight = `${data.lineHeight ?? 1.4}`;
    el.style.letterSpacing = "normal";

    // Background & border (for highlighted visibility)
    el.style.backgroundColor = "transparent";
    el.style.border = "none";

    // Content
    const content = data.content ?? "";
    el.textContent = content;

    // Selection outline
    if (this.object.selected && !el.isContentEditable) {
      el.style.outline = "2px solid #4a9eff";
      el.style.outlineOffset = "1px";
    } else {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }

    // Hover effect
    el.style.cursor = "move";
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._textObject.data = { ...this._textObject.data, ...changes.data };
    }
    this.render();
  }

  destroy(): void {
    // Clean up if editing
    if (this.element.isContentEditable) {
      this.element.contentEditable = "false";
    }
    this.element.remove();
  }

  hitTest(point: Point): boolean {
    return (
      point.x >= this.object.position.x &&
      point.x <= this.object.position.x + this.object.size.width &&
      point.y >= this.object.position.y &&
      point.y <= this.object.position.y + this.object.size.height
    );
  }

  getBounds(): Rect {
    return {
      x: this.object.position.x,
      y: this.object.position.y,
      width: this.object.size.width,
      height: this.object.size.height,
    };
  }
}
