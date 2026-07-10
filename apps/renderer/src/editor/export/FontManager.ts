/**
 * FontManager.ts — Font Manager
 *
 * Purpose: Map application font families to PDF fonts and manage
 * font embedding during export. Uses pdf-lib's standard fonts
 * as a reliable baseline, with support for custom font embedding.
 *
 * Standard PDF fonts available:
 *   - Helvetica (regular, bold, oblique, bold-oblique)
 *   - TimesRoman (regular, bold, italic, bold-italic)
 *   - Courier (regular, bold, oblique, bold-oblique)
 *   - Symbol, ZapfDingbats
 */

import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";

// ── Font Mapping ───────────────────────────────────────────────────
interface FontEntry {
  standardFont: StandardFonts;
  weight: number;
  style: "normal" | "italic" | "oblique";
}

// Map font family names to the closest standard PDF fonts
const FONT_MAP: Record<string, FontEntry[]> = {
  "helvetica": [
    { standardFont: StandardFonts.Helvetica, weight: 400, style: "normal" },
    { standardFont: StandardFonts.HelveticaBold, weight: 700, style: "normal" },
    { standardFont: StandardFonts.HelveticaOblique, weight: 400, style: "oblique" },
    { standardFont: StandardFonts.HelveticaBoldOblique, weight: 700, style: "oblique" },
  ],
  "times": [
    { standardFont: StandardFonts.TimesRoman, weight: 400, style: "normal" },
    { standardFont: StandardFonts.TimesRomanBold, weight: 700, style: "normal" },
    { standardFont: StandardFonts.TimesRomanItalic, weight: 400, style: "italic" },
    { standardFont: StandardFonts.TimesRomanBoldItalic, weight: 700, style: "italic" },
  ],
  "courier": [
    { standardFont: StandardFonts.Courier, weight: 400, style: "normal" },
    { standardFont: StandardFonts.CourierBold, weight: 700, style: "normal" },
    { standardFont: StandardFonts.CourierOblique, weight: 400, style: "oblique" },
    { standardFont: StandardFonts.CourierBoldOblique, weight: 700, style: "oblique" },
  ],
};

// ── Font Manager ───────────────────────────────────────────────────
export class FontManager {
  private _embeddedFonts = new Map<string, PDFFont>();
  private _pdfDoc: PDFDocument;

  constructor(pdfDoc: PDFDocument) {
    this._pdfDoc = pdfDoc;
  }

  /**
   * Get a PDF font for the given font family, weight, and style.
   * Falls back to Helvetica if the font cannot be resolved.
   */
  async getFont(
    fontFamily: string,
    fontWeight: number = 400,
    fontStyle: string = "normal",
  ): Promise<PDFFont> {
    const cacheKey = `${fontFamily}_${fontWeight}_${fontStyle}`;

    // Return cached font if available
    const cached = this._embeddedFonts.get(cacheKey);
    if (cached) return cached;

    // Resolve the font family to the closest standard PDF font
    const resolved = this._resolveFont(fontFamily, fontWeight, fontStyle);

    try {
      const font = await this._pdfDoc.embedStandardFont(resolved.standardFont);
      this._embeddedFonts.set(cacheKey, font);
      return font;
    } catch {
      // Fallback to Helvetica
      const fallback = await this._pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      this._embeddedFonts.set(cacheKey, fallback);
      return fallback;
    }
  }

  /**
   * Get the font size adjusted from pixels to PDF points.
   * PDF points and CSS pixels are treated as 1:1 for simplicity.
   */
  getFontSize(pixelSize: number): number {
    return pixelSize;
  }

  /**
   * Get the line height in PDF points.
   */
  getLineHeight(fontSize: number, lineHeight: number): number {
    return fontSize * lineHeight;
  }

  /**
   * Resolve a font family + weight + style to a StandardFonts entry.
   */
  private _resolveFont(
    fontFamily: string,
    fontWeight: number,
    fontStyle: string,
  ): FontEntry {
    const lowerFamily = fontFamily.toLowerCase();

    // Check direct family matches
    for (const [key, entries] of Object.entries(FONT_MAP)) {
      if (lowerFamily.includes(key)) {
        return this._bestMatch(entries, fontWeight, fontStyle);
      }
    }

    // Check individual font names
    const italic = fontStyle === "italic" || fontStyle === "oblique";
    const bold = fontWeight >= 700;

    if (lowerFamily.includes("times") || lowerFamily.includes("roman")) {
      if (bold && italic) return { standardFont: StandardFonts.TimesRomanBoldItalic, weight: 700, style: "italic" };
      if (bold) return { standardFont: StandardFonts.TimesRomanBold, weight: 700, style: "normal" };
      if (italic) return { standardFont: StandardFonts.TimesRomanItalic, weight: 400, style: "italic" };
      return { standardFont: StandardFonts.TimesRoman, weight: 400, style: "normal" };
    }

    if (lowerFamily.includes("courier")) {
      if (bold && italic) return { standardFont: StandardFonts.CourierBoldOblique, weight: 700, style: "oblique" };
      if (bold) return { standardFont: StandardFonts.CourierBold, weight: 700, style: "normal" };
      if (italic) return { standardFont: StandardFonts.CourierOblique, weight: 400, style: "oblique" };
      return { standardFont: StandardFonts.Courier, weight: 400, style: "normal" };
    }

    // Default: Helvetica
    if (bold && (italic || fontStyle === "oblique")) return { standardFont: StandardFonts.HelveticaBoldOblique, weight: 700, style: "oblique" };
    if (bold) return { standardFont: StandardFonts.HelveticaBold, weight: 700, style: "normal" };
    if (italic || fontStyle === "oblique") return { standardFont: StandardFonts.HelveticaOblique, weight: 400, style: "oblique" };
    return { standardFont: StandardFonts.Helvetica, weight: 400, style: "normal" };
  }

  private _bestMatch(
    entries: FontEntry[],
    fontWeight: number,
    fontStyle: string,
  ): FontEntry {
    // Find best match by weight proximity
    const italic = fontStyle === "italic" || fontStyle === "oblique";
    const exact = entries.find(
      (e) => e.weight === fontWeight && (italic ? e.style !== "normal" : e.style === "normal"),
    );
    if (exact) return exact;

    // Find closest weight
    let best = entries[0];
    let bestDiff = Math.abs(entries[0].weight - fontWeight);
    for (const entry of entries) {
      const diff = Math.abs(entry.weight - fontWeight);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = entry;
      }
    }
    return best;
  }
}
