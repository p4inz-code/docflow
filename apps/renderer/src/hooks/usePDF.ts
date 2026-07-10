import { useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPDF } from "../../../../packages/core/pdf-engine/loader";

export function usePDF() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  async function openPDF(file: File) {
    try {
      const url = URL.createObjectURL(file);
      const doc = await loadPDF(url);
      setPdf(doc);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load PDF:", err);
      }
    }
  }

  return { pdf, openPDF };
}
