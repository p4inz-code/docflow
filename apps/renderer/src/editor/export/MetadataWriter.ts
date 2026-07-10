/**
 * MetadataWriter.ts — PDF Metadata Writer
 *
 * Purpose: Preserve and write PDF document metadata during export.
 * Reads metadata from the original document (if available) and
 * applies it to the exported document, overriding with user settings.
 */

import { type PDFDocument } from "pdf-lib";

// ── Document Metadata ──────────────────────────────────────────────
export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  producer: string;
  creator: string;
}

// ── Metadata Writer ────────────────────────────────────────────────
export class MetadataWriter {
  /**
   * Read metadata from an existing PDF document.
   */
  readFromDocument(pdfDoc: PDFDocument): DocumentMetadata {
    return {
      title: pdfDoc.getTitle() ?? "",
      author: pdfDoc.getAuthor() ?? "",
      subject: pdfDoc.getSubject() ?? "",
      keywords: pdfDoc.getKeywords() ?? "",
      producer: pdfDoc.getProducer() ?? "Docflow",
      creator: pdfDoc.getCreator() ?? "Docflow",
    };
  }

  /**
   * Write metadata to a PDF document.
   */
  writeToDocument(
    pdfDoc: PDFDocument,
    metadata: Partial<DocumentMetadata>,
  ): void {
    if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
    if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords);

    // Always set producer and creator
    pdfDoc.setProducer(metadata.producer ?? "Docflow");
    pdfDoc.setCreator(metadata.creator ?? "Docflow");

    // Set modification date
    pdfDoc.setModificationDate(new Date());

    // Set creation date if not already set (or if we want to preserve it)
    // pdf-lib doesn't expose getCreationDate/setCreationDate directly
    // in a straightforward way, so we leave the original creation date intact
  }

  /**
   * Preserve metadata from a source document and override with provided values.
   */
  preserveAndOverride(
    sourceDoc: PDFDocument | null,
    targetDoc: PDFDocument,
    overrides: Partial<DocumentMetadata>,
  ): void {
    if (sourceDoc) {
      const existing = this.readFromDocument(sourceDoc);
      this.writeToDocument(targetDoc, {
        ...existing,
        ...overrides,
      });
    } else {
      this.writeToDocument(targetDoc, overrides);
    }
  }
}
