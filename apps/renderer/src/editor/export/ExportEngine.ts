/**
 * ExportEngine.ts — Export Engine
 *
 * Purpose: Orchestrate the complete PDF export pipeline.
 * Coordinates font management, image embedding, page export,
 * metadata writing, and validation.
 *
 * Supports:
 *   - Export current document
 *   - Export selected pages
 *   - Export page ranges
 *   - Overwrite existing file
 *   - Save As (export to new filename)
 *   - Export while preserving document metadata
 *   - Cancellation support
 *   - Progress callbacks
 *   - Error reporting
 */

import { PDFDocument } from "pdf-lib";
import type { EditableObject } from "../types/objects";
import type { ExportRange, ExportSettings, ExportError } from "./types";
import { ExportErrorCategory, createExportError, DEFAULT_EXPORT_SETTINGS } from "./types";
import { FontManager } from "./FontManager";
import { ImageEmbedder } from "./ImageEmbedder";
import { OverlayFlattener } from "./OverlayFlattener";
import { PageExporter } from "./PageExporter";
import { MetadataWriter } from "./MetadataWriter";
import { Validator } from "./Validation";
import { ProgressReporter } from "./ProgressReporter";
import type { ProgressCallback } from "./ProgressReporter";

// ── Export Result ──────────────────────────────────────────────────
export interface ExportResult {
  /** The exported PDF bytes (null if export failed/cancelled). */
  bytes: Uint8Array | null;
  /** Whether the export completed successfully. */
  success: boolean;
  /** Whether the export was cancelled. */
  cancelled: boolean;
  /** Any errors that occurred during export. */
  errors: ExportError[];
  /** Any warnings from validation. */
  warnings: ExportError[];
}

// ── Export Engine ──────────────────────────────────────────────────
export class ExportEngine {
  private _validator = new Validator();
  private _metadataWriter = new MetadataWriter();
  private _reporter = new ProgressReporter();
  private _settings: ExportSettings = { ...DEFAULT_EXPORT_SETTINGS };

  /** Get the progress reporter for monitoring export progress. */
  get reporter(): ProgressReporter {
    return this._reporter;
  }

  /** Register a progress callback. */
  set onProgress(callback: ProgressCallback | null) {
    this._reporter.onProgress = callback;
  }

  /** Update export settings. */
  setSettings(settings: Partial<ExportSettings>): void {
    this._settings = { ...this._settings, ...settings };
  }

  /**
   * Export overlay objects onto an existing PDF document.
   *
   * @param pdfBytes - The original PDF file bytes (Uint8Array).
   * @param overlayObjects - All overlay objects to flatten.
   * @param range - Which pages to export.
   * @returns Export result with the new PDF bytes.
   */
  async export(
    pdfBytes: Uint8Array,
    overlayObjects: EditableObject[],
    range: ExportRange = { type: "all" },
    abortSignal?: AbortSignal,
  ): Promise<ExportResult> {
    this._reporter.reset();
    const errors: ExportError[] = [];

    try {
      // ── Stage 1: Validation ──
      this._reporter.setStage("Validating objects");
      this._reporter.setOverall(0);

      // Load the PDF document to get page count
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      const validation = this._validator.validate(overlayObjects, pageCount);
      if (!validation.valid) {
        return {
          bytes: null,
          success: false,
          cancelled: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      if (abortSignal?.aborted) {
        return {
          bytes: null,
          success: false,
          cancelled: true,
          errors: [],
          warnings: validation.warnings,
        };
      }

      // ── Stage 2: PDF already loaded (from validation step) ──

      // ── Stage 3: Initialize subsystems ──
      this._reporter.setStage("Initializing export subsystems");
      const fontManager = new FontManager(pdfDoc);
      const imageEmbedder = new ImageEmbedder(pdfDoc);
      const overlayFlattener = new OverlayFlattener(fontManager, imageEmbedder);
      const pageExporter = new PageExporter(overlayFlattener);

      if (abortSignal?.aborted) {
        return {
          bytes: null,
          success: false,
          cancelled: true,
          errors: [],
          warnings: validation.warnings,
        };
      }

      // ── Stage 4: Write metadata ──
      this._reporter.setStage("Writing metadata");
      this._reporter.setOverall(0.1);

      if (this._settings.preserveMetadata) {
        this._metadataWriter.preserveAndOverride(null, pdfDoc, {
          title: pdfDoc.getTitle() || "Exported Document",
          author: this._settings.author || pdfDoc.getAuthor() || "Docflow",
          subject: this._settings.subject,
          keywords: this._settings.keywords,
        });
      } else {
        this._metadataWriter.writeToDocument(pdfDoc, {
          title: "Exported Document",
          author: this._settings.author || "Docflow",
          subject: this._settings.subject,
          keywords: this._settings.keywords,
        });
      }

      // ── Stage 5: Flatten overlays onto pages ──
      if (this._settings.includeOverlays && overlayObjects.length > 0) {
        this._reporter.setStage("Flattening overlays");
        this._reporter.setOverall(0.2);

        const pageErrors = await pageExporter.exportPages(
          pdfDoc,
          overlayObjects,
          range,
          this._reporter,
        );
        errors.push(...pageErrors);
      }

      if (abortSignal?.aborted) {
        return {
          bytes: null,
          success: false,
          cancelled: true,
          errors,
          warnings: validation.warnings,
        };
      }

      // ── Stage 6: Save PDF ──
      this._reporter.setStage("Saving PDF");
      this._reporter.setOverall(0.9);

      const pdfBytesOut = await pdfDoc.save();
      this._reporter.setOverall(1);
      this._reporter.setStage("Complete");

      return {
        bytes: pdfBytesOut,
        success: true,
        cancelled: false,
        errors,
        warnings: validation.warnings,
      };
    } catch (err) {
      const exportError = createExportError(
        ExportErrorCategory.PdfGeneration,
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
        false,
      );
      errors.push(exportError);
      this._reporter.setError(exportError);

      return {
        bytes: null,
        success: false,
        cancelled: false,
        errors,
        warnings: [],
      };
    }
  }

  /**
   * Export and return the bytes directly.
   * Convenience wrapper for the full export pipeline.
   */
  async exportToBytes(
    pdfBytes: Uint8Array,
    overlayObjects: EditableObject[],
  ): Promise<Uint8Array | null> {
    const result = await this.export(pdfBytes, overlayObjects, { type: "all" });
    return result.success ? result.bytes : null;
  }
}
