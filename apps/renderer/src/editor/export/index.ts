/**
 * export/index.ts — Export module barrel export
 */

export { ExportEngine } from "./ExportEngine";
export type { ExportResult } from "./ExportEngine";

export { FontManager } from "./FontManager";
export { ImageEmbedder } from "./ImageEmbedder";
export { OverlayFlattener } from "./OverlayFlattener";
export { PageExporter } from "./PageExporter";
export { MetadataWriter } from "./MetadataWriter";
export { FileSerializer } from "./FileSerializer";
export { FileDeserializer } from "./FileDeserializer";
export type { DeserializationResult } from "./FileDeserializer";

export { SaveManager } from "./SaveManager";
export type { SaveCallbacks } from "./SaveManager";

export { AutosaveManager } from "./AutosaveManager";


export { RecoveryManager } from "./RecoveryManager";
export type { RecoveryCallbacks, RecoveryData, RecoverySessionInfo } from "./RecoveryManager";

export { DocumentManager } from "./DocumentManager";
export type { DocumentEvent, DocumentEventType } from "./DocumentManager";

export { Validator } from "./Validation";
export type { ValidationResult } from "./Validation";

export { ProgressReporter } from "./ProgressReporter";
export type { ProgressCallback } from "./ProgressReporter";

export { ExportSettingsManager } from "./ExportSettings";

export {
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_AUTOSAVE_CONFIG,
  CURRENT_FORMAT_VERSION,
  ExportErrorCategory,
  createExportError,
} from "./types";

export type {
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
} from "./types";
