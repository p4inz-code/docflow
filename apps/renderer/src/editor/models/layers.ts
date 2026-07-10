/**
 * layers.ts — Document Layer Architecture
 *
 * Purpose: Define the layer stack that conceptually composes the
 * final rendered output.
 *
 * Layer order (bottom to top):
 *
 *   1. PDF Layer       — The rendered PDF page content (read-only).
 *   2. Overlay Layer   — Editable objects (text, images, shapes, etc.).
 *   3. Selection Layer — Selection handles, marquee, and bounding boxes.
 *   4. Interaction Layer  — Transient overlays (drag previews, guides).
 *
 * Each layer is identified by a string constant and described by
 * the Layer interface. Future renderers will composite them in
 * this order.
 */

import type { EditableObject } from "../types/objects";
import type { SelectionState } from "../types/selection";

// ── Layer Identifiers ──────────────────────────────────────────────
export const LayerType = {
  PDF: "pdf",
  Overlay: "overlay",
  Selection: "selection",
  Interaction: "interaction",
} as const;

export type LayerType = (typeof LayerType)[keyof typeof LayerType];

// ── Layer Stack Order (bottom → top) ───────────────────────────────
export const LAYER_ORDER: readonly LayerType[] = [
  LayerType.PDF,
  LayerType.Overlay,
  LayerType.Selection,
  LayerType.Interaction,
];

// ── Layer Descriptor ───────────────────────────────────────────────
export interface LayerDescriptor {
  type: LayerType;
  /** Human-readable name (for debugging / devtools). */
  name: string;
  /** Whether objects on this layer can be interacted with. */
  interactive: boolean;
  /** Whether the layer contents are rendered to the final output. */
  visible: boolean;
  /** Z-index offset (relative to the layer order). */
  zIndex: number;
}

// ── Layer Definitions ──────────────────────────────────────────────
export const LAYER_DEFINITIONS: Record<LayerType, LayerDescriptor> = {
  [LayerType.PDF]: {
    type: LayerType.PDF,
    name: "PDF Content",
    interactive: false,
    visible: true,
    zIndex: 0,
  },
  [LayerType.Overlay]: {
    type: LayerType.Overlay,
    name: "Editable Overlays",
    interactive: true,
    visible: true,
    zIndex: 1,
  },
  [LayerType.Selection]: {
    type: LayerType.Selection,
    name: "Selection Overlays",
    interactive: true,
    visible: true,
    zIndex: 2,
  },
  [LayerType.Interaction]: {
    type: LayerType.Interaction,
    name: "Interaction Layer",
    interactive: false,
    visible: true,
    zIndex: 3,
  },
};

// ── Layer State (per document) ─────────────────────────────────────
/**
 * Represents the current state of all layers for one page.
 * Not yet wired to rendering — purely architectural.
 */
export interface PageLayerState {
  page: number;
  /** Objects on the overlay layer for this page. */
  overlayObjects: EditableObject[];
  /** Current selection state (shared across pages via store). */
  selection: SelectionState;
  /** Per-layer visibility toggle (future use). */
  visibility: Record<LayerType, boolean>;
}
