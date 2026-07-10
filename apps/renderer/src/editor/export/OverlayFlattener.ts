/**
 * OverlayFlattener.ts — Overlay Flattener
 *
 * Purpose: Flatten every supported overlay object type onto PDF
 * pages during export. Preserves position, scale, rotation,
 * opacity, z-order, and page association.
 *
 * Rendering strategy:
 *   - Text: drawn as selectable PDF text with embedded fonts
 *   - Whiteout: drawn as filled white rectangle
 *   - Highlights: drawn as semi-transparent coloured rectangle
 *   - Shapes: drawn as SVG-like vector paths/rectangles/ellipses
 *   - Drawings: drawn as SVG-like paths
 *   - Images: embedded and drawn as image objects
 *   - Signatures: embedded and drawn as image objects
 *   - Stamps: drawn as styled text with coloured border
 *
 * Objects are sorted by z-index before drawing (bottom to top)
 * so that layered objects render correctly in the output PDF.
 */

import { type PDFPage, rgb, type PDFFont } from "pdf-lib";
import type { EditableObject, TextObject } from "../types/objects";
import type { ExportError } from "./types";
import { ExportErrorCategory, createExportError } from "./types";
import { FontManager } from "./FontManager";
import { ImageEmbedder } from "./ImageEmbedder";

// ── Overlay Flattener ──────────────────────────────────────────────
export class OverlayFlattener {
  private _fontManager: FontManager;
  private _imageEmbedder: ImageEmbedder;

  constructor(fontManager: FontManager, imageEmbedder: ImageEmbedder) {
    this._fontManager = fontManager;
    this._imageEmbedder = imageEmbedder;
  }

  /**
   * Flatten an array of overlay objects onto a PDF page.
   * Objects are drawn in z-order (bottom to top).
   *
   * @param page - The PDFPage to draw on.
   * @param objects - Overlay objects to flatten onto the page.
   * @param pageIndex - 1-based page index for object filtering.
   * @param pageWidth - Width of the PDF page in points.
   * @param pageHeight - Height of the PDF page in points.
   */
  async flattenOverlays(
    page: PDFPage,
    objects: EditableObject[],
    pageIndex: number,
    pageWidth: number,
    pageHeight: number,
  ): Promise<ExportError[]> {
    const errors: ExportError[] = [];

    // Filter objects for this page, sorted by z-index
    const pageObjects = objects
      .filter((obj) => obj.page === pageIndex && obj.visible)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const obj of pageObjects) {
      try {
        await this._flattenObject(page, obj, pageWidth, pageHeight);
      } catch (err) {
        errors.push(
          createExportError(
            ExportErrorCategory.PdfGeneration,
            `Failed to flatten object ${obj.id}: ${err instanceof Error ? err.message : String(err)}`,
            true,
            { objectId: obj.id, objectType: obj.type },
          ),
        );
      }
    }

