import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PDFThumbnailsProps {
  pdf: PDFDocumentProxy;
  activePage: number;
  onPageClick: (pageNumber: number) => void;
}

export default function PDFThumbnails({ pdf, activePage, onPageClick }: PDFThumbnailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const totalPages = pdf.numPages;
        const sidebarWidth = containerRef.current?.clientWidth ?? 160;
        const thumbWidth = Math.max(100, sidebarWidth - 24);

        for (let i = 1; i <= totalPages; i++) {
          if (cancelled) return;

          const canvas = canvasRefs.current.get(i);
          if (!canvas) continue;

          const page = await pdf.getPage(i);
          if (cancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = thumbWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to generate thumbnails:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Page thumbnails"
      style={{
        width: 180,
        minWidth: 180,
        background: "#151515",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div style={{ padding: "10px 8px", borderBottom: "1px solid #2a2a2a" }}>
        <span style={{ color: "#888", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Pages
        </span>
      </div>

      <div style={{ padding: "8px" }}>
        {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            role="tab"
            aria-selected={activePage === pageNum}
            aria-label={`Page ${pageNum}`}
            onClick={() => onPageClick(pageNum)}
            style={{
              display: "block",
              width: "100%",
              padding: "6px",
              marginBottom: "8px",
              background: activePage === pageNum ? "#2a2a2a" : "transparent",
              border: activePage === pageNum ? "1px solid #555" : "1px solid transparent",
              borderRadius: 4,
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
              textAlign: "center",
            }}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageNum, el);
                else canvasRefs.current.delete(pageNum);
              }}
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
                margin: "0 auto",
              }}
            />
            <span
              style={{
                color: activePage === pageNum ? "#ccc" : "#666",
                fontSize: 11,
                marginTop: 4,
                display: "block",
              }}
            >
              {pageNum}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
