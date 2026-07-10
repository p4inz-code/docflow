/**
 * editor/index.ts — Editing Engine (Top-level barrel)
 *
 * Module overview:
 *   types/        — All type definitions
 *   core/         — Constants and event flow skeleton
 *   models/       — Layer architecture and document model
 *   state/        — Zustand store and selectors
 *   tools/        — Tool system and individual tool implementations
 *   interactions/ — Interaction manager
 *   selection/    — Selection manager + selection visuals
 *   commands/     — Command interface and concrete commands
 *   history/      — History manager (undo/redo stacks)
 *   overlays/     — Overlay manager (editable object lifecycle)
 *   rendering/    — Rendering engine, renderers, scheduling, dirty tracking
 *   hitTesting/   — Hit-testing engine
 *   editing/      — Inline editor, transform system, smart guides, clipboard, keyboard shortcuts
 *   utils/        — Shared utilities
 */

// ── Types ──────────────────────────────────────────────────────────
export {
  EditorMode,
  HandleDirection,
  CursorStyle,
  InteractionPhase,
  ObjectType,
  ToolType,
  CommandType,
  EventType,
  RenderLifecycle,
  EditingMode,
} from "./types";

export type {
  Point,
  Size,
  Rect,
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
  Tool,
  ToolDefinition,
  Command,
  CommandResult,
  InteractionEvent,
  ModifierKeys,
  EventHandler,
  EventHandlerMap,
  SelectionState,
  MarqueeState,
  HitTestResult,
  HistoryEntry,
  HistoryState,
  HistoryEvent,
  ObjectRenderer,
  RendererFactory,
  DirtyFlags,
  PageOverlayContainer,
  RenderStats,
  ActiveEdit,
  TransformState,
  GuideLine,
  GuideState,
  ClipboardEntry,
} from "./types";

// ── Constants & Event Flow ─────────────────────────────────────────
export {
  MIN_OBJECT_SIZE,
  MAX_OBJECT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_OPACITY,
  SELECTION_TOLERANCE,
  MARQUEE_THRESHOLD,
  HANDLE_SIZE,
  SNAP_DISTANCE,
  GRID_SIZE,
  MAX_HISTORY_ENTRIES,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from "./core/constants";

export {
  createRoute,
} from "./core/EventFlow";

export type {
  EventRoute,
} from "./core/EventFlow";

// ── Models ─────────────────────────────────────────────────────────
export {
  LayerType,
  LAYER_ORDER,
  LAYER_DEFINITIONS,
} from "./models";

export type {
  LayerDescriptor,
  PageLayerState,
  DocumentModel,
} from "./models";

// ── State ──────────────────────────────────────────────────────────
export {
  useEditorStore,
} from "./state/editorStore";

export type {
  EditorState,
  EditorActions,
} from "./state/editorStore";

export {
  useOverlayObjectById,
  useOverlayObjectsByPage,
  useSelectedObjects,
  useIsEditing,
  useHasSelection,
  useIsToolActive,
  useObjectCount,
  useObjectCountByPage,
} from "./state/selectors";

// ── Tool System ────────────────────────────────────────────────────
export {
  ToolManager,
  HandTool,
  SelectTool,
  TextTool,
  ImageTool,
  ShapeTool,
  DrawTool,
  HighlightTool,
  EraseTool,
  SignatureTool,
  StampTool,
} from "./tools";

// ── Interaction Manager ────────────────────────────────────────────
export {
  InteractionManager,
} from "./interactions";

// ── Selection Manager & Visuals ────────────────────────────────────
export {
  SelectionManager,
  SelectionVisuals,
} from "./selection";

// ── Commands ───────────────────────────────────────────────────────
export {
  CommandManager,
  BaseCommand,
  noopResult,
  CreateTextCommand,
  CreateObjectCommand,
  MoveObjectCommand,
  ResizeObjectCommand,
  RotateObjectCommand,
  DeleteObjectCommand,
  EditTextCommand,
  EditPropertiesCommand,
  DuplicateCommand,
  ZOrderCommand,
} from "./commands";

// ── History ────────────────────────────────────────────────────────
export {
  HistoryManager,
} from "./history";

// ── Overlays ───────────────────────────────────────────────────────
export {
  OverlayManager,
} from "./overlays";

// ── Rendering Engine ───────────────────────────────────────────────
export {
  RenderingManager,
  ObjectRegistry,
  DirtyTracker,
  RenderScheduler,
  ZIndexManager,
  TextRenderer,
  ImageRenderer,
  ShapeRenderer,
  DrawingRenderer,
  HighlightRenderer,
  SignatureRenderer,
  StampRenderer,
  OverlayRenderer,
} from "./rendering";

export type {
  OverlayRendererProps,
} from "./rendering/OverlayRenderer";

// ── Hit Testing ────────────────────────────────────────────────────
export {
  HitTestEngine,
} from "./hitTesting";

// ── Editing System ─────────────────────────────────────────────────
export {
  InlineTextEditor,
  inlineEditor,
  WhiteoutManager,
  whiteoutManager,
  TransformSystem,
  transformSystem,
  SmartGuides,
  smartGuides,
  ClipboardManager,
  clipboardManager,
  KeyboardShortcuts,
  keyboardShortcuts,
} from "./editing";

// ── Export Engine ──────────────────────────────────────────────────
export {
  ExportEngine,
  FontManager,
  ImageEmbedder,
  OverlayFlattener,
  PageExporter,
  MetadataWriter,
  FileSerializer,
  FileDeserializer,
  SaveManager,
  AutosaveManager,
  RecoveryManager,
  DocumentManager,
  Validator,
  ProgressReporter,
  ExportSettingsManager,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_AUTOSAVE_CONFIG,
  CURRENT_FORMAT_VERSION,
  ExportErrorCategory,
  createExportError,
} from "./export";

export type {
  ExportResult,
  DeserializationResult,
  SaveCallbacks,
  AutosaveCallbacks,
  RecoveryCallbacks,
  RecoveryData,
  RecoverySessionInfo,
  DocumentEvent,
  DocumentEventType,
  ValidationResult,
  ProgressCallback,
  ExportSettings,
  ExportRange,
  ExportProgress,
  ExportError,
  SaveInfo,
  SaveState,
  DocumentInfo,
  SerializedDocument,
  RecoverySession,
  AutosaveConfig,
} from "./export";

// ── Workspace ──────────────────────────────────────────────────────
export {
  useWorkspaceStore,
  useActiveDocument,
  useActivePDF,
  useIsActiveDocument,
  WorkspaceManager,
  workspaceManager,
} from "./workspace";

export type {
  WorkspaceDocument,
  WorkspaceState,
} from "./workspace";

// ── Page Operations ────────────────────────────────────────────────
export {
  pageOperations,
  PageOperations,
} from "./operations";

export type {
  PageState,
} from "./operations";

// ── Utilities ──────────────────────────────────────────────────────
export {
  generateId,
  createPoint,
  addPoints,
  subtractPoints,
  scalePoint,
  distanceBetween,
  clampPoint,
  pointsEqual,
  lerp,
  clamp,
  degToRad,
  radToDeg,
  rotatePoint,
  aspectRatio,
  createRect,
  rectFromPoints,
  pointInRect,
  rectsIntersect,
  unionRects,
  expandRect,
  rectCenter,
  normalizeRect,
  hitTestObjects,
  hitTestHandles,
  objectBounds,
  selectionBounds,
} from "./utils";
