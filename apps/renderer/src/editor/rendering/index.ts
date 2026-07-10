/**
 * rendering/index.ts — Rendering module barrel export
 */

export { RenderingManager } from "./RenderingManager";
export { ObjectRegistry } from "./ObjectRegistry";
export { DirtyTracker } from "./DirtyTracker";
export { RenderScheduler } from "./RenderScheduler";
export { ZIndexManager } from "./renderOrder";

export {
  TextRenderer,
  ImageRenderer,
  ShapeRenderer,
  DrawingRenderer,
  HighlightRenderer,
  SignatureRenderer,
  StampRenderer,
} from "./renderers";

export { OverlayRenderer } from "./OverlayRenderer";
export type { OverlayRendererProps } from "./OverlayRenderer";
