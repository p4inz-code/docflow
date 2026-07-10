/**
 * StampRenderer.ts — Stamp Object Renderer
 *
 * Purpose: Render StampObject instances as styled div elements
 * that mimic physical document stamps (e.g. "APPROVED", "DRAFT").
 *
 * Each stamp renders with a coloured border, rotation, and
 * semi-transparent fill to simulate a stamped appearance.
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, StampObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class StampRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _stampObject: StampObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._stampObject = object as StampObject;

    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.display = "flex";
    this.element.style.alignItems = "center";
    this.element.style.justifyContent = "center";
    this.element.style.pointerEvents = "auto";
    this.element.style.boxSizing = "border-box";
    this.element.style.fontWeight = "bold";
    this.element.style.textTransform = "uppercase";
    this.element.style.letterSpacing = "1px";

    this.render();
  }

  render(): void {
    const data = this._stampObject.data;
    const el = this.element;

    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${this.object.size.width}px`;
    el.style.height = `${this.object.size.height}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${this.object.opacity}`;
    el.style.display = this.object.visible ? "flex" : "none";

    const color = data.color ?? "#ff0000";
    el.style.color = color;
    el.style.border = `3px solid ${color}`;
    el.style.backgroundColor = `${color}1A`; // 10% opacity
    el.style.borderRadius = "4px";
    el.style.fontSize = `${Math.min(this.object.size.width * 0.15, 18)}px`;

    el.textContent = data.text ?? data.presetName ?? "STAMP";
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._stampObject.data = { ...this._stampObject.data, ...changes.data };
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
