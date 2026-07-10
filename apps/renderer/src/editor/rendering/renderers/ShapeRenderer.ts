/**
 * ShapeRenderer.ts — Shape Object Renderer (SVG-based)
 *
 * Purpose: Render ShapeObject instances as absolutely-positioned
 * SVG elements within the overlay container.
 *
 * Supports: rectangle, ellipse, line, arrow, polygon.
 *
 * Future: Custom SVG paths, rounded corners for all shapes (V2).
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, ShapeObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class ShapeRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _svg: SVGSVGElement;
  private _shapeElement: SVGElement | null = null;
  private _shapeObject: ShapeObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._shapeObject = object as ShapeObject;

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
    const data = this._shapeObject.data;
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

    // Remove old shape element
    if (this._shapeElement) {
      this._shapeElement.remove();
      this._shapeElement = null;
    }

    const fill = data.fillColor ?? "transparent";
    const stroke = data.strokeColor ?? "#000000";
    const strokeWidth = data.strokeWidth ?? 2;
    const shapeType = data.shapeType ?? "rectangle";

    switch (shapeType) {
      case "ellipse": {
        const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        ellipse.setAttribute("cx", String(w / 2));
        ellipse.setAttribute("cy", String(h / 2));
        ellipse.setAttribute("rx", String(Math.max(0, w / 2 - strokeWidth / 2)));
        ellipse.setAttribute("ry", String(Math.max(0, h / 2 - strokeWidth / 2)));
        ellipse.setAttribute("fill", fill);
        ellipse.setAttribute("stroke", stroke);
        ellipse.setAttribute("stroke-width", String(strokeWidth));
        this._shapeElement = ellipse;
        break;
      }
      case "line": {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", String(h));
        line.setAttribute("x2", String(w));
        line.setAttribute("y2", "0");
        line.setAttribute("stroke", stroke);
        line.setAttribute("stroke-width", String(strokeWidth));
        line.setAttribute("stroke-linecap", "round");
        this._shapeElement = line;
        break;
      }
      case "arrow": {
        // Arrow body
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const arrowLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        arrowLine.setAttribute("x1", "0");
        arrowLine.setAttribute("y1", String(h));
        arrowLine.setAttribute("x2", String(w));
        arrowLine.setAttribute("y2", "0");
        arrowLine.setAttribute("stroke", stroke);
        arrowLine.setAttribute("stroke-width", String(strokeWidth));
        arrowLine.setAttribute("stroke-linecap", "round");
        g.appendChild(arrowLine);

        // Arrowhead
        const headSize = Math.min(12, w * 0.2);
        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        arrowHead.setAttribute("points", [
          `${w},0`,
          `${w - headSize},${-headSize * 0.4}`,
          `${w - headSize * 0.6},0`,
          `${w - headSize},${headSize * 0.4}`,
        ].join(" "));
        arrowHead.setAttribute("fill", stroke);
        g.appendChild(arrowHead);
        this._shapeElement = g;
        break;
      }
      case "polygon": {
        const points = data.points;
        if (points && points.length >= 3) {
          const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          poly.setAttribute(
            "points",
            points.map((p) => `${p.x},${p.y}`).join(" "),
          );
          poly.setAttribute("fill", fill);
          poly.setAttribute("stroke", stroke);
          poly.setAttribute("stroke-width", String(strokeWidth));
          poly.setAttribute("stroke-linejoin", "round");
          this._shapeElement = poly;
        }
        break;
      }
      default: {
        // Rectangle (default)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(strokeWidth / 2));
        rect.setAttribute("y", String(strokeWidth / 2));
        rect.setAttribute("width", String(Math.max(0, w - strokeWidth)));
        rect.setAttribute("height", String(Math.max(0, h - strokeWidth)));
        rect.setAttribute("fill", fill);
        rect.setAttribute("stroke", stroke);
        rect.setAttribute("stroke-width", String(strokeWidth));
        rect.setAttribute("rx", String(data.cornerRadius ?? 0));
        rect.setAttribute("ry", String(data.cornerRadius ?? 0));
        this._shapeElement = rect;
        break;
      }
    }

    if (this._shapeElement) {
      svg.appendChild(this._shapeElement);
    }
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._shapeObject.data = { ...this._shapeObject.data, ...changes.data };
    }
    this.render();
  }

  destroy(): void {
    this._shapeElement = null;
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
