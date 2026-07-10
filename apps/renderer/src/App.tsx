import { useRef, useEffect, useState, useCallback } from "react";
import { usePDF } from "./hooks/usePDF";
import PDFViewer from "./components/PDFViewer";
import LazyThumbnails from "./components/LazyThumbnails";
import DocumentTabs from "./components/DocumentTabs";
import MenuBar from "./components/menu/MenuBar";
import CommandPalette from "./components/CommandPalette";
import SearchPanel from "./components/SearchPanel";
import { ErrorProvider } from "./components/ErrorDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { accessibilityManager } from "./editor/core/AccessibilityManager";
import { keyboardShortcuts } from "./editor/editing/KeyboardShortcuts";
import {
  ConfirmDialog,
  DocumentPropertiesDialog,
  PreferencesDialog,
  AboutDialog,
  PageManagerDialog,
} from "./components/dialogs";
import ExportDialog from "./editor/export/ExportDialog";
import type { ExportOptions } from "./editor/export/ExportDialog";
import { ExportEngine } from "./editor/export/ExportEngine";
import { importEngine, SUPPORTED_IMAGE_TYPES, SUPPORTED_DOCUMENT_TYPES } from "./editor/export/ImportEngine";
import { useEditorStore } from "./editor/state/editorStore";
import {
  useWorkspaceStore,
  useActivePDF,
  useActiveDocument,
} from "./editor/workspace/WorkspaceStore";
import { workspaceManager } from "./editor/workspace/WorkspaceManager";
import { recentFilesManager } from "./editor/editing/RecentFilesManager";
import { settingsManager } from "./editor/core/Settings";

// ── Confirm dialog state ───────────────────────────────────────────
interface ConfirmCloseState {
  docId: string;
  docName: string;
}

