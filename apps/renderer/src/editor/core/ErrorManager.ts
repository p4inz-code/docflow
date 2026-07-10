/**
 * ErrorManager.ts — Advanced Error Detection Framework
 *
 * Purpose: Centralized production-grade error handling for the entire application.
 * Every subsystem reports through one unified error pipeline.
 *
 * Features:
 *   - Unique error IDs with timestamps
 *   - Severity levels
 *   - Subsystem tagging
 *   - Context snapshots
 *   - Recovery recommendations
 *   - User-friendly messages
 *   - Developer diagnostics
 *   - Error reporting pipeline
 */

// ── Severity Levels ────────────────────────────────────────────────
export const ErrorSeverity = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  FATAL: "fatal",
} as const;

export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

// ── Subsystem Identifiers ──────────────────────────────────────────
export const ErrorSubsystem = {
  VIEWER: "viewer",
  TOOLBAR: "toolbar",
  INSPECTOR: "inspector",
  THUMBNAILS: "thumbnails",
  SEARCH: "search",
  EXPORT: "export",
  IMPORT: "import",
  WORKSPACE: "workspace",
  COMMAND: "command",
  HISTORY: "history",
  RENDERING: "rendering",
  RECOVERY: "recovery",
  AUTOSAVE: "autosave",
  DIALOG: "dialog",
  ACCESSIBILITY: "accessibility",
  CLIPBOARD: "clipboard",
  PLUGIN: "plugin",
} as const;

export type ErrorSubsystem = (typeof ErrorSubsystem)[keyof typeof ErrorSubsystem];

