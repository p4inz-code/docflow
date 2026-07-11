import { useState, useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPDF } from "../pdfLoader";

export function usePDF() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up blob URL on unmount or pdf change
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  async function openPDF(file: File) {
    try {
      // Revoke previous blob URL before creating a new one
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
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
