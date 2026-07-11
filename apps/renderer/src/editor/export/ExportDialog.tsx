/**
 * ExportDialog.tsx — Export Dialog Component
 *
 * Purpose: Provide a professional export dialog with options for
 * exporting selections, current page, page ranges, images (PNG/JPEG),
 * DPI selection, print-ready export, PDF optimization, and flattening.
 */

import { useState, useCallback } from "react";
import Dialog from "../../components/dialogs/Dialog";
import { useWorkspaceStore } from "../workspace/WorkspaceStore";
// ── Export Format ──────────────────────────────────────────────────
type ExportFormat = "pdf" | "png" | "jpeg";
type ExportRange = "all" | "current" | "pages";
type DPI = 72 | 96 | 150 | 200 | 300 | 600;

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  format: ExportFormat;
  range: ExportRange;
  pageRange?: string;
  dpi: DPI;
  flattenAnnotations: boolean;
  flattenForms: boolean;
  preserveMetadata: boolean;
  optimizeSize: boolean;
}

export default function ExportDialog({
  open,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [range, setRange] = useState<ExportRange>("all");
  const [pageRange, setPageRange] = useState("");
  const [dpi, setDpi] = useState<DPI>(300);
  const [flattenAnnotations, setFlattenAnnotations] = useState(true);
  const [flattenForms, setFlattenForms] = useState(true);
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [optimizeSize, setOptimizeSize] = useState(false);

  const doc = useWorkspaceStore((s) => {
    const activeId = s.activeDocumentId;
    return s.documents.find((d) => d.id === activeId);
  });

  const handleExport = useCallback(() => {
    onExport({
      format,
      range,
      pageRange: range === "pages" ? pageRange : undefined,
      dpi,
      flattenAnnotations,
      flattenForms,
      preserveMetadata,
      optimizeSize,
    });
    onClose();
  }, [
    format,
    range,
    pageRange,
    dpi,
    flattenAnnotations,
    flattenForms,
    preserveMetadata,
    optimizeSize,
    onExport,
    onClose,
  ]);

  const footer = (
    <>
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
        Cancel
      </button>
      <button
        onClick={handleExport}
        style={{
          padding: "6px 16px",
          borderRadius: 4,
          border: "none",
          background: "#3a6ea5",
          color: "#fff",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Export
      </button>
    </>
  );

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #2a2a2a",
  };

  const labelStyle: React.CSSProperties = {
    color: "#ccc",
    fontSize: 13,
  };

  const descStyle: React.CSSProperties = {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  };

  const selectStyle: React.CSSProperties = {
    width: 140,
    padding: "4px 8px",
    border: "1px solid #3a3a3a",
    borderRadius: 3,
    background: "#1e1e1e",
    color: "#ccc",
    fontSize: 12,
    outline: "none",
  };

  return (
    <Dialog
      open={open}
      title={`Export — ${doc?.name ?? "Document"}`}
      onClose={onClose}
      footer={footer}
      width={440}
    >
      {/* Format */}
      <div style={fieldStyle}>
        <div>
          <div style={labelStyle}>Format</div>
          <div style={descStyle}>Output file format</div>
        </div>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          style={selectStyle}
        >
          <option value="pdf">PDF</option>
          <option value="png">PNG (current page)</option>
          <option value="jpeg">JPEG (current page)</option>
        </select>
      </div>

      {/* Page Range */}
      {format === "pdf" && (
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Page Range</div>
            <div style={descStyle}>Pages to include</div>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as ExportRange)}
            style={selectStyle}
          >
            <option value="all">All pages</option>
            <option value="current">Current page</option>
            <option value="pages">Custom range</option>
          </select>
        </div>
      )}

      {/* Custom page range input */}
      {range === "pages" && (
        <div style={fieldStyle}>
          <div>
            <div style={labelStyle}>Pages</div>
            <div style={descStyle}>e.g. 1,3,5-10</div>
          </div>
          <input
            type="text"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="1-5, 8, 11-13"
            style={{
              width: 140,
              padding: "4px 8px",
              border: "1px solid #3a3a3a",
              borderRadius: 3,
              background: "#1e1e1e",
              color: "#ccc",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      )}

      {/* DPI */}
      <div style={fieldStyle}>
        <div>
          <div style={labelStyle}>Resolution (DPI)</div>
          <div style={descStyle}>Image resolution for export</div>
        </div>
        <select
          value={dpi}
          onChange={(e) => setDpi(parseInt(e.target.value) as DPI)}
          style={selectStyle}
        >
          <option value={72}>72 DPI (screen)</option>
          <option value={96}>96 DPI</option>
          <option value={150}>150 DPI</option>
          <option value={200}>200 DPI</option>
          <option value={300}>300 DPI (print)</option>
          <option value={600}>600 DPI (high quality)</option>
        </select>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "#2a2a2a", margin: "4px 0" }} />

      {/* Flatten annotations */}
      <label
        style={{
          ...fieldStyle,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={labelStyle}>Flatten annotations</div>
          <div style={descStyle}>Make annotations part of the PDF</div>
        </div>
        <input
          type="checkbox"
          checked={flattenAnnotations}
          onChange={(e) => setFlattenAnnotations(e.target.checked)}
          style={{ accentColor: "#4a9eff" }}
        />
      </label>

      {/* Flatten forms */}
      <label
        style={{
          ...fieldStyle,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={labelStyle}>Flatten forms</div>
          <div style={descStyle}>Make form fields non-editable</div>
        </div>
        <input
          type="checkbox"
          checked={flattenForms}
          onChange={(e) => setFlattenForms(e.target.checked)}
          style={{ accentColor: "#4a9eff" }}
        />
      </label>

      {/* Preserve metadata */}
      <label
        style={{
          ...fieldStyle,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={labelStyle}>Preserve metadata</div>
          <div style={descStyle}>Keep author, title, subject info</div>
        </div>
        <input
          type="checkbox"
          checked={preserveMetadata}
          onChange={(e) => setPreserveMetadata(e.target.checked)}
          style={{ accentColor: "#4a9eff" }}
        />
      </label>

      {/* Optimize size */}
      <label
        style={{
          ...fieldStyle,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={labelStyle}>Optimize file size</div>
          <div style={descStyle}>Reduce output file size</div>
        </div>
        <input
          type="checkbox"
          checked={optimizeSize}
          onChange={(e) => setOptimizeSize(e.target.checked)}
          style={{ accentColor: "#4a9eff" }}
        />
      </label>

      {/* Summary */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 12px",
          background: "#1a1a1a",
          borderRadius: 4,
          color: "#666",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        <div>
          Exporting: {format.toUpperCase()} —
          {range === "all"
            ? " All pages"
            : range === "current"
              ? " Current page"
              : ` Pages ${pageRange || "(none specified)"}`}
        </div>
        <div>Resolution: {dpi} DPI</div>
      </div>
    </Dialog>
  );
}
