/**
 * utils/index.ts — Utils barrel export
 */

export { generateId } from "./id";

export {
  createPoint,
  addPoints,
  subtractPoints,
  scalePoint,
  distanceBetween,
  clampPoint,
  pointsEqual,
} from "./point";

export {
  lerp,
  clamp,
  degToRad,
  radToDeg,
  rotatePoint,
  aspectRatio,
} from "./geometry";

export {
  createRect,
  rectFromPoints,
  pointInRect,
  rectsIntersect,
  unionRects,
  expandRect,
  rectCenter,
  normalizeRect,
} from "./rect";

export {
  hitTestObjects,
  hitTestHandles,
} from "./hitTest";

export {
  createTransform,
  applyTransform,
  invertTransform,
} from "./matrix";

export {
  objectBounds,
  selectionBounds,
} from "./bounds";
