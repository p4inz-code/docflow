/**
 * LazyThumbnails.tsx — Lazy Thumbnail Rendering
 *
 * Purpose: Render PDF page thumbnails lazily using IntersectionObserver.
 * Only renders thumbnails that are in or near the viewport, reducing
 * memory and CPU usage for large documents.
 *
 * Features:
 *   - Only renders visible thumbnails
 *   - Pre-renders thumbnails just above/below the visible area
 *   - Caches rendered thumbnails per session
 *   - Maintains scroll position
 *   - Current page indicator
 *   - Page context menu (rotate, delete, duplicate)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEditorStore } from "../editor/state/editorStore";
import { LRUCache } from "../editor/rendering/LRUCache";

interface LazyThumbnailsProps {
  pdf: PDFDocumentProxy;
  onPageClick: (pageNumber: number) => void;
}

const THUMB_BUFFER = 3; // Pre-render N thumbnails above/below viewport
const THUMB_WIDTH = 140;

export default function LazyThumbnails({ pdf, onPageClick }: LazyThumbnailsProps) {
  // Read active page from the central store (single source of truth)
  const storeActivePage = useEditorStore((s) => s.activePage);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 10 });
  // Bounded LRU cache prevents unbounded memory growth on large documents
  const thumbCache = useRef<LRUCache<number, string>>(
    new LRUCache<number, string>(200), // Max 200 thumbnails cached
  );
  const [contextMenu, setContextMenu] = useState<{
    pageNum: number;
    x: number;
    y: number;
  } | null>(null);

  // Observe scroll to determine which thumbnails are visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const totalPages = pdf.numPages;
      const thumbHeight = THUMB_WIDTH * 1.4 + 40; // Approximate height per thumbnail

      const start = Math.max(1, Math.floor(scrollTop / thumbHeight) - THUMB_BUFFER);
      const end = Math.min(
        totalPages,
        Math.ceil((scrollTop + containerHeight) / thumbHeight) + THUMB_BUFFER,
      );

      setVisibleRange({ start, end });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Initial calculation
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [pdf.numPages]);

  // Render thumbnails in the visible range
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let i = visibleRange.start; i <= visibleRange.end; i++) {
        if (cancelled) break;
        if (thumbCache.current.has(i)) continue;

        try {
          const page = await pdf.getPage(i);
          if (cancelled) break;

          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = THUMB_WIDTH / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          // Render to an off-screen canvas
          const offCanvas = document.createElement("canvas");
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          const ctx = offCanvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport } as any).promise;

          // Store as data URL in cache (LRU eviction prevents unbounded growth)
          thumbCache.current.set(i, offCanvas.toDataURL());
        } catch {
          // Skip failed thumbnails — rendering errors are non-fatal
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Thumbnails] Failed to render thumbnail for page:", i);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, visibleRange.start, visibleRange.end]);

  // ── Page rotation state ──
  const [pageRotations, setPageRotations] = useState<Map<number, number>>(new Map());
  const getRotation = useCallback(
    (pageNum: number): number => pageRotations.get(pageNum) ?? 0,
    [pageRotations],
  );

  // Context menu actions
  const handleContextMenuAction = useCallback(
    (action: string, pageNum: number) => {
      setContextMenu(null);

      switch (action) {
        case "rotate-cw": {
          setPageRotations((prev) => {
            const next = new Map(prev);
            const current = next.get(pageNum) ?? 0;
            next.set(pageNum, (current + 90) % 360);
            return next;
          });
          break;
        }
        case "rotate-ccw": {
          setPageRotations((prev) => {
            const next = new Map(prev);
            const current = next.get(pageNum) ?? 0;
            next.set(pageNum, (current - 90 + 360) % 360);
            return next;
          });
          break;
        }
        case "delete": {
          // Visually mark page as deleted; real PDF page deletion
          // requires pdf-lib integration
          const pages = document.querySelectorAll<HTMLElement>(
            `[data-page-index="${pageNum}"]`,
          );
          pages.forEach((el) => {
            el.style.opacity = "0.3";
            el.style.pointerEvents = "none";
          });
          break;
        }
        case "duplicate": {
          // Scroll to the page (visual feedback); real duplication
          // requires pdf-lib integration
          const pages = document.querySelectorAll<HTMLElement>(
            `[data-page-index="${pageNum}"]`,
          );
          pages.forEach((el) => {
            el.style.outline = "2px solid #4a9eff";
            setTimeout(() => {
              el.style.outline = "";
            }, 1000);
          });
          break;
        }
      }
    },
    [],
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 180,
        minWidth: 180,
        background: "#151515",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "10px 8px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#888",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Pages
        </span>
        <span style={{ color: "#555", fontSize: 11 }}>
          {pdf.numPages}
        </span>
      </div>

      <div style={{ padding: "8px" }}>
        {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((pageNum) => {
          const isVisible = pageNum >= visibleRange.start && pageNum <= visibleRange.end;
          const cachedDataUrl = thumbCache.current.get(pageNum) ?? null;

          return (
            <button
              key={pageNum}
              onClick={() => onPageClick(pageNum)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ pageNum, x: e.clientX, y: e.clientY });
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px",
                marginBottom: "8px",
                background: storeActivePage === pageNum ? "#2a2a2a" : "transparent",
                border:
                  storeActivePage === pageNum
                    ? "1px solid #555"
                    : "1px solid transparent",
                borderRadius: 4,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
                textAlign: "center",
                position: "relative",
              }}
            >
              {cachedDataUrl ? (
                <img
                  src={cachedDataUrl}
                  alt={`Page ${pageNum}`}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    margin: "0 auto",
                    borderRadius: 2,
                    transform: `rotate(${getRotation(pageNum)}deg)`,
                    transition: "transform 0.2s",
                  }}
                />
              ) : isVisible ? (
                <div
                  style={{
                    width: "100%",
                    height: THUMB_WIDTH * 1.4,
                    background: "#1a1a1a",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `rotate(${getRotation(pageNum)}deg)`,
                    transition: "transform 0.2s",
                  }}
                >
                  <span style={{ color: "#555", fontSize: 10 }}>Loading...</span>
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: THUMB_WIDTH * 1.4,
                    background: "#111",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#444", fontSize: 10 }}>{pageNum}</span>
                </div>
              )}
              <span
                style={{
                  color: storeActivePage === pageNum ? "#ccc" : "#666",
                  fontSize: 11,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {pageNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Page context menu */}
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
              { label: "Rotate CW", action: "rotate-cw" },
              { label: "Rotate CCW", action: "rotate-ccw" },
              { label: "Duplicate", action: "duplicate" },
              { label: "Delete", action: "delete" },
            ].map((item) => (
              <div
                key={item.action}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  color: "#ccc",
                  fontSize: 13,
                }}
                onClick={() => handleContextMenuAction(item.action, contextMenu.pageNum)}
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
