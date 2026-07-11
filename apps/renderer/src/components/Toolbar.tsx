/**
 * Toolbar.tsx — Professional Toolbar
 *
 * Purpose: Provide a production-quality toolbar with all editor
 * tools, zoom controls, undo/redo, and document actions.
 *
 * Synchronizes with editor store for active tool state.
 */

import { useCallback } from "react";
import { useEditorStore } from "../editor/state/editorStore";
import { ToolType } from "../editor/types/tools";
import { commandPipeline } from "../editor/core/CommandPipeline";
import { TOOL_ICONS, Undo2, Redo2, FolderOpen, ZoomIn, ZoomOut } from "./Icons";

// ── Tool definitions ───────────────────────────────────────────────
interface ToolDef {
  type: ToolType;
  label: string;
  iconComponent: React.ComponentType<{ size?: number; className?: string }>;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { type: ToolType.Select, label: "Select", iconComponent: TOOL_ICONS.select, shortcut: "V" },
  { type: ToolType.Hand, label: "Hand", iconComponent: TOOL_ICONS.hand, shortcut: "H" },
  { type: ToolType.Text, label: "Text", iconComponent: TOOL_ICONS.text, shortcut: "T" },
  { type: ToolType.Image, label: "Image", iconComponent: TOOL_ICONS.image, shortcut: "I" },
  { type: ToolType.Shape, label: "Shape", iconComponent: TOOL_ICONS.shape, shortcut: "R" },
  { type: ToolType.Draw, label: "Draw", iconComponent: TOOL_ICONS.draw, shortcut: "D" },
  { type: ToolType.Highlight, label: "Highlight", iconComponent: TOOL_ICONS.highlight, shortcut: "U" },
  { type: ToolType.Signature, label: "Signature", iconComponent: TOOL_ICONS.signature, shortcut: "S" },
  { type: ToolType.Stamp, label: "Stamp", iconComponent: TOOL_ICONS.stamp, shortcut: "P" },
  { type: ToolType.Erase, label: "Erase", iconComponent: TOOL_ICONS.erase, shortcut: "E" },
];

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 8px",
    background: "#1e1e1e",
    borderBottom: "1px solid #333",
    flexShrink: 0,
    overflowX: "auto" as const,
    minHeight: 40,
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  separator: {
    width: 1,
    height: 24,
    background: "#3a3a3a",
    margin: "0 6px",
    flexShrink: 0,
  },
  toolBtn: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 6,
    background: active ? "#3a6ea5" : "transparent",
    color: active ? "#fff" : "#aaa",
    cursor: "pointer",
    fontSize: 16,
    position: "relative" as const,
    transition: "background 0.12s, color 0.12s",
  }),
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.12s, color 0.12s",
  },
  shortcut: {
    position: "absolute" as const,
    bottom: 1,
    right: 3,
    fontSize: 8,
    color: "#666",
    fontWeight: 600,
  },
  zoomLabel: {
    color: "#aaa",
    fontSize: 12,
    minWidth: 38,
    textAlign: "center" as const,
    fontVariantNumeric: "tabular-nums" as const,
  },
};

// ── Toolbar Component ──────────────────────────────────────────────
interface ToolbarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onOpenFile: () => void;
  disabled?: boolean;
}

