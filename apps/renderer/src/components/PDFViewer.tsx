import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEditorStore } from "../editor/state/editorStore";
import { RenderingManager } from "../editor/rendering/RenderingManager";
import { OverlayRenderer } from "../editor/rendering/OverlayRenderer";
import { keyboardShortcuts } from "../editor/editing/KeyboardShortcuts";
import { settingsManager } from "../editor/core/Settings";
import Toolbar from "./Toolbar";
import InspectorPanel from "./InspectorPanel";
import StatusBar from "./StatusBar";
import ContextMenu from "./ContextMenu";
import SearchPanel from "./SearchPanel";

interface PDFViewerProps {
  pdf: PDFDocumentProxy;
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  onOpenPageManager?: () => void;
}

type FitMode = "width" | "page";

export default function PDFViewer({ pdf, sidebarVisible, onToggleSidebar, onOpenPageManager }: PDFViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(settingsManager.get("defaultZoom"));
  const [fitMode, setFitMode] = useState<FitMode>(settingsManager.get("defaultFitMode"));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const managerRef = useRef<RenderingManager | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const pageCount = pdf.numPages;

  // Create the rendering manager once
  if (!managerRef.current) {
    managerRef.current = new RenderingManager();
  }
  const manager = managerRef.current;

  // Refs for drag-to-pan state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panAtDragStart = useRef({ x: 0, y: 0 });

  // Sync editor store
  const setStoreActivePage = useEditorStore((s) => s.setActivePage);
  const isDirty = useEditorStore((s) => s.isDirty);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    keyboardShortcuts.attach();
    // Add Ctrl+F for search
    const handleSearch = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", handleSearch);
    return () => {
      keyboardShortcuts.detach();
      document.removeEventListener("keydown", handleSearch);
    };
  }, []);

  // ── Update window title ──
  useEffect(() => {
    const base = "Docflow";
    const file = useEditorStore.getState().fileName;
    document.title = file
      ? `${file}${isDirty ? " •" : ""} - ${base}`
      : base;
  }, [isDirty]);

  // ── Sync page on scroll ──
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const pages = scrollEl.querySelectorAll<HTMLElement>("[data-page-index]");
      let closestPage = activePage;
      let closestDist = Infinity;
      const scrollRect = scrollEl.getBoundingClientRect();

      pages.forEach((page) => {
        const rect = page.getBoundingClientRect();
        const dist = Math.abs(rect.top - scrollRect.top);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = parseInt(page.getAttribute("data-page-index") || "1", 10);
        }
      });

      if (closestPage !== activePage) {
        setActivePage(closestPage);
        setStoreActivePage(closestPage);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [activePage, setStoreActivePage]);

  // ── Render pages ──
  useEffect(() => {
    const pagesEl = pagesRef.current;
    const scrollEl = scrollRef.current;
    if (!pagesEl || !scrollEl) return;

    let cancelled = false;

    (async () => {
      try {
        pagesEl.innerHTML = "";
        const containerWidth = scrollEl.clientWidth;
        if (containerWidth <= 0) return;

        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          if (cancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1 });

          let baseScale: number;
          if (fitMode === "page") {
            const containerHeight = scrollEl.clientHeight;
            const scaleW = (containerWidth - 48) / unscaledViewport.width;
            const scaleH = (containerHeight - 48) / unscaledViewport.height;
            baseScale = Math.min(scaleW, scaleH);
          } else {
            baseScale = (containerWidth - 48) / unscaledViewport.width;
          }

          const scale = baseScale * zoomLevel;
          const viewport = page.getViewport({ scale });

          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-page-index", String(i));
          wrapper.style.cssText = `
            position: relative;
            display: flex;
            justify-content: center;
            margin-bottom: ${i < totalPages ? "16px" : "0"};
          `;

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = `box-shadow: 0 4px 24px rgba(0,0,0,0.5);`;

          wrapper.appendChild(canvas);
          manager.createPageContainer(i, wrapper);
          pagesEl.appendChild(wrapper);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) {
          setStoreActivePage(1);
        }
      } catch (err) {
        if (!cancelled) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Failed to render PDF:", err);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      manager.destroyAllContainers();
      setPan({ x: 0, y: 0 });
      panAtDragStart.current = { x: 0, y: 0 };
    };
  }, [pdf, zoomLevel, fitMode, manager, setStoreActivePage]);

  // ── Ctrl+scroll zoom ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomLevel((prev) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.max(0.5, Math.min(3, +(prev + delta).toFixed(2)));
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Pan ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoomLevel <= 1) return;
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panAtDragStart.current = { x: pan.x, y: pan.y };
      e.preventDefault();
    },
    [zoomLevel, pan.x, pan.y],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: panAtDragStart.current.x + (e.clientX - dragStart.current.x),
      y: panAtDragStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Zoom controls ──
  const zoomIn = useCallback(() => setZoomLevel((p) => Math.min(3, +(p + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoomLevel((p) => Math.max(0.5, +(p - 0.1).toFixed(2))), []);
  const handleFitWidth = useCallback(() => { setFitMode("width"); setZoomLevel(1); }, []);
  const handleFitPage = useCallback(() => { setFitMode("page"); setZoomLevel(1); }, []);

  const handleOpenFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.click();
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) {
        const appInput = document.querySelector<HTMLInputElement>("#pdf-file-input");
        if (appInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          appInput.files = dt.files;
          appInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  }, []);

  const toggleSearch = useCallback(() => setSearchOpen((p) => !p), []);

  const getPageWrapper = useCallback(
    (pageIndex: number) => {
      if (pageIndex < 1 || pageIndex > pageCount) return null;
      return document.querySelector<HTMLElement>(`[data-page-index="${pageIndex}"]`);
    },
    [pageCount],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1a1a1a",
        position: "relative",
      }}
    >
      <Toolbar
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onOpenFile={handleOpenFile}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: scrollRef.current ? "auto" : "hidden",
            cursor: zoomLevel > 1
              ? isDragging.current ? "grabbing" : "grab"
              : "default",
            userSelect: zoomLevel > 1 ? "none" : "auto",
            position: "relative",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={pagesRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              padding: "24px 0",
            }}
          />
        </div>

        <InspectorPanel />
      </div>

      <StatusBar activePage={activePage} totalPages={pageCount} zoomLevel={zoomLevel} />
      <ContextMenu />
      <SearchPanel pdf={pdf} isOpen={searchOpen} onToggle={toggleSearch} />

      <OverlayRenderer
        manager={manager}
        pageCount={pageCount}
        getPageWrapper={getPageWrapper}
        zoomLevel={zoomLevel}
      />
    </div>
  );
}
