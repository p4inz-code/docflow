/**
 * WhiteoutRenderer.ts — Whiteout Object Renderer
 *
 * Purpose: Render WhiteoutObject instances as absolutely-positioned
 * white rectangles that cover original PDF content during text replacement.
 *
 * Whiteout objects are regular overlay objects that must survive page
 * virtualization exactly like all other overlay types.
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class WhiteoutRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;

  constructor(object: EditableObject) {
    this.object = object;
    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.pointerEvents = "auto";
    this.element.style.borderRadius = "2px";
    this.element.style.boxSizing = "border-box";
    this.render();
  }

  render(): void {
    const data = this.object.data as Record<string, unknown>;
    const el = this.element;

    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${this.object.size.width}px`;
    el.style.height = `${this.object.size.height}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${this.object.opacity}`;
    el.style.display = this.object.visible ? "block" : "none";

    el.style.backgroundColor = (data.fillColor as string) ?? "#ffffff";
    el.style.border = "none";

    const radius = (data.cornerRadius as number) ?? 0;
    el.style.borderRadius = `${radius}px`;
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this.object.data = { ...this.object.data, ...changes.data };
    }
    this.render();
  }

  destroy(): void {
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