// ── Error Category ─────────────────────────────────────────────────
export const ErrorCategory = {
  VALIDATION: "validation",
  FILE_SYSTEM: "file-system",
  PDF: "pdf",
  FONT: "font",
  IMAGE: "image",
  RENDER: "render",
  NETWORK: "network",
  MEMORY: "memory",
  STATE: "state",
  PERMISSION: "permission",
  TIMEOUT: "timeout",
  UNKNOWN: "unknown",
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

// ── Error Event ────────────────────────────────────────────────────
export interface ErrorEvent {
  /** Unique identifier for this error occurrence. */
  id: string;
  /** When the error occurred. */
  timestamp: number;
  /** How severe this error is. */
  severity: ErrorSeverity;
  /** Which subsystem generated the error. */
  subsystem: ErrorSubsystem;
  /** What category of error. */
  category: ErrorCategory;
  /** Human-readable error title. */
  title: string;
  /** User-friendly message. */
  message: string;
  /** Developer-only diagnostic details. */
  diagnostics?: string;
  /** Stack trace if available. */
  stack?: string;
  /** Recovery recommendation for the user. */
  recovery?: string;
  /** Whether the error is recoverable. */
  recoverable: boolean;
  /** Context snapshot at time of error. */
  context?: Record<string, unknown>;
  /** Underlying cause if wrapped. */
  cause?: Error;
}

// ── Error Event Listener ───────────────────────────────────────────
export type ErrorEventListener = (event: ErrorEvent) => void;

// ── Error Manager ──────────────────────────────────────────────────
let _errorIdCounter = 0;

function generateErrorId(): string {
  _errorIdCounter++;
  return `ERR-${Date.now().toString(36).toUpperCase()}-${_errorIdCounter}`;
}

class GlobalErrorManager {
  private _listeners: Set<ErrorEventListener> = new Set();
  private _history: ErrorEvent[] = [];
  private readonly _maxHistory = 100;

  /** Subscribe to all error events. */
  onError(listener: ErrorEventListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** Report an error through the unified pipeline. */
  report(event: Omit<ErrorEvent, "id" | "timestamp">): ErrorEvent {
    const fullEvent: ErrorEvent = {
      ...event,
      id: generateErrorId(),
      timestamp: Date.now(),
    };

    // Store in history
    this._history.push(fullEvent);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Notify all listeners
    for (const listener of this._listeners) {
      try {
        listener(fullEvent);
      } catch {
        // Never let a listener crash the error system
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      const prefix = `[${fullEvent.subsystem}]`;
      switch (fullEvent.severity) {
        case "fatal":
        case "error":
          console.error(prefix, fullEvent.title, fullEvent.message, fullEvent.diagnostics ?? "");
          break;
        case "warning":
          console.warn(prefix, fullEvent.title, fullEvent.message);
          break;
        default:
          console.log(prefix, fullEvent.title, fullEvent.message);
      }
    }

    return fullEvent;
  }

  /** Get error history. */
  getHistory(): readonly ErrorEvent[] {
    return [...this._history];
  }

  /** Clear error history. */
  clearHistory(): void {
    this._history = [];
  }

  /** Create a fatal error (triggers recovery). */
  fatal(
    subsystem: ErrorSubsystem,
    title: string,
    message: string,
    options?: Partial<Omit<ErrorEvent, "id" | "timestamp" | "severity" | "subsystem" | "title" | "message">>,
  ): ErrorEvent {
    return this.report({
      severity: "fatal",
      subsystem,
      category: options?.category ?? "unknown",
      title,
      message,
      recoverable: options?.recoverable ?? false,
      diagnostics: options?.diagnostics,
      stack: options?.stack,
      recovery: options?.recovery,
      context: options?.context,
      cause: options?.cause,
    });
  }

  /** Create an error. */
  error(
    subsystem: ErrorSubsystem,
    title: string,
    message: string,
    options?: Partial<Omit<ErrorEvent, "id" | "timestamp" | "severity" | "subsystem" | "title" | "message">>,
  ): ErrorEvent {
    return this.report({
      severity: "error",
      subsystem,
      category: options?.category ?? "unknown",
      title,
      message,
      recoverable: options?.recoverable ?? true,
      diagnostics: options?.diagnostics,
      stack: options?.stack,
      recovery: options?.recovery,
      context: options?.context,
      cause: options?.cause,
    });
  }

  /** Create a warning. */
  warn(
    subsystem: ErrorSubsystem,
    title: string,
    message: string,
    options?: Partial<Omit<ErrorEvent, "id" | "timestamp" | "severity" | "subsystem" | "title" | "message">>,
  ): ErrorEvent {
    return this.report({
      severity: "warning",
      subsystem,
      category: options?.category ?? "unknown",
      title,
      message,
      recoverable: true,
      diagnostics: options?.diagnostics,
      recovery: options?.recovery,
      context: options?.context,
    });
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const globalErrorManager = new GlobalErrorManager();

// ── Subsystem Error Handler Factory ────────────────────────────────
type ErrorOptions = Partial<Omit<ErrorEvent, "id" | "timestamp" | "severity" | "subsystem" | "title" | "message">>;

export function createSubsystemHandler(subsystem: ErrorSubsystem) {
  return {
    fatal: (title: string, message: string, options?: ErrorOptions) =>
      globalErrorManager.fatal(subsystem, title, message, options),
    error: (title: string, message: string, options?: ErrorOptions) =>
      globalErrorManager.error(subsystem, title, message, options),
    warn: (title: string, message: string, options?: ErrorOptions) =>
      globalErrorManager.warn(subsystem, title, message, options),
  };
}

// ── Pre-built subsystem handlers ───────────────────────────────────
export const viewerErrorHandler = createSubsystemHandler(ErrorSubsystem.VIEWER);
export const importErrorHandler = createSubsystemHandler(ErrorSubsystem.IMPORT);
export const exportErrorHandler = createSubsystemHandler(ErrorSubsystem.EXPORT);
export const workspaceErrorHandler = createSubsystemHandler(ErrorSubsystem.WORKSPACE);
export const renderingErrorHandler = createSubsystemHandler(ErrorSubsystem.RENDERING);
export const commandErrorHandler = createSubsystemHandler(ErrorSubsystem.COMMAND);
export const recoveryErrorHandler = createSubsystemHandler(ErrorSubsystem.RECOVERY);
export const pluginErrorHandler = createSubsystemHandler(ErrorSubsystem.PLUGIN);
