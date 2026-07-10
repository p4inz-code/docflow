import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Use the worker bundled with pdfjs-dist (version-matched)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function loadPDF(fileUrl: string) {
  const pdf = await pdfjsLib.getDocument(fileUrl).promise;
  return pdf;
}
