/**
 * PageExporter.ts — Page Export Pipeline
 *
 * Purpose: Iterate pages, gather overlay objects, flatten them
 * onto PDF pages, and validate page output.
 *
 * Supports exporting single page, multiple pages, all pages,
 * or a range of pages.
 */

import { type PDFDocument, type PDFPage } from "pdf-lib";
import type { EditableObject } from "../types/objects";
import type { ExportRange, ExportError } from "./types";
import { OverlayFlattener } from "./OverlayFlattener";
import { ProgressReporter } from "./ProgressReporter";
// ── Page Exporter ──────────────────────────────────────────────────
export class PageExporter {
  private _overlayFlattener: OverlayFlattener;

  constructor(overlayFlattener: OverlayFlattener) {
    this._overlayFlattener = overlayFlattener;
  }

  /**
   * Export overlay objects onto PDF pages according to the export range.
   *
   * @param pdfDoc - The PDFDocument being exported.
   * @param objects - All overlay objects.
   * @param range - Which pages to export.
   * @param reporter - Progress reporter.
   * @returns Array of export errors encountered.
   */
  async exportPages(
    pdfDoc: PDFDocument,
    objects: EditableObject[],
    range: ExportRange,
    reporter: ProgressReporter,
  ): Promise<ExportError[]> {
    const errors: ExportError[] = [];
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // Determine which pages to process
    const pageIndices = this._resolveRange(range, totalPages);
    reporter.setTotalPages(pageIndices.length);

    for (let i = 0; i < pageIndices.length; i++) {
      if (reporter.isCancelled) break;

      const pageIndex = pageIndices[i];
      reporter.setStage(`Exporting page ${pageIndex}`);
      reporter.setCurrentPage(pageIndex);
      reporter.setPageProgress(0);

      const page = pages[pageIndex - 1]; // pages array is 0-indexed
      const { width, height } = page.getSize();

      // Flatten overlays onto this page
      const pageErrors = await this._overlayFlattener.flattenOverlays(
        page,
        objects,
        pageIndex,
        width,
        height,
      );
      errors.push(...pageErrors);

      reporter.setPageProgress(1);
      reporter.setOverall((i + 1) / pageIndices.length);
    }

    return errors;
  }

  /**
   * Resolve an ExportRange to an array of 1-based page indices.
   */
  private _resolveRange(range: ExportRange, totalPages: number): number[] {
    switch (range.type) {
      case "all":
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      case "current":
        return [1]; // Default to first page for "current"
      case "pages":
        return range.pages.filter((p) => p >= 1 && p <= totalPages);
      case "range":
        return Array.from(
          { length: Math.min(range.end, totalPages) - range.start + 1 },
          (_, i) => range.start + i,
        ).filter((p) => p >= 1 && p <= totalPages);
    }
  }
}