export default function App() {
  const { openPDF } = usePDF();
  const activePdf = useActivePDF();
  const activeDoc = useActiveDocument();
  const [activePage, setActivePage] = useState(1);
  const [sidebarVisible, setSidebarVisible] = useState(
    settingsManager.get("showSidebar"),
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pageManagerOpen, setPageManagerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [confirmClose, setConfirmClose] =
    useState<ConfirmCloseState | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const exportEngineRef = useRef(new ExportEngine());

  const setStoreActivePage = useEditorStore((s) => s.setActivePage);
  const documents = useWorkspaceStore((s) => s.documents);
  const [inspectorVisible, setInspectorVisible] = useState(true);

  // ── Initialize accessibility and keyboard shortcuts ──
  useEffect(() => {
    keyboardShortcuts.attach();
    return () => keyboardShortcuts.detach();
  }, []);

  // Apply accessibility attributes to root
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      root.setAttribute("role", "application");
      root.setAttribute("aria-label", "Docflow PDF Editor");
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+P — Command Palette
      if (isMod && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setCommandPaletteOpen((p) => !p);
        return;
      }

      // Ctrl+B — Toggle Sidebar
      if (isMod && e.key === "b") {
        e.preventDefault();
        setSidebarVisible((p) => !p);
        return;
      }

      // Ctrl+W — Close current tab
      if (isMod && e.key === "w") {
        e.preventDefault();
        const id = useWorkspaceStore.getState().activeDocumentId;
        if (id) {
          workspaceManager.closeDocument(id);
        }
        return;
      }

      // Ctrl+S — Save
      if (isMod && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        const id = useWorkspaceStore.getState().activeDocumentId;
        if (id) workspaceManager.saveDocument(id);
        return;
      }

      // Ctrl+Shift+S — Save As
      if (isMod && e.shiftKey && e.key === "s") {
        e.preventDefault();
        const id = useWorkspaceStore.getState().activeDocumentId;
        if (id) workspaceManager.saveDocumentAs(id);
        return;
      }

      // Ctrl+N — New Document
      if (isMod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        workspaceManager.newDocument();
        return;
      }

      // Ctrl+O — Open
      if (isMod && e.key === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Sync active page ──
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activePdf) return;

    const handleScroll = () => {
      const viewerRect = viewer.getBoundingClientRect();
      const pages = viewer.querySelectorAll<HTMLElement>(
        "[data-page-index]",
      );
      let closestPage = activePage;
      let closestDist = Infinity;

      pages.forEach((page) => {
        const rect = page.getBoundingClientRect();
        const dist = Math.abs(rect.top - viewerRect.top);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = parseInt(
            page.getAttribute("data-page-index") || "1",
            10,
          );
        }
      });

      setActivePage(closestPage);
      setStoreActivePage(closestPage);
    };

    const mutationObserver = new MutationObserver(() => {
      if (
        viewer.querySelectorAll("[data-page-index]").length > 0
      ) {
        requestAnimationFrame(handleScroll);
      }
    });

    mutationObserver.observe(viewer, { childList: true, subtree: true });
    viewer.addEventListener("scroll", handleScroll, { passive: true });

    const checkInterval = setInterval(() => {
      if (
        viewer.querySelectorAll("[data-page-index]").length > 0
      ) {
        handleScroll();
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);

    return () => {
      viewer.removeEventListener("scroll", handleScroll);
      mutationObserver.disconnect();
      clearInterval(checkInterval);
    };
  }, [activePdf, activePage, setStoreActivePage]);

  // ── Import Engine Integration ──
  useEffect(() => {
    importEngine.onProgress = (progress) => {
      // Future: wire progress to UI
    };
  }, []);

  // ── Drag & Drop (uses ImportEngine) ──
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      // Separate images and PDFs to avoid double-loading PDFs
      const imageFiles = files.filter((f) => SUPPORTED_IMAGE_TYPES.includes(f.type));
      const pdfFiles = files.filter((f) => f.type === "application/pdf");

      // Import images via ImportEngine
      if (imageFiles.length > 0) {
        await importEngine.importFiles(imageFiles);
      }

      // Open PDFs via workspaceManager (avoids double-loading)
      for (const file of pdfFiles) {
        await handleFileOpen(file);
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  // ── Clipboard paste (uses ImportEngine) ──
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // Don't intercept paste in input fields
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const result = await importEngine.importFromClipboard(e.clipboardData);
      if (!result.success && result.errors.length > 0) {
        // Silently fail for clipboard — user may have copied non-image content
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handlePageClick = useCallback(
    (pageNum: number) => {
      setActivePage(pageNum);
      setStoreActivePage(pageNum);
      const el = document.querySelector(
        `[data-page-index="${pageNum}"]`,
      );
      if (el)
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [setStoreActivePage],
  );

  // ── File operations (uses ImportEngine for images, workspace for PDFs) ──
  const handleFileOpen = useCallback(async (file: File) => {
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      // Import image via ImportEngine
      const result = await importEngine.importFile(file);
      return;
    }
    if (SUPPORTED_DOCUMENT_TYPES.includes(file.type)) {
      const tabId = await workspaceManager.openFile(file);
      if (tabId) {
        workspaceManager.switchToDocument(tabId);
      }
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileOpen(file);
      // Reset input so same file can be re-opened
      e.target.value = "";
    },
    [handleFileOpen],
  );

  const handleCloseTab = useCallback(
    async (doc: { id: string; name: string; isDirty: boolean }): Promise<boolean> => {
      if (doc.isDirty) {
        setConfirmClose({ docId: doc.id, docName: doc.name });
        return false; // Don't close yet - wait for dialog
      }
      return true; // Allow close
    },
    [],
  );

  const handleConfirmClose = useCallback(async () => {
    if (!confirmClose) return;
    await workspaceManager.saveDocument(confirmClose.docId);
    workspaceManager.closeDocument(confirmClose.docId);
    setConfirmClose(null);
  }, [confirmClose]);

  const handleDiscardClose = useCallback(() => {
    if (!confirmClose) return;
    workspaceManager.closeDocument(confirmClose.docId);
    setConfirmClose(null);
  }, [confirmClose]);

  // ── Tab switching ──
  const handleTabSwitch = useCallback(
    (docId: string) => {
      workspaceManager.switchToDocument(docId);
    },
    [],
  );

  // ── Menu callbacks ──
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarVisible((p) => !p);
  }, []);

  const handleToggleInspector = useCallback(() => {
    setInspectorVisible((p) => !p);
  }, []);

  const handleDocumentProperties = useCallback(() => {
    if (activeDoc) setPropertiesOpen(true);
  }, [activeDoc]);

  const handlePreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const handleAbout = useCallback(() => {
    setAboutOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  const handleExportStart = useCallback(async (options: ExportOptions) => {
    const store = useEditorStore.getState();
    const wsStore = useWorkspaceStore.getState();
    const doc = wsStore.documents.find(d => d.id === wsStore.activeDocumentId);
    if (!doc?.pdf) return;

    try {
      // Get the original PDF bytes
      const pdfData = await doc.pdf.getData();
      const pdfBytes = new Uint8Array(pdfData);
      const overlayObjects = store.overlayObjects;

      // Configure export range
      let range;
      switch (options.range) {
        case "all":
          range = { type: "all" as const };
          break;
        case "current":
          range = { type: "current" as const };
          break;
        case "pages":
          if (options.pageRange) {
            const pages = options.pageRange
              .split(",")
              .flatMap((part) => {
                const trimmed = part.trim();
                const match = trimmed.match(/^(\d+)(?:-(\d+))?$/);
                if (!match) return [];
                const start = parseInt(match[1], 10);
                if (match[2]) {
                  const end = parseInt(match[2], 10);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                }
                return [start];
              });
            range = { type: "pages" as const, pages };
          } else {
            range = { type: "all" as const };
          }
          break;
        default:
          range = { type: "all" as const };
      }

      // Set up export engine
      const engine = exportEngineRef.current;
      engine.setSettings({
        includeOverlays: true,
        preserveMetadata: options.preserveMetadata,
        flatten: options.flattenAnnotations,
        embedFonts: options.format === "pdf",
        compressionLevel: options.optimizeSize ? 9 : 6,
        author: "Docflow",
        subject: "",
        keywords: "",
      });

      const result = await engine.export(pdfBytes, overlayObjects, range);

      if (result.success && result.bytes) {
        // Trigger download
        const ext = options.format === "pdf" ? "pdf" : options.format === "jpeg" ? "jpg" : "png";
        const blob = new Blob([result.bytes], {
          type: options.format === "pdf" ? "application/pdf" : `image/${options.format}`,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.name || "export"}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Export failed:", err);
      }
    }
  }, []);

  // ── Empty state ──
  const hasDocuments = documents.length > 0;
  const showEmptyState = !activePdf;

  return (
    <ErrorProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "#111",
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id="pdf-file-input"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,image/avif"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Menu Bar */}
        <MenuBar
          onOpenFile={handleOpenFile}
          onToggleCommandPalette={() => setCommandPaletteOpen((p) => !p)}
          onToggleSidebar={handleToggleSidebar}
          onToggleInspector={handleToggleInspector}
          onDocumentProperties={handleDocumentProperties}
          onPreferences={handlePreferences}
          onAbout={handleAbout}
        />

        {/* Document Tabs */}
        {hasDocuments && (
          <DocumentTabs
            onNewDocument={() => fileInputRef.current?.click()}
            onCloseDocument={handleCloseTab}
          />
        )}

        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Sidebar toggle button */}
          {activePdf && (
            <button
              onClick={handleToggleSidebar}
              style={{
                position: "absolute",
                left: sidebarVisible ? 182 : 4,
                top: 8,
                zIndex: 50,
                background: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#888",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: 11,
                transition: "left 0.2s",
              }}
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarVisible ? "◀" : "▶"}
            </button>
          )}

          {/* Sidebar */}
          {activePdf && sidebarVisible && (
            <LazyThumbnails
              pdf={activePdf}
              activePage={activePage}
              onPageClick={handlePageClick}
            />
          )}

          {/* Main content */}
          <div
            ref={viewerRef}
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activePdf ? (
              <PDFViewer
                pdf={activePdf}
                sidebarVisible={sidebarVisible}
                onToggleSidebar={handleToggleSidebar}
                onOpenPageManager={() => setPageManagerOpen(true)}
              />
            ) : (
              <EmptyState
                onOpenFile={() => fileInputRef.current?.click()}
                onNewDocument={() => workspaceManager.newDocument()}
              />
            )}
          </div>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* Dialogs */}
        <ConfirmDialog
          open={confirmClose !== null}
          title="Unsaved Changes"
          message={`"${confirmClose?.docName ?? ""}" has unsaved changes. Do you want to save before closing?`}
          confirmLabel="Save & Close"
          cancelLabel="Cancel"
          extraLabel="Discard"
          variant="warning"
          onConfirm={handleConfirmClose}
          onCancel={() => setConfirmClose(null)}
          onExtra={handleDiscardClose}
        />

        <DocumentPropertiesDialog
          open={propertiesOpen}
          onClose={() => setPropertiesOpen(false)}
        />

        <PreferencesDialog
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
        />

        <AboutDialog
          open={aboutOpen}
          onClose={() => setAboutOpen(false)}
        />

        <PageManagerDialog
          open={pageManagerOpen}
          onClose={() => setPageManagerOpen(false)}
        />

        {/* Export Dialog */}
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExportStart}
        />
      </div>
    </ErrorProvider>
  );
}