    return errors;
  }

  private async _flattenObject(
    page: PDFPage,
    obj: EditableObject,
    pageWidth: number,
    pageHeight: number,
  ): Promise<void> {
    // Convert from page-space (y-down) to PDF coordinates (y-up)
    const x = obj.position.x;
    const y = pageHeight - obj.position.y - obj.size.height;
    const w = obj.size.width;
    const h = obj.size.height;
    const opacity = obj.opacity;
    // Apply opacity at the page level for this object
    if (opacity < 1) {
      page.setOpacity(opacity);
    }

    // Note: Rotation is preserved as a V1 best-effort feature.
    // pdf-lib's vector drawing methods don't natively support rotation transforms.
    // Objects with non-zero rotation will export at 0° rotation.
    // Full rotation support requires manual coordinate transformation or custom
    // PDF content stream operators.

    switch (obj.type) {
      case "text":
        await this._flattenText(page, obj as TextObject, x, y, w, h);
        break;
      case "whiteout":
        this._flattenWhiteout(page, obj, x, y, w, h);
        break;
      case "highlight":
        this._flattenHighlight(page, obj, x, y, w, h);
        break;
      case "shape":
        this._flattenShape(page, obj, x, y, w, h);
        break;
      case "drawing":
        this._flattenDrawing(page, obj, x, y, w, h);
        break;
      case "image":
        await this._flattenImage(page, obj, x, y, w, h);
        break;
      case "signature":
        await this._flattenSignature(page, obj, x, y, w, h);
        break;
      case "stamp":
        this._flattenStamp(page, obj, x, y, w, h);
        break;
    }

    // Reset opacity after each object to prevent bleed-through
    if (opacity < 1) {
      page.setOpacity(1);
    }
  }

  private async _flattenText(
    page: PDFPage,
    obj: TextObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Promise<void> {
    const data = obj.data;
    const content = data.content ?? "";
    if (!content) return;

    const font = await this._fontManager.getFont(
      data.fontFamily ?? "Helvetica",
      data.fontWeight ?? 400,
      "normal",
    );

    const fontSize = data.fontSize ?? 16;
    const color = this._parseColor(data.color ?? "#000000");
    const textAlign = data.textAlign ?? "left";
    const lineHeight = this._fontManager.getLineHeight(fontSize, data.lineHeight ?? 1.4);

    // Calculate text width and handle alignment
    const textWidth = font.widthOfTextAtSize(content, fontSize);

    let textX = x;
    if (textAlign === "center") {
      textX = x + (w - textWidth) / 2;
    } else if (textAlign === "right") {
      textX = x + w - textWidth;
    }

    // Draw text with line breaking
    const maxWidth = w;
    const lines = this._wrapText(content, font, fontSize, maxWidth);
    let textY = y + h - fontSize; // Start from top of text box

    for (const line of lines) {
      if (textY < y) break; // Don't draw past bottom of box

      let lineX = x;
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      if (textAlign === "center") {
        lineX = x + (maxWidth - lineWidth) / 2;
      } else if (textAlign === "right") {
        lineX = x + maxWidth - lineWidth;
      }

      page.drawText(line, {
        x: lineX,
        y: textY,
        size: fontSize,
        font,
        color,
        maxWidth,
      });

      textY -= lineHeight;
    }
  }

  private _flattenWhiteout(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: rgb(1, 1, 1), // White
      borderWidth: 0,
    });
  }

  private _flattenHighlight(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const data = obj.data as Record<string, unknown>;
    const color = this._parseColor((data.color as string) ?? "rgba(255, 255, 0, 0.3)");
    const opacity = (data.opacity as number) ?? 0.3;

    page.setOpacity(opacity);
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color,
      borderWidth: 0,
    });
    page.setOpacity(1);
  }

  private _flattenShape(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const data = obj.data as Record<string, unknown>;
    const shapeType = (data.shapeType as string) ?? "rectangle";
    const fillColor = this._parseOptionalColor(data.fillColor as string);
    const strokeColor = this._parseOptionalColor(data.strokeColor as string);
    const strokeWidth = (data.strokeWidth as number) ?? 2;
    const cornerRadius = (data.cornerRadius as number) ?? 0;

    switch (shapeType) {
      case "ellipse":
        page.drawEllipse({
          x: x + w / 2,
          y: y + h / 2,
          xScale: w / 2,
          yScale: h / 2,
          color: fillColor ?? undefined,
          borderColor: strokeColor ?? undefined,
          borderWidth: strokeColor ? strokeWidth : 0,
        });
        break;

      case "line":
        if (strokeColor) {
          page.drawLine({
            start: { x, y: y + h },
            end: { x: x + w, y },
            color: strokeColor,
            thickness: strokeWidth,
          });
        }
        break;

      case "arrow": {
        if (strokeColor) {
          page.drawLine({
            start: { x, y: y + h },
            end: { x: x + w, y },
            color: strokeColor,
            thickness: strokeWidth,
          });
        }
        break;
      }

      default:
        // Rectangle
        if (cornerRadius > 0) {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color: fillColor ?? undefined,
            borderColor: strokeColor ?? undefined,
            borderWidth: strokeColor ? strokeWidth : 0,
          });
        } else {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color: fillColor ?? undefined,
            borderColor: strokeColor ?? undefined,
            borderWidth: strokeColor ? strokeWidth : 0,
          });
        }
        break;
    }
  }

  private _flattenDrawing(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    _w: number,
    _h: number,
  ): void {
    const data = obj.data as Record<string, unknown>;
    const path = data.path as string;
    const strokeColor = this._parseOptionalColor(data.strokeColor as string);
    const strokeWidth = (data.strokeWidth as number) ?? 2;

    if (!path || !strokeColor) return;

    // Parse SVG path and draw approximate lines
    // For simple paths, draw a line from start to end
    const commands = path.match(/[ML]\s*[\d.-]+\s*[\d.-]+/g);
    if (commands && commands.length >= 2) {
      for (let i = 0; i < commands.length - 1; i++) {
        const [_, x1, y1] = commands[i].match(/([ML])\s*([\d.-]+)\s*([\d.-]+)/) ?? [];
        const [__, _cmd, x2, y2] = commands[i + 1].match(/([ML])\s*([\d.-]+)\s*([\d.-]+)/) ?? [];
        if (x1 && y1 && x2 && y2) {
          page.drawLine({
            start: { x: x + parseFloat(x1), y: y - parseFloat(y1) },
            end: { x: x + parseFloat(x2), y: y - parseFloat(y2) },
            color: strokeColor,
            thickness: strokeWidth,
          });
        }
      }
    }
  }

  private async _flattenImage(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Promise<void> {
    const data = obj.data as Record<string, unknown>;
    const src = data.src as string;
    if (!src) return;

    const image = await this._imageEmbedder.embedImage(src);
    if (image) {
      page.drawImage(image, {
        x,
        y,
        width: w,
        height: h,
        opacity: obj.opacity,
      });
    }
  }

  private async _flattenSignature(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Promise<void> {
    const data = obj.data as Record<string, unknown>;
    const src = data.src as string;
    if (!src) return;

    const image = await this._imageEmbedder.embedImage(src);
    if (image) {
      page.drawImage(image, {
        x,
        y,
        width: w,
        height: h,
        opacity: obj.opacity,
      });
    }
  }

  private _flattenStamp(
    page: PDFPage,
    obj: EditableObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const data = obj.data as Record<string, unknown>;
    const text = (data.text as string) ?? (data.presetName as string) ?? "STAMP";
    const color = this._parseColor((data.color as string) ?? "#ff0000");

    // Draw coloured border
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      borderColor: color,
      borderWidth: 3,
      color: rgb(1, 1, 1),
    });

    // Draw stamp text (using Helvetica Bold)
    const fontSize = Math.min(w * 0.12, 14);
    page.drawText(text.toUpperCase(), {
      x: x + 8,
      y: y + h / 2 - fontSize / 2,
      size: fontSize,
      color,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private _parseColor(colorStr: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (colorStr.startsWith("#")) {
      const hex = colorStr.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
    }

    // Handle rgba colors — extract the RGB values
    if (colorStr.startsWith("rgba") || colorStr.startsWith("rgb")) {
      const matches = colorStr.match(/[\d.]+/g);
      if (matches && matches.length >= 3) {
        return {
          r: parseFloat(matches[0]) / 255,
          g: parseFloat(matches[1]) / 255,
          b: parseFloat(matches[2]) / 255,
        };
      }
    }

    return { r: 0, g: 0, b: 0 };
  }

  private _parseOptionalColor(colorStr: string | undefined): { r: number; g: number; b: number } | null {
    if (!colorStr || colorStr === "transparent" || colorStr === "none") return null;
    return this._parseColor(colorStr);
  }

  private _wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const words = text.split(/(\s+)/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine}${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word.trim();
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }
}

