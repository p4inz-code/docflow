/**
 * HighlightRenderer.ts — Highlight Object Renderer
 *
 * Purpose: Render HighlightObject instances as semi-transparent
 * coloured rectangles overlaid on PDF content.
 *
 * Future: Support for multiple regions per highlight (V2).
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, HighlightObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class HighlightRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _highlightObject: HighlightObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._highlightObject = object as HighlightObject;

    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.pointerEvents = "auto";
    this.element.style.borderRadius = "2px";
    this.render();
  }

  render(): void {
    const data = this._highlightObject.data;
    const el = this.element;

    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${this.object.size.width}px`;
    el.style.height = `${this.object.size.height}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${data.opacity ?? 0.3}`;
    el.style.display = this.object.visible ? "block" : "none";

    el.style.backgroundColor = data.color ?? "rgba(255, 255, 0, 0.3)";

    // If there are specific regions, render them as nested divs
    if (data.regions && data.regions.length > 0) {
      el.innerHTML = "";
      for (const region of data.regions) {
        const regionEl = document.createElement("div");
        regionEl.style.position = "absolute";
        regionEl.style.left = `${region.x}px`;
        regionEl.style.top = `${region.y}px`;
        regionEl.style.width = `${region.width}px`;
        regionEl.style.height = `${region.height}px`;
        regionEl.style.backgroundColor = data.color ?? "rgba(255, 255, 0, 0.3)";
        regionEl.style.borderRadius = "1px";
        regionEl.style.pointerEvents = "none";
        el.appendChild(regionEl);
      }
    }
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._highlightObject.data = { ...this._highlightObject.data, ...changes.data };
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