export default function Toolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onOpenFile,
  disabled = false,
}: ToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const isDirty = useEditorStore((s) => s.isDirty);
  const fileName = useEditorStore((s) => s.fileName);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  // Subscribe to history version changes so undo/redo buttons update
  useEditorStore((s) => s.historyVersion);

  const handleToolClick = useCallback(
    (type: ToolType) => {
      setActiveTool(type);
    },
    [setActiveTool],
  );

  return (
    <div
      style={{
        ...styles.bar,
        opacity: disabled ? 0.65 : 1,
      }}
      role="toolbar"
      aria-label={disabled ? "Editor toolbar (no document)" : "Editor toolbar"}
      aria-disabled={disabled}
    >
      {/* ── Document actions ── */}
      <div style={styles.group} role="group" aria-label="Document">
        <button
          onClick={onOpenFile}
          style={styles.actionBtn}
          title="Open PDF (Ctrl+O)"
          aria-label="Open PDF"
        >
          <FolderOpen size={16} aria-hidden="true" />
        </button>
        <span style={{ color: "#666", fontSize: 11, marginLeft: 4, whiteSpace: "nowrap" }}>
          {fileName ?? "Untitled"}{isDirty ? " •" : ""}
        </span>
      </div>

      <div style={styles.separator} aria-hidden="true" />

      {/* ── Undo / Redo ── */}
      <div style={styles.group} role="group" aria-label="History">
        <button
          onClick={() => commandPipeline.undo()}
          style={{
            ...styles.actionBtn,
            opacity: disabled ? 0.2 : commandPipeline.canUndo ? 1 : 0.3,
          }}
          disabled={disabled || !commandPipeline.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={14} aria-hidden="true" />
        </button>
        <button
          onClick={() => commandPipeline.redo()}
          style={{
            ...styles.actionBtn,
            opacity: disabled ? 0.2 : commandPipeline.canRedo ? 1 : 0.3,
          }}
          disabled={disabled || !commandPipeline.canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={14} aria-hidden="true" />
        </button>
      </div>

      <div style={styles.separator} aria-hidden="true" />

      {/* ── Tools ── */}
      <div style={styles.group} role="group" aria-label="Tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => handleToolClick(tool.type)}
            style={{
              ...styles.toolBtn(activeTool === tool.type),
              opacity: disabled ? 0.4 : activeTool === tool.type ? 1 : 0.85,
              cursor: disabled ? "default" : "pointer",
            }}
            disabled={disabled}
            title={disabled ? "Open a document to use tools" : `${tool.label} (${tool.shortcut})`}
            aria-label={`${tool.label} tool`}
            aria-pressed={!disabled && activeTool === tool.type}
          >
            <tool.iconComponent size={16} aria-hidden="true" />
            <span style={styles.shortcut}>{tool.shortcut}</span>
          </button>
        ))}
      </div>

      <div style={styles.separator} aria-hidden="true" />

      {/* ── Zoom controls ── */}
      <div style={styles.group} role="group" aria-label="Zoom">
        <button
          onClick={onZoomOut}
          style={{ ...styles.actionBtn, opacity: disabled ? 0.2 : 1 }}
          disabled={disabled}
          title={disabled ? "Open a document to zoom" : "Zoom out"}
          aria-label="Zoom out"
        >
          <ZoomOut size={14} aria-hidden="true" />
        </button>
        <span style={{ ...styles.zoomLabel, opacity: disabled ? 0.4 : 1 }} aria-live="polite" aria-atomic="true">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          style={{ ...styles.actionBtn, opacity: disabled ? 0.2 : 1 }}
          disabled={disabled}
          title={disabled ? "Open a document to zoom" : "Zoom in"}
          aria-label="Zoom in"
        >
          <ZoomIn size={14} aria-hidden="true" />
        </button>
      </div>

      <div style={{ ...styles.separator, height: 20 }} aria-hidden="true" />

      <div style={styles.group} role="group" aria-label="View modes">
        <button
          onClick={onFitWidth}
          style={{ ...styles.actionBtn, fontSize: 11, width: "auto", padding: "0 8px", opacity: disabled ? 0.2 : 1 }}
          disabled={disabled}
          title={disabled ? "Open a document to change view" : "Fit width"}
          aria-label="Fit to width"
        >
          Fit W
        </button>
        <button
          onClick={onFitPage}
          style={{ ...styles.actionBtn, fontSize: 11, width: "auto", padding: "0 8px", opacity: disabled ? 0.2 : 1 }}
          disabled={disabled}
          title={disabled ? "Open a document to change view" : "Fit page"}
          aria-label="Fit to page"
        >
          Fit P
        </button>
      </div>
    </div>
  );
}
