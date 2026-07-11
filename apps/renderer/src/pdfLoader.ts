/**
 * pdfLoader.ts — PDF.js Worker & Document Loader
 *
 * Purpose: Initialize the pdf.js worker and provide a clean
 * API for loading PDF documents. Moved from packages/core to
 * the renderer so Vite can resolve pdfjs-dist correctly.
 */

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Use the worker bundled with pdfjs-dist (version-matched)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function loadPDF(fileUrl: string) {
  const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise;
  return pdf;
}
