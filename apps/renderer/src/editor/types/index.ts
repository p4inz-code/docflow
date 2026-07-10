/**
 * index.ts — Types barrel export (updated with editing types)
 */

export {
  EditorMode,
  HandleDirection,
  CursorStyle,
  InteractionPhase,
} from "./editor";

export type {
  Point,
  Size,
  Rect,
} from "./editor";

export {
  ObjectType,
} from "./objects";

export type {
  EditableObjectBase,
  TextObject,
  ImageObject,
  ShapeObject,
  DrawingObject,
  HighlightObject,
  SignatureObject,
  StampObject,
  EditableObject,
  CreateObjectParams,
} from "./objects";

export {
  ToolType,
} from "./tools";

export type {
  Tool,
  ToolDefinition,
} from "./tools";

export {
  CommandType,
  emptyCommandResult,
} from "./commands";

export type {
  Command,
  CommandResult,
} from "./commands";

export {
  EventType,
} from "./interaction";

export type {
  InteractionEvent,
  ModifierKeys,
  EventHandler,
  EventHandlerMap,
} from "./interaction";

export type {
  SelectionState,
  MarqueeState,
  HitTestResult,
} from "./selection";

export type {
  HistoryEntry,
  HistoryState,
  HistoryEvent,
  HistoryEventType,
} from "./history";

export {
  RenderLifecycle,
} from "./rendering";

export type {
  ObjectRenderer,
  RendererFactory,
  DirtyFlags,
  PageOverlayContainer,
  RenderStats,
} from "./rendering";

export {
  EditingMode,
} from "./editing";

export type {
  ActiveEdit,
  TransformState,
  GuideLine,
  GuideState,
  ClipboardEntry,
} from "./editing";
