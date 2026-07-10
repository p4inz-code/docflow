/**
 * StatusBar.tsx — Desktop Status Bar
 *
 * Purpose: Show document state at a glance: current page,
 * total pages, zoom level, selection count, active tool,
 * and save/autosave status.
 */

import { useEditorStore } from "../editor/state/editorStore";
import { ToolType } from "../editor/types/tools";

// ── Tool label map ─────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  [ToolType.Select]: "Select",
  [ToolType.Hand]: "Hand",
  [ToolType.Text]: "Text",
  [ToolType.Image]: "Image",
  [ToolType.Shape]: "Shape",
  [ToolType.Draw]: "Draw",
  [ToolType.Highlight]: "Highlight",
  [ToolType.Signature]: "Signature",
  [ToolType.Stamp]: "Stamp",
  [ToolType.Erase]: "Erase",
};

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 12px",
    background: "#161616",
    borderTop: "1px solid #2a2a2a",
    flexShrink: 0,
    minHeight: 26,
    fontSize: 11,
    color: "#777",
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  dot: (color: string) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
    display: "inline-block",
  }),
};

// ── Status Bar ─────────────────────────────────────────────────────
interface StatusBarProps {
  activePage: number;
  totalPages: number;
  zoomLevel: number;
}

export default function StatusBar({ activePage, totalPages, zoomLevel }: StatusBarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);

  return (
    <div style={styles.bar} role="status" aria-live="polite" aria-label="Document status">
      <div style={styles.group}>
        {/* Page info */}
        <span style={styles.item}>
          Page {activePage} / {totalPages}
        </span>

        {/* Selection info */}
        {selectedCount > 0 && (
          <span style={styles.item}>
            {selectedCount} selected
          </span>
        )}

        {/* Save status */}
        <span style={styles.item}>
          {isSaving ? (
            <>
              <span style={styles.dot("#ffaa00")} />
              Saving...
            </>
          ) : isDirty ? (
            <>
              <span style={styles.dot("#ff6600")} />
              Unsaved
            </>
          ) : (
            <>
              <span style={styles.dot("#44cc44")} />
              Saved
            </>
          )}
        </span>
      </div>

      <div style={styles.group}>
        {/* Zoom */}
        <span style={styles.item}>
          {Math.round(zoomLevel * 100)}%
        </span>

        {/* Active tool */}
        <span style={styles.item}>
          {TOOL_LABELS[activeTool] ?? activeTool}
        </span>
      </div>
    </div>
  );
}
