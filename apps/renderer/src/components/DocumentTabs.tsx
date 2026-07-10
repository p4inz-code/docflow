/**
 * DocumentTabs.tsx — Professional Document Tab Bar
 *
 * Purpose: Multi-document workspace tab bar with closable tabs,
 * dirty indicators (*), active tab switching, middle-click close,
 * Ctrl+Tab / Ctrl+Shift+Tab navigation, and drag-to-reorder.
 *
 * Integrates with WorkspaceStore for all document lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../editor/workspace/WorkspaceStore";
import type { WorkspaceDocument } from "../editor/workspace/WorkspaceStore";

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    height: 36,
    background: "#1a1a1a",
    borderBottom: "1px solid #2a2a2a",
    overflow: "hidden",
    flexShrink: 0,
    userSelect: "none" as const,
  },
  tab: (isActive: boolean, isDirty: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: "100%",
    padding: "0 12px 0 16px",
    background: isActive ? "#252525" : "transparent",
    borderRight: "1px solid #2a2a2a",
    borderBottom: isActive ? "2px solid #4a9eff" : "2px solid transparent",
    cursor: "pointer",
    fontSize: 12,
    color: isActive ? "#e0e0e0" : "#888",
    whiteSpace: "nowrap" as const,
    minWidth: 0,
    flexShrink: 0,
    maxWidth: 180,
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
    position: "relative" as const,
  }),
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4a9eff",
    flexShrink: 0,
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    border: "none",
    borderRadius: 3,
    background: "transparent",
    color: "#666",
    cursor: "pointer",
    fontSize: 12,
    flexShrink: 0,
    transition: "background 0.1s, color 0.1s",
    marginLeft: 2,
  } as React.CSSProperties,
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: "#666",
    cursor: "pointer",
    fontSize: 16,
    margin: "0 4px",
    flexShrink: 0,
    transition: "background 0.12s, color 0.12s",
  } as React.CSSProperties,
};

// ── Drag State ─────────────────────────────────────────────────────
interface DragState {
  fromIndex: number;
  toIndex: number;
  offsetX: number;
}

// ── Component ──────────────────────────────────────────────────────
interface DocumentTabsProps {
  onNewDocument?: () => void;
  onCloseDocument?: (doc: WorkspaceDocument) => boolean | void | Promise<boolean | void>;
}

export default function DocumentTabs({
  onNewDocument,
  onCloseDocument,
}: DocumentTabsProps) {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const closeDocument = useWorkspaceStore((s) => s.closeDocument);
  const closeOtherDocuments = useWorkspaceStore((s) => s.closeOtherDocuments);
  const closeAllDocuments = useWorkspaceStore((s) => s.closeAllDocuments);
  const reorderDocuments = useWorkspaceStore((s) => s.reorderDocuments);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // ── Ctrl+Tab / Ctrl+Shift+Tab ──
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === "Tab") {
        e.preventDefault();
        const store = useWorkspaceStore.getState();
        const direction = e.shiftKey ? -1 : 1;
        store.cycleTab(direction);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Tab click handlers ──
  const handleTabClick = useCallback(
    (id: string) => {
      setActiveDocument(id);
    },
    [setActiveDocument],
  );

  const handleTabMiddleClick = useCallback(
    async (e: React.MouseEvent, doc: WorkspaceDocument) => {
      if (e.button === 1) {
        e.preventDefault();
        const shouldClose = onCloseDocument ? await onCloseDocument(doc) : true;
        if (shouldClose !== false) {
          closeDocument(doc.id);
        }
      }
    },
    [closeDocument, onCloseDocument],
  );

  const handleCloseClick = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        const shouldClose = onCloseDocument ? await onCloseDocument(doc) : true;
        if (shouldClose !== false) {
          closeDocument(id);
        }
      }
    },
    [closeDocument, documents, onCloseDocument],
  );

  // ── Drag handlers ──
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      setDragState({ fromIndex: index, toIndex: index, offsetX: 0 });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragState((prev) =>
        prev ? { ...prev, toIndex: index } : null,
      );
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragState && dragState.fromIndex !== dragState.toIndex) {
        reorderDocuments(dragState.fromIndex, dragState.toIndex);
      }
      setDragState(null);
    },
    [dragState, reorderDocuments],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<{
    docId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, docId: string) => {
      e.preventDefault();
      setContextMenu({ docId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  if (documents.length === 0) return null;

  return (
    <div ref={barRef} style={styles.bar} role="tablist" aria-label="Document tabs">
      {/* Tab list */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          overflow: "hidden",
          flex: 1,
        }}
      >
        {documents.map((doc, index) => {
          const isActive = doc.id === activeId;
          const isDragging = dragState?.toIndex === index;

          return (
            <div
              key={doc.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`${doc.name}${doc.isDirty ? " (unsaved changes)" : ""}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(doc.id)}
              onMouseDown={(e) => handleTabMiddleClick(e, doc)}
              onContextMenu={(e) => handleContextMenu(e, doc.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              style={{
                ...styles.tab(isActive, doc.isDirty),
                opacity: isDragging ? 0.6 : 1,
                transform: isDragging ? "scale(0.95)" : "none",
                transition: "transform 0.15s, opacity 0.15s",
              }}
              title={doc.filePath ?? doc.name}
            >
              <span style={styles.name}>
                {doc.name}
                {doc.isDirty ? " *" : ""}
              </span>

              {doc.isDirty ? (
                <div style={styles.dirtyDot} />
              ) : null}

              <button
                onClick={(e) => handleCloseClick(e, doc.id)}
                style={styles.closeBtn}
                title="Close (Ctrl+W)"
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = "#333";
                  (e.target as HTMLElement).style.color = "#ccc";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                  (e.target as HTMLElement).style.color = "#666";
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* New document button */}
      {onNewDocument && (
        <button
          onClick={onNewDocument}
          style={styles.addBtn}
          title="New document (Ctrl+N)"
          aria-label="New document"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "#333";
            (e.target as HTMLElement).style.color = "#ccc";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "transparent";
            (e.target as HTMLElement).style.color = "#666";
          }}
        >
          +
        </button>
      )}

      {/* Tab context menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 9998,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            role="menu"
            aria-label="Tab options"
            style={{
              position: "fixed",
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 160),
              zIndex: 9999,
              background: "#252525",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              minWidth: 140,
              padding: "4px 0",
            }}
          >
            {[
              { label: "Close", action: () => closeDocument(contextMenu.docId) },
              {
                label: "Close Others",
                action: () => closeOtherDocuments(contextMenu.docId),
              },
              { label: "Close All", action: () => closeAllDocuments() },
            ].map((item) => (
              <div
                key={item.label}
                role="menuitem"
                tabIndex={-1}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  color: "#ccc",
                  fontSize: 13,
                }}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = "#333";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
