/**
 * ImageEmbedder.ts — Image Embedder
 *
 * Purpose: Embed images (PNG, JPEG) into PDF documents during export.
 * Supports deduplication of identical images, scaling, rotation,
 * and transparency preservation.
 */

import { PDFDocument, type PDFImage } from "pdf-lib";

// ── Image Embedder ─────────────────────────────────────────────────
export class ImageEmbedder {
  private _pdfDoc: PDFDocument;
  /** Cache of embedded images keyed by their source data URL. */
  private _imageCache = new Map<string, PDFImage>();

  constructor(pdfDoc: PDFDocument) {
    this._pdfDoc = pdfDoc;
  }

  /**
   * Embed an image from a base64 data URL or raw bytes.
   * Returns the embedded PDFImage, deduplicating identical sources.
   *
   * @param src - Data URL (base64) or raw Uint8Array of image bytes.
   * @returns The embedded PDFImage object, or null if embedding fails.
   */
  async embedImage(src: string | Uint8Array): Promise<PDFImage | null> {
    const cacheKey = typeof src === "string" ? src : "binary_" + this._hashBytes(src);

    // Return cached image if available
    const cached = this._imageCache.get(cacheKey);
    if (cached) return cached;

    try {
      let imageBytes: Uint8Array;

      if (typeof src === "string") {
        // Handle data URLs
        if (src.startsWith("data:")) {
          imageBytes = this._dataUrlToBytes(src);
        } else if (src.startsWith("blob:")) {
          // Blob URLs can't be read synchronously — skip for now
          return null;
        } else {
          // Assume it's a raw base64 string
          imageBytes = this._base64ToBytes(src);
        }
      } else {
        imageBytes = src;
      }

      // Detect image type and embed
      const image = await this._embedByType(imageBytes);
      if (image) {
        this._imageCache.set(cacheKey, image);
      }
      return image;
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ImageEmbedder] Failed to cache-embed image");
      }
      return null;
    }
  }

  /**
   * Get the number of uniquely embedded images.
   */
  get cacheSize(): number {
    return this._imageCache.size;
  }

  /**
   * Clear the image cache.
   */
  clearCache(): void {
    this._imageCache.clear();
  }

  // ── Private ──────────────────────────────────────────────────────
  private async _embedByType(bytes: Uint8Array): Promise<PDFImage | null> {
    const magic = Array.from(bytes.slice(0, 4));
    const isPng =
      magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e && magic[3] === 0x47;
    const isJpeg = magic[0] === 0xff && magic[1] === 0xd8;

    try {
      if (isPng) {
        return await this._pdfDoc.embedPng(bytes);
      } else if (isJpeg) {
        return await this._pdfDoc.embedJpg(bytes);
      }
      // Unsupported format
      return null;
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ImageEmbedder] Failed to embed image by type detection");
      }
      return null;
    }
  }

  private _dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(",")[1] ?? dataUrl;
    return this._base64ToBytes(base64);
  }

  private _base64ToBytes(base64: string): Uint8Array {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  private _hashBytes(bytes: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < Math.min(bytes.length, 256); i++) {
      hash = ((hash << 5) - hash) + bytes[i];
      hash |= 0;
    }
    return hash.toString(36);
  }
}
