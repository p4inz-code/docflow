/**
 * SignatureRenderer.ts — Signature Object Renderer
 *
 * Purpose: Render SignatureObject instances as absolutely-positioned
 * img elements within the overlay container.
 */

import type { ObjectRenderer } from "../../types/rendering";
import type { EditableObject, SignatureObject } from "../../types/objects";
import type { Point, Rect } from "../../types/editor";

export class SignatureRenderer implements ObjectRenderer {
  readonly object: EditableObject;
  readonly element: HTMLElement;
  private _img: HTMLImageElement;
  private _signatureObject: SignatureObject;

  constructor(object: EditableObject) {
    this.object = object;
    this._signatureObject = object as SignatureObject;

    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.overflow = "hidden";
    this.element.style.pointerEvents = "auto";

    this._img = document.createElement("img");
    this._img.style.width = "100%";
    this._img.style.height = "100%";
    this._img.style.objectFit = "contain";
    this._img.style.display = "block";
    this._img.draggable = false;
    this.element.appendChild(this._img);

    this.render();
  }

  render(): void {
    const data = this._signatureObject.data;
    const el = this.element;

    el.style.left = `${this.object.position.x}px`;
    el.style.top = `${this.object.position.y}px`;
    el.style.width = `${this.object.size.width}px`;
    el.style.height = `${this.object.size.height}px`;
    el.style.transform = `rotate(${this.object.rotation}deg)`;
    el.style.opacity = `${this.object.opacity}`;
    el.style.display = this.object.visible ? "block" : "none";

    if (data.src) {
      this._img.src = data.src;
    }
  }

  update(changes: Partial<EditableObject>): void {
    Object.assign(this.object, changes);
    if (changes.data) {
      this._signatureObject.data = { ...this._signatureObject.data, ...changes.data };
    }
    this.render();
  }

  destroy(): void {
    this._img.src = "";
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