// ── Empty State Component ──────────────────────────────────────────
function EmptyState({
  onOpenFile,
  onNewDocument,
}: {
  onOpenFile: () => void;
  onNewDocument: () => void;
}) {
  const recentFiles = recentFilesManager.files.slice(0, 5);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#666",
        fontSize: 16,
        gap: 16,
        animation: "fadeIn 0.3s ease",
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <span style={{ fontSize: 64, opacity: 0.3 }}>📄</span>
      <span style={{ color: "#888" }}>Drop a PDF here to get started</span>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={onOpenFile}
          style={{
            padding: "10px 24px",
            border: "1px solid #444",
            borderRadius: 6,
            background: "#2a2a2a",
            color: "#ccc",
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "#333";
            (e.target as HTMLElement).style.borderColor = "#555";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "#2a2a2a";
            (e.target as HTMLElement).style.borderColor = "#444";
          }}
        >
          Open PDF
        </button>
        <button
          onClick={onNewDocument}
          style={{
            padding: "10px 24px",
            border: "1px solid #3a6ea5",
            borderRadius: 6,
            background: "#1a2a3a",
            color: "#4a9eff",
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "#1e3040";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "#1a2a3a";
          }}
        >
          New Document
        </button>
      </div>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div
          style={{
            marginTop: 32,
            textAlign: "center",
            animation: "fadeIn 0.4s ease 0.1s both",
          }}
        >
          <div
            style={{
              color: "#555",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Recent Files
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {recentFiles.map((entry) => (
              <button
                key={entry.path}
                onClick={onOpenFile}
                style={{
                  color: "#777",
                  fontSize: 13,
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  padding: "3px 0",
                  textAlign: "center",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "#aaa";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "#777";
                }}
                title={entry.path}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
