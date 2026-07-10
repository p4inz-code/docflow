/**
 * Toolbar.tsx — Professional Toolbar
 *
 * Purpose: Provide a production-quality toolbar with all editor
 * tools, zoom controls, undo/redo, and document actions.
 *
 * Synchronizes with editor store for active tool state.
 */

import { useCallback, useMemo } from "react";
import { useEditorStore } from "../editor/state/editorStore";
import { ToolType } from "../editor/types/tools";
import { commandPipeline } from "../editor/core/CommandPipeline";

// ── Tool definitions ───────────────────────────────────────────────
interface ToolDef {
  type: ToolType;
  label: string;
  icon: string;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { type: ToolType.Select, label: "Select", icon: "⬚", shortcut: "V" },
  { type: ToolType.Hand, label: "Hand", icon: "✋", shortcut: "H" },
  { type: ToolType.Text, label: "Text", icon: "T", shortcut: "T" },
  { type: ToolType.Image, label: "Image", icon: "🖼", shortcut: "I" },
  { type: ToolType.Shape, label: "Shape", icon: "◇", shortcut: "R" },
  { type: ToolType.Draw, label: "Draw", icon: "✏", shortcut: "D" },
  { type: ToolType.Highlight, label: "Highlight", icon: "⬟", shortcut: "U" },
  { type: ToolType.Signature, label: "Signature", icon: "✍", shortcut: "S" },
  { type: ToolType.Stamp, label: "Stamp", icon: "◎", shortcut: "P" },
  { type: ToolType.Erase, label: "Erase", icon: "🗑", shortcut: "E" },
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
}

export default function Toolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onOpenFile,
}: ToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const isDirty = useEditorStore((s) => s.isDirty);
  const fileName = useEditorStore((s) => s.fileName);
  const historyVersion = useEditorStore((s) => s.historyVersion);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  // Reactive undo/redo state (updates when historyVersion changes)
  const canUndo = useMemo(() => commandPipeline.canUndo, [historyVersion]);
  const canRedo = useMemo(() => commandPipeline.canRedo, [historyVersion]);

  const handleToolClick = useCallback(
    (type: ToolType) => {
      setActiveTool(type);
    },
    [setActiveTool],
  );

  return (
    <div style={styles.bar} role="toolbar" aria-label="Editor toolbar">
      {/* ── Document actions ── */}
      <div style={styles.group} role="group" aria-label="Document">
        <button
          onClick={onOpenFile}
          style={styles.actionBtn}
          title="Open PDF (Ctrl+O)"
          aria-label="Open PDF"
        >
          📂
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
            opacity: commandPipeline.canUndo ? 1 : 0.3,
          }}
          disabled={!commandPipeline.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↩
        </button>
        <button
          onClick={() => commandPipeline.redo()}
          style={{
            ...styles.actionBtn,
            opacity: commandPipeline.canRedo ? 1 : 0.3,
          }}
          disabled={!commandPipeline.canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          ↪
        </button>
      </div>

      <div style={styles.separator} aria-hidden="true" />

      {/* ── Tools ── */}
      <div style={styles.group} role="group" aria-label="Tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => handleToolClick(tool.type)}
            style={styles.toolBtn(activeTool === tool.type)}
            title={`${tool.label} (${tool.shortcut})`}
            aria-label={`${tool.label} tool`}
            aria-pressed={activeTool === tool.type}
          >
            {tool.icon}
            <span style={styles.shortcut}>{tool.shortcut}</span>
          </button>
        ))}
      </div>

      <div style={styles.separator} aria-hidden="true" />

      {/* ── Zoom controls ── */}
      <div style={styles.group} role="group" aria-label="Zoom">
        <button onClick={onZoomOut} style={styles.actionBtn} title="Zoom out" aria-label="Zoom out">
          −
        </button>
        <span style={styles.zoomLabel} aria-live="polite" aria-atomic="true">{Math.round(zoomLevel * 100)}%</span>
        <button onClick={onZoomIn} style={styles.actionBtn} title="Zoom in" aria-label="Zoom in">
          +
        </button>
      </div>

      <div style={{ ...styles.separator, height: 20 }} aria-hidden="true" />

      <div style={styles.group} role="group" aria-label="View modes">
        <button
          onClick={onFitWidth}
          style={{ ...styles.actionBtn, fontSize: 11, width: "auto", padding: "0 8px" }}
          title="Fit width"
          aria-label="Fit to width"
        >
          Fit W
        </button>
        <button
          onClick={onFitPage}
          style={{ ...styles.actionBtn, fontSize: 11, width: "auto", padding: "0 8px" }}
          title="Fit page"
          aria-label="Fit to page"
        >
          Fit P
        </button>
      </div>
    </div>
  );
}
