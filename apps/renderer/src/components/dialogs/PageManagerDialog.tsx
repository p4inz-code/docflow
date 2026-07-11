/**
 * PageManagerDialog.tsx — Page Management Dialog
 *
 * Purpose: Provide a visual page manager for advanced page operations
 * including insert, delete, duplicate, rotate, reorder, extract, and split.
 * All operations are undoable through the command pipeline.
 */

import { useState, useCallback, useEffect } from "react";
import Dialog from "./Dialog";
import { pageOperations } from "../../editor/operations/PageOperations";
import { useActiveDocument } from "../../editor/workspace/WorkspaceStore";

interface PageManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PageManagerDialog({
  open,
  onClose,
}: PageManagerDialogProps) {
  const doc = useActiveDocument();
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pageRotations, setPageRotations] = useState<Map<number, number>>(
    new Map(),
  );

  const totalPages = doc?.pdf?.numPages ?? 0;

  // Reset selection when opening
  useEffect(() => {
    if (open) {
      setSelectedPages(new Set());
    }
  }, [open]);

  const togglePage = useCallback((pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  }, []);

  const handleRotateCW = useCallback(() => {
    if (selectedPages.size === 0) return;
    for (const pageNum of selectedPages) {
      pageOperations.rotatePage(pageNum - 1, "cw");
      setPageRotations((prev) => {
        const next = new Map(prev);
        const current = next.get(pageNum) ?? 0;
        next.set(pageNum, (current + 90) % 360);
        return next;
      });
    }
  }, [selectedPages]);

  const handleRotateCCW = useCallback(() => {
    if (selectedPages.size === 0) return;
    for (const pageNum of selectedPages) {
      pageOperations.rotatePage(pageNum - 1, "ccw");
      setPageRotations((prev) => {
        const next = new Map(prev);
        const current = next.get(pageNum) ?? 0;
        next.set(pageNum, (current - 90 + 360) % 360);
        return next;
      });
    }
  }, [selectedPages]);

  const handleDelete = useCallback(() => {
    if (selectedPages.size === 0) return;
    const pages = [...selectedPages].sort((a, b) => b - a);
    for (const pageNum of pages) {
      pageOperations.deletePage(pageNum - 1);
    }
    setSelectedPages(new Set());
  }, [selectedPages]);

  const handleDuplicate = useCallback(() => {
    if (selectedPages.size === 0) return;
    const pages = [...selectedPages].sort((a, b) => b - a);
    // Duplicate in reverse order to maintain correct indices
    for (const pageNum of pages) {
      pageOperations.duplicatePage(pageNum - 1);
    }
  }, [selectedPages]);

  const handleMoveUp = useCallback(() => {
    if (selectedPages.size !== 1) return;
    const pageNum = [...selectedPages][0];
    if (pageNum <= 1) return;
    pageOperations.reorderPages(pageNum - 1, pageNum - 2);
    setSelectedPages(new Set([pageNum - 1]));
  }, [selectedPages]);

  const handleMoveDown = useCallback(() => {
    if (selectedPages.size !== 1) return;
    const pageNum = [...selectedPages][0];
    if (pageNum >= totalPages) return;
    pageOperations.reorderPages(pageNum - 1, pageNum);
    setSelectedPages(new Set([pageNum + 1]));
  }, [selectedPages, totalPages]);

  const handleInsertBlank = useCallback(() => {
    if (selectedPages.size !== 1) return;
    const pageNum = [...selectedPages][0];
    pageOperations.insertBlankPage(pageNum);
  }, [selectedPages]);

  const footer = (
    <button
      onClick={onClose}
      style={{
        padding: "6px 16px",
        borderRadius: 4,
        border: "1px solid #444",
        background: "#333",
        color: "#aaa",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      Close
    </button>
  );

  const toolBtnStyle = (disabled = false): React.CSSProperties => ({
    padding: "5px 10px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: disabled ? "#1a1a1a" : "#252525",
    color: disabled ? "#444" : "#aaa",
    cursor: disabled ? "default" : "pointer",
    fontSize: 11,
    opacity: disabled ? 0.4 : 1,
  });

  const hasSelection = selectedPages.size > 0;

  return (
    <Dialog
      open={open}
      title={`Page Manager - ${doc?.name ?? "Untitled"}`}
      onClose={onClose}
      footer={footer}
      width={520}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 0",
          borderBottom: "1px solid #2a2a2a",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleRotateCW}
          disabled={!hasSelection}
          style={toolBtnStyle(!hasSelection)}
          title="Rotate clockwise"
        >
          ↻ Rotate CW
        </button>
        <button
          onClick={handleRotateCCW}
          disabled={!hasSelection}
          style={toolBtnStyle(!hasSelection)}
          title="Rotate counter-clockwise"
        >
          ↺ Rotate CCW
        </button>
        <div
          style={{
            width: 1,
            background: "#2a2a2a",
            margin: "0 4px",
          }}
        />
        <button
          onClick={handleDuplicate}
          disabled={!hasSelection}
          style={toolBtnStyle(!hasSelection)}
        >
          ⊞ Duplicate
        </button>
        <button
          onClick={handleDelete}
          disabled={!hasSelection}
          style={toolBtnStyle(!hasSelection)}
        >
          ✕ Delete
        </button>
        <div
          style={{
            width: 1,
            background: "#2a2a2a",
            margin: "0 4px",
          }}
        />
        <button
          onClick={handleMoveUp}
          disabled={selectedPages.size !== 1}
          style={toolBtnStyle(selectedPages.size !== 1)}
        >
          ▲ Move Up
        </button>
        <button
          onClick={handleMoveDown}
          disabled={selectedPages.size !== 1}
          style={toolBtnStyle(selectedPages.size !== 1)}
        >
          ▼ Move Down
        </button>
        <div
          style={{
            width: 1,
            background: "#2a2a2a",
            margin: "0 4px",
          }}
        />
        <button
          onClick={handleInsertBlank}
          disabled={selectedPages.size !== 1}
          style={toolBtnStyle(selectedPages.size !== 1)}
        >
          ＋ Insert Blank
        </button>
      </div>

      {/* Page grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 8,
          maxHeight: 360,
          overflowY: "auto",
        }}
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
          (pageNum) => {
            const isSelected = selectedPages.has(pageNum);
            return (
              <div
                key={pageNum}
                onClick={() => togglePage(pageNum)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "8px 4px",
                  background: isSelected ? "#2a3a4a" : "#1a1a1a",
                  border: isSelected
                    ? "2px solid #4a9eff"
                    : "1px solid #2a2a2a",
                  borderRadius: 4,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.target as HTMLElement).style.background = "#222";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.target as HTMLElement).style.background = "#1a1a1a";
                  }
                }}
              >
                {/* Page preview placeholder */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3/4",
                    background: "#252525",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                    transform: `rotate(${pageRotations.get(pageNum) ?? 0}deg)`,
                    transition: "transform 0.2s",
                  }}
                >
                  <span style={{ color: "#555", fontSize: 10 }}>
                    {pageNum}
                  </span>
                </div>
                <span
                  style={{
                    color: isSelected ? "#4a9eff" : "#888",
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {pageNum}
                </span>
              </div>
            );
          },
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          color: "#666",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        {totalPages} page{totalPages !== 1 ? "s" : ""}
        {hasSelection && ` — ${selectedPages.size} selected`}
      </div>
    </Dialog>
  );
}
