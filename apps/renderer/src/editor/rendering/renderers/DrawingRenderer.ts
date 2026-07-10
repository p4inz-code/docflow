/**
 * DrawingRenderer.ts — Freehand Drawing Renderer (SVG-based)
 *
 * Purpose: Render DrawingObject instances as SVG path elements
 * within the overlay container.
 *
 * Future: Smoothing, pressure sensitivity, eraser (V3).
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, DrawingObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class DrawingRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _svg: SVGSVGElement;
  private _pathEl: SVGPathElement | null = null;
  private _drawingObject: DrawingObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._drawingObject = object as DrawingObject;

    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.overflow = "visible";
    this.element.style.pointerEvents = "auto";

    this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svg.setAttribute("overflow", "visible");
    this._svg.style.display = "block";
    this.element.appendChild(this._svg);

    this.render();
  }

  render(): void {
    const data = this._drawingObject.data;
    const el = this.element;
    const svg = this._svg;
    const w = this.object.size.width;
    const h = this.object.size.height;

    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${this.object.opacity}`;
    el.style.display = this.object.visible ? "block" : "none";

    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    if (this._pathEl) {
      this._pathEl.remove();
      this._pathEl = null;
    }

    if (data.path) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", data.path);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", data.strokeColor ?? "#000000");
      path.setAttribute("stroke-width", String(data.strokeWidth ?? 2));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      this._pathEl = path;
      svg.appendChild(path);
    }
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._drawingObject.data = { ...this._drawingObject.data, ...changes.data };
    }
    this.render();
  }

  destroy(): void {
    this._pathEl = null;
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
    const data = this._drawingObject.data;
    if (data.path) {
      return {
        x: this.object.position.x,
        y: this.object.position.y,
        width: this.object.size.width,
        height: this.object.size.height,
      };
    }
    return {
      x: this.object.position.x,
      y: this.object.position.y,
      width: this.object.size.width,
      height: this.object.size.height,
    };
  }
}
