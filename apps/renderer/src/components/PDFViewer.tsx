/**
 * PDFViewer.tsx — PDF Page Viewer with Virtual Rendering
 *
 * Purpose: Render PDF pages using the VirtualPageRenderer for
 * efficient memory usage on large documents.
 *
 * Features:
 *   - Virtual page rendering — only visible pages consume memory
 *   - CanvasPool for canvas reuse (reduces GC pressure)
 *   - pdfjs page disposal after render (frees worker memory)
 *   - ResizeObserver on container for automatic re-render
 *   - Ctrl+scroll zoom, drag-to-pan at high zoom levels
 *   - Overlay rendering (annotations, text, shapes, etc.)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEditorStore } from "../editor/state/editorStore";
import { RenderingManager } from "../editor/rendering/RenderingManager";
import { VirtualPageRenderer } from "../editor/rendering/VirtualPageRenderer";
import { OverlayRenderer } from "../editor/rendering/OverlayRenderer";
import { viewerErrorHandler } from "../editor/core/ErrorManager";
import InspectorPanel from "./InspectorPanel";
import StatusBar from "./StatusBar";
import ContextMenu from "./ContextMenu";
import SearchPanel from "./SearchPanel";

interface PDFViewerProps {
  pdf: PDFDocumentProxy;
  zoomLevel: number;
  fitMode: "width" | "page";
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function PDFViewer({ pdf, zoomLevel, fitMode, onZoomIn, onZoomOut }: PDFViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const managerRef = useRef<RenderingManager | null>(null);
  const virtualRendererRef = useRef<VirtualPageRenderer | null>(null);
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
  const zoomRef = useRef(zoomLevel);
  const fitModeRef = useRef(fitMode);
  zoomRef.current = zoomLevel;
  fitModeRef.current = fitMode;
  const onZoomInRef = useRef(onZoomIn);
  const onZoomOutRef = useRef(onZoomOut);
  onZoomInRef.current = onZoomIn;
  onZoomOutRef.current = onZoomOut;

  // Sync editor store
  const setStoreActivePage = useEditorStore((s) => s.setActivePage);
  const isDirty = useEditorStore((s) => s.isDirty);

  // ── Ctrl+F for search ──
  useEffect(() => {
    const handleSearch = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", handleSearch);
    return () => {
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

  // ── Initialize virtual page renderer ──
  useEffect(() => {
    const pagesEl = pagesRef.current;
    const scrollEl = scrollRef.current;
    if (!pagesEl || !scrollEl) return;

    // Destroy previous virtual renderer if exists
    virtualRendererRef.current?.destroy();

    // Create and initialize new virtual renderer
    const renderer = new VirtualPageRenderer(pdf, manager, pagesEl, scrollEl);
    virtualRendererRef.current = renderer;

    renderer.initialize().catch((err) => {
      viewerErrorHandler.error(
        "Virtual Render Init",
        `Failed to initialize virtual page renderer: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return () => {
      renderer.destroy();
      virtualRendererRef.current = null;
      setPan({ x: 0, y: 0 });
      panAtDragStart.current = { x: 0, y: 0 };
    };
  }, [pdf, manager]);

  // ── Sync zoom/fitMode to virtual renderer ──
  useEffect(() => {
    const renderer = virtualRendererRef.current;
    if (!renderer) return;
    renderer.setZoom(zoomLevel, fitMode);
    renderer.refreshVisible();
  }, [zoomLevel, fitMode]);

  // ── Ctrl+scroll zoom ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY > 0) onZoomOutRef.current();
      else onZoomInRef.current();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Pan ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoomRef.current <= 1) return;
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panAtDragStart.current = { x: pan.x, y: pan.y };
      e.preventDefault();
    },
    [pan.x, pan.y],
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
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
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
