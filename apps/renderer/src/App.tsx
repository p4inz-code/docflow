import { useRef, useEffect, useState, useCallback } from "react";
import { usePDF } from "./hooks/usePDF";
import PDFViewer from "./components/PDFViewer";
import LazyThumbnails from "./components/LazyThumbnails";
import DocumentTabs from "./components/DocumentTabs";
import MenuBar from "./components/menu/MenuBar";
import Toolbar from "./components/Toolbar";
import CommandPalette from "./components/CommandPalette";
import { FileText, ChevronLeft, ChevronRight } from "./components/Icons";
import { ErrorProvider } from "./components/ErrorDialog";
import { ScreenReaderAnnouncer, useAnnouncer } from "./components/ScreenReaderAnnouncer";
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
import { SavePipeline } from "./editor/export/SavePipeline";
import { AutosaveManager } from "./editor/export/AutosaveManager";
import { RecoveryManager } from "./editor/export/RecoveryManager";
import { importEngine, SUPPORTED_IMAGE_TYPES, SUPPORTED_DOCUMENT_TYPES } from "./editor/export/ImportEngine";
import { useEditorStore } from "./editor/state/editorStore";
import {
  useWorkspaceStore,
  useActivePDF,
  useActiveDocument,
} from "./editor/workspace/WorkspaceStore";
import { workspaceManager } from "./editor/workspace/WorkspaceManager";
import { workspaceErrorHandler } from "./editor/core/ErrorManager";
import { recentFilesManager } from "./editor/editing/RecentFilesManager";
import { useTheme } from "./hooks/useTheme";
import { settingsManager } from "./editor/core/Settings";

// ── Confirm dialog state ───────────────────────────────────────────
interface ConfirmCloseState {
  docId: string;
  docName: string;
}

export default function App() {
  return (
    <ErrorProvider>
      <ScreenReaderAnnouncer>
        <AppContent />
      </ScreenReaderAnnouncer>
    </ErrorProvider>
  );
}

