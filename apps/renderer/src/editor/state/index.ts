/**
 * state/index.ts — State barrel export
 */

export type {
  EditorState,
  EditorActions,
} from "./editorStore";
export {
  useEditorStore,
} from "./editorStore";

export {
  useOverlayObjectById,
  useOverlayObjectsByPage,
  useSelectedObjects,
  useIsEditing,
  useHasSelection,
  useIsToolActive,
  useObjectCount,
  useObjectCountByPage,
} from "./selectors";
