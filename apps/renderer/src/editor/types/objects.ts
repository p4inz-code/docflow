/**
 * objects.ts — Editable Document Object Model
 *
 * Purpose: Define the universal base interface that every editable
 * object on a page must conform to, along with concrete object-type
 * unions and creation-payload types.
 *
 * Every future object type (Text, Image, Shape, Drawing, Highlight,
 * Signature, Stamp) must derive from EditableObjectBase.
 *
 * Architecture decision: We use a discriminated union on the `type`
 * property so that tools and commands can narrow the object type
 * via standard TypeScript control flow.
 */

import type { Point, Rect, Size } from "./editor";

// ── Object Type Discriminant ───────────────────────────────────────
export const ObjectType = {
  Text: "text",
  Image: "image",
  Shape: "shape",
  Drawing: "drawing",
  Highlight: "highlight",
  Signature: "signature",
  Stamp: "stamp",
} as const;

export type ObjectType = (typeof ObjectType)[keyof typeof ObjectType];

// ── Base Object ────────────────────────────────────────────────────
/** Shared properties for every editable object in the document. */
export interface EditableObjectBase {
  /** Unique identifier for this object. */
  id: string;
  /** Discriminant — tells consumers which concrete shape this object has. */
  type: ObjectType;
  /** 1-based page number this object lives on. */
  page: number;
  /** Position of the object's top-left corner in page-space pixels. */
  position: Point;
  /** Intrinsic size of the object in page-space pixels. */
  size: Size;
  /** Clockwise rotation in degrees. */
  rotation: number;
  /** Opacity from 0 (fully transparent) to 1 (fully opaque). */
  opacity: number;
  /** When true the object cannot be moved, resized, or deleted. */
  locked: boolean;
  /** When false the object is hidden from rendering. */
  visible: boolean;
  /** Whether the object is currently part of the active selection. */
  selected: boolean;
  /** Timestamp (ms) when the object was first created. */
  createdAt: number;
  /** Timestamp (ms) when the object was last modified. */
  updatedAt: number;
  /** Arbitrary metadata that tools / plugins can attach (e.g. font data, SVG path). */
  data: Record<string, unknown>;
}

// ── Concrete Object Interfaces ─────────────────────────────────────
// Each concrete type extends the base and adds type-specific fields.
// These are stubs that will be filled in during V2–V4.

export interface TextObject extends EditableObjectBase {
  type: typeof ObjectType.Text;
  data: {
    content?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    textAlign?: "left" | "center" | "right";
    lineHeight?: number;
  };
}

export interface ImageObject extends EditableObjectBase {
  type: typeof ObjectType.Image;
  data: {
    src?: string;
    originalWidth?: number;
    originalHeight?: number;
    mimeType?: string;
  };
}

export interface ShapeObject extends EditableObjectBase {
  type: typeof ObjectType.Shape;
  data: {
    shapeType?: "rectangle" | "ellipse" | "line" | "arrow" | "polygon";
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    points?: Point[];
  };
}

export interface DrawingObject extends EditableObjectBase {
  type: typeof ObjectType.Drawing;
  data: {
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    path?: string; // SVG path data
    points?: Point[];
  };
}

export interface HighlightObject extends EditableObjectBase {
  type: typeof ObjectType.Highlight;
  data: {
    color?: string;
    opacity?: number;
    /** Page-space region(s) being highlighted. */
    regions?: Rect[];
  };
}

export interface SignatureObject extends EditableObjectBase {
  type: typeof ObjectType.Signature;
  data: {
    /** Base64 or URL for the signature image. */
    src?: string;
    /** Whether this was drawn with a stylus. */
    isDrawn?: boolean;
  };
}

export interface StampObject extends EditableObjectBase {
  type: typeof ObjectType.Stamp;
  data: {
    /** Predefined stamp preset name (e.g. "approved", "draft"). */
    presetName?: string;
    /** Custom text override for the stamp. */
    text?: string;
    color?: string;
  };
}

// ── Discriminated Union ────────────────────────────────────────────
/** Any editable object — narrow via the `type` discriminant. */
export type EditableObject =
  | TextObject
  | ImageObject
  | ShapeObject
  | DrawingObject
  | HighlightObject
  | SignatureObject
  | StampObject;

// ── Creation Payload ───────────────────────────────────────────────
/**
 * Minimal set of fields required to create a new editable object.
 * The overlay manager will fill in id, createdAt, updatedAt, and
 * sensible defaults for remaining base fields.
 */
export interface CreateObjectParams {
  type: ObjectType;
  page: number;
  position: Point;
  size: Size;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  data?: Record<string, unknown>;
}