// ── Inner component (must be inside providers) ─────────────────────
function AppContent() {
  useTheme();
  usePDF();
  const activePdf = useActivePDF();
  const activeDoc = useActiveDocument();
  const [sidebarVisible, setSidebarVisible] = useState(
    settingsManager.get("showSidebar"),
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pageManagerOpen, setPageManagerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(
    settingsManager.get("defaultZoom"),
  );
  const [fitMode, setFitMode] = useState<"width" | "page">(
    settingsManager.get("defaultFitMode"),
  );
  const [confirmClose, setConfirmClose] =
    useState<ConfirmCloseState | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const setStoreActivePage = useEditorStore((s) => s.setActivePage);
  const documents = useWorkspaceStore((s) => s.documents);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // ── Accessibility announcer ──
  const { announce } = useAnnouncer();

  // ── Create singleton services (lazy, once) ──────────────────
  const exportEngineRef = useRef<ExportEngine | null>(null);
  const savePipelineRef = useRef<SavePipeline | null>(null);
  const autosaveManagerRef = useRef<AutosaveManager | null>(null);
  const recoveryManagerRef = useRef<RecoveryManager | null>(null);
  const initDoneRef = useRef(false);

  if (!exportEngineRef.current) {
    exportEngineRef.current = new ExportEngine();
  }

  if (!savePipelineRef.current) {
    savePipelineRef.current = new SavePipeline(exportEngineRef.current);
    // Register the write callback (browser: trigger download, Electron: write to fs)
    savePipelineRef.current.setWriteFileCallback(async (_path, _data) => {
      // In browser mode, actual write is handled by triggering download
      // In Electron, this would write to the file system
    });
  }

  if (!autosaveManagerRef.current) {
    autosaveManagerRef.current = new AutosaveManager(savePipelineRef.current);
    // Sync with settings
    const settings = settingsManager.get();
    autosaveManagerRef.current.configure({
      enabled: settings.autosaveEnabled,
      interval: settings.autosaveInterval,
    });
  }

  if (!recoveryManagerRef.current) {
    recoveryManagerRef.current = new RecoveryManager();
    // In browser mode, recovery is localStorage-backed (no real filesystem)
    recoveryManagerRef.current.setSavePipeline(savePipelineRef.current);
  }

  const savePipeline = savePipelineRef.current;
  const autosaveManager = autosaveManagerRef.current;
  const recoveryManager = recoveryManagerRef.current;

  // ── Wire the SavePipeline into WorkspaceManager ──────────────
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    // Wire SavePipeline into WorkspaceManager
    workspaceManager.setSavePipeline(savePipeline);

    // Register workspace save callback (for download trigger)
    workspaceManager.onSaveDocument(async (_docId, _pdfBytes) => {
      // In browser mode, actual file write is handled via download
      // The SavePipeline handles the export; this callback confirms
      return true;
    });

    // Subscribe to settings changes for autosave
    const unsubSettings = settingsManager.onChange((settings) => {
      autosaveManager.configure({
        enabled: settings.autosaveEnabled,
        interval: settings.autosaveInterval,
      });
    });

    // Attempt workspace session restore
    workspaceManager.restoreSession().then((restored) => {
      if (restored > 0 && process.env.NODE_ENV !== "production") {
        workspaceErrorHandler.warn(
          "Session Restore",
          `Restored ${restored} document(s) from previous session`,
        );
      }
    });

    return () => {
      unsubSettings();
    };
  }, [savePipeline, autosaveManager]);

  // ── Start/stop autosave based on document state ──────────────
  useEffect(() => {
    if (documents.length > 0) {
      autosaveManager.start();
      // Start a recovery session for each open document
      for (const doc of documents) {
        if (doc.filePath) {
          recoveryManager.startSession(doc.filePath);
        }
      }
    } else {
      autosaveManager.stop();
      recoveryManager.endAllSessions();
    }

    return () => {
      // Cleanup is handled by the next effect cycle
    };
  }, [documents.length, autosaveManager, recoveryManager]);

  // ── Crash safety handlers ───────────────────────────────────
  useEffect(() => {
    // beforeunload: warn user of unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const wsStore = useWorkspaceStore.getState();
      const hasUnsaved = wsStore.documents.some((d) => d.isDirty);
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    // visibilitychange: autosave dirty documents when tab is hidden
    // This covers browser tab close, navigation away, and mobile suspend
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is being hidden — force autosave of all dirty documents
        autosaveManager.flush();
      }
    };

    // pagehide: similar to beforeunload but fires on mobile too
    const handlePageHide = () => {
      autosaveManager.flush();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [autosaveManager]);

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

  // ── Import Engine Integration ──
  useEffect(() => {
    importEngine.onProgress = (progress) => {
      announce(`Importing: ${progress.stage} (${progress.current}/${progress.total})`);
    };
  }, [announce]);

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
        announce(`Importing ${imageFiles.length} image(s)...`);
        await importEngine.importFiles(imageFiles);
      }

      // Open PDFs via workspaceManager (avoids double-loading)
      for (const file of pdfFiles) {
        const tabId = await workspaceManager.openFile(file);
        if (tabId) {
          workspaceManager.switchToDocument(tabId);
          announce(`Opened ${file.name}`);
        }
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
  }, [announce]);

  // ── Clipboard paste (uses ImportEngine) ──
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // Don't intercept paste in input fields
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const result = await importEngine.importFromClipboard(e.clipboardData);
      if (result.count > 0) {
        announce(`Pasted ${result.count} item(s)`);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [announce]);

  const handlePageClick = useCallback(
    (pageNum: number) => {
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
      await importEngine.importFile(file);
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
      if (file) void handleFileOpen(file);
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
    announce(`Saved and closed ${confirmClose.docName}`);
    setConfirmClose(null);
  }, [confirmClose, announce]);

  const handleDiscardClose = useCallback(() => {
    if (!confirmClose) return;
    workspaceManager.closeDocument(confirmClose.docId);
    announce(`Closed ${confirmClose.docName} without saving`);
    setConfirmClose(null);
  }, [confirmClose, announce]);

  // ── Export handler ──────────────────────────────────────────────
  const handleExportStart = useCallback(async (options: ExportOptions) => {
    const store = useEditorStore.getState();
    const wsStore = useWorkspaceStore.getState();
    const doc = wsStore.documents.find(d => d.id === wsStore.activeDocumentId);
    if (!doc?.pdf) return;

    setExportDialogOpen(false);

    try {
      announce("Starting export...");
      // Get the original PDF bytes
      const pdfData = await doc.pdf.getData();
      const pdfBytes = new Uint8Array(pdfData);
      const overlayObjects = store.overlayObjects;

      // Determine export range
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
      const engine = exportEngineRef.current!;
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
        const extLabel = options.format.toUpperCase();
        const blob = new Blob([result.bytes as BlobPart], {
          type: options.format === "pdf" ? "application/pdf" : `image/${options.format}`,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.name || "export"}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        announce(`Exported successfully as ${extLabel}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      workspaceErrorHandler.error("Export", `Export failed: ${message}`);
      announce("Export failed", "assertive");
    }
  }, [exportEngineRef, announce, workspaceErrorHandler]);

  // ── Menu callbacks ──
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarVisible((p) => !p);
    announce(sidebarVisible ? "Sidebar hidden" : "Sidebar shown");
  }, [sidebarVisible, announce]);

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
    if (activeDoc) setExportDialogOpen(true);
  }, [activeDoc]);

  // ── Zoom / Fit callbacks ──
  const zoomIn = useCallback(() => setZoomLevel((p) => Math.min(3, +(p + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoomLevel((p) => Math.max(0.5, +(p - 0.1).toFixed(2))), []);
  const handleFitWidth = useCallback(() => { setFitMode("width"); setZoomLevel(1); }, []);
  const handleFitPage = useCallback(() => { setFitMode("page"); setZoomLevel(1); }, []);

  // ── Empty state ──
  const hasDocuments = documents.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
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
        onToggleInspector={() => {}}
        onDocumentProperties={handleDocumentProperties}
        onPreferences={handlePreferences}
        onAbout={handleAbout}
        onExport={handleExport}
      />

      {/* Toolbar — always visible, tools disabled when no document */}
      <Toolbar
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onOpenFile={() => fileInputRef.current?.click()}
        disabled={!activePdf}
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
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-secondary)",
              borderRadius: 4,
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: 11,
              transition: "left 0.2s",
            }}
            title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarVisible ? <ChevronLeft size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
          </button>
        )}

        {/* Sidebar */}
        {activePdf && sidebarVisible && (
          <LazyThumbnails
            pdf={activePdf}
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
            minWidth: 0,
          }}
        >
          {activePdf ? (
            <PDFViewer
              pdf={activePdf}
              zoomLevel={zoomLevel}
              fitMode={fitMode}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
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
        color: "var(--text-dim)",
        fontSize: 16,
        gap: 16,
        animation: "fadeIn 0.3s ease",
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <FileText size={64} style={{ opacity: 0.3 }} aria-hidden="true" />
      <span style={{ color: "var(--text-muted)" }}>Drop a PDF here to get started</span>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={onOpenFile}
          className="empty-state-btn"
          style={{
            padding: "10px 24px",
            border: "1px solid var(--border-primary)",
            borderRadius: 6,
            background: "var(--bg-hover)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "var(--bg-active)";
            (e.target as HTMLElement).style.borderColor = "var(--border-tertiary)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "var(--bg-hover)";
            (e.target as HTMLElement).style.borderColor = "var(--border-primary)";
          }}
        >
          Open PDF
        </button>
        <button
          onClick={onNewDocument}
          style={{
            padding: "10px 24px",
            border: "1px solid var(--accent)",
            borderRadius: 6,
            background: "var(--accent-bg)",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "var(--accent-bg)";
            (e.target as HTMLElement).style.filter = "brightness(1.1)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "var(--accent-bg)";
            (e.target as HTMLElement).style.filter = "none";
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
              color: "var(--text-faint)",
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
                  color: "var(--text-dim)",
                  fontSize: 13,
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  padding: "3px 0",
                  textAlign: "center",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "var(--text-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "var(--text-dim)";
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
