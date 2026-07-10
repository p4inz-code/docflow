/**
 * SmartGuides.ts — Smart Alignment Guides
 *
 * Purpose: Provide visual alignment guides that appear when objects
 * are dragged near alignment points (page center, margins, other
 * object edges).
 *
 * Features:
 *   - Page center guides (horizontal + vertical)
 *   - Object edge alignment (left, right, top, bottom)
 *   - Object center alignment
 *   - Equal spacing (placeholder)
 *   - Guide rendering as thin colored lines
 *   - Guide auto-disappear when not near alignment
 *
 * Future: Equal spacing guides for 3+ objects, margin guides.
 */

import type { Point, Rect } from "../types/editor";
import type { GuideLine, GuideState } from "../types/editing";
import { SNAP_DISTANCE } from "../core/constants";

// ── Smart Guides System ────────────────────────────────────────────
export class SmartGuides {
  private _currentGuides: GuideLine[] = [];
  private _snapOffset: Point = { x: 0, y: 0 };

  /**
   * Compute alignment guides for a moving/resizing object.
   *
   * @param objectRect - Current bounding rect of the object being transformed.
   * @param otherRects - Bounding rects of all other objects on the page.
   * @param pageWidth - Width of the PDF page.
   * @param pageHeight - Height of the PDF page.
   * @returns Guide state with lines and snap offset.
   */
  computeGuides(
    objectRect: Rect,
    otherRects: Rect[],
    pageWidth: number,
    pageHeight: number,
  ): GuideState {
    this._currentGuides = [];
    this._snapOffset = { x: 0, y: 0 };

    const objCenter = {
      x: objectRect.x + objectRect.width / 2,
      y: objectRect.y + objectRect.height / 2,
    };

    // ── Page center guides ──
    const pageCenterX = pageWidth / 2;
    const pageCenterY = pageHeight / 2;

    // Vertical page center guide
    if (Math.abs(objCenter.x - pageCenterX) < SNAP_DISTANCE) {
      this._snapOffset.x = pageCenterX - objCenter.x;
      this._currentGuides.push({
        orientation: "vertical",
        position: pageCenterX,
        start: 0,
        end: pageHeight,
      });
    }

    // Horizontal page center guide
    if (Math.abs(objCenter.y - pageCenterY) < SNAP_DISTANCE) {
      this._snapOffset.y = pageCenterY - objCenter.y;
      this._currentGuides.push({
        orientation: "horizontal",
        position: pageCenterY,
        start: 0,
        end: pageWidth,
      });
    }

    // ── Page edge guides ──
    // Left edge
    if (Math.abs(objectRect.x) < SNAP_DISTANCE) {
      this._snapOffset.x = -objectRect.x;
      this._currentGuides.push({
        orientation: "vertical",
        position: 0,
        start: 0,
        end: pageHeight,
      });
    }

    // Right edge
    if (Math.abs(objectRect.x + objectRect.width - pageWidth) < SNAP_DISTANCE) {
      this._snapOffset.x = pageWidth - (objectRect.x + objectRect.width);
      this._currentGuides.push({
        orientation: "vertical",
        position: pageWidth,
        start: 0,
        end: pageHeight,
      });
    }

    // Top edge
    if (Math.abs(objectRect.y) < SNAP_DISTANCE) {
      this._snapOffset.y = -objectRect.y;
      this._currentGuides.push({
        orientation: "horizontal",
        position: 0,
        start: 0,
        end: pageWidth,
      });
    }

    // Bottom edge
    if (Math.abs(objectRect.y + objectRect.height - pageHeight) < SNAP_DISTANCE) {
      this._snapOffset.y = pageHeight - (objectRect.y + objectRect.height);
      this._currentGuides.push({
        orientation: "horizontal",
        position: pageHeight,
        start: 0,
        end: pageWidth,
      });
    }

    // ── Object-to-object alignment ──
    for (const other of otherRects) {
      const otherCenter = {
        x: other.x + other.width / 2,
        y: other.y + other.height / 2,
      };

      // Vertical alignment (object center to other center)
      if (Math.abs(objCenter.x - otherCenter.x) < SNAP_DISTANCE && this._currentGuides.length < 6) {
        this._snapOffset.x = otherCenter.x - objCenter.x;
        this._currentGuides.push({
          orientation: "vertical",
          position: otherCenter.x,
          start: Math.min(objectRect.y, other.y),
          end: Math.max(objectRect.y + objectRect.height, other.y + other.height),
        });
      }

      // Horizontal alignment (object center to other center)
      if (Math.abs(objCenter.y - otherCenter.y) < SNAP_DISTANCE && this._currentGuides.length < 6) {
        this._snapOffset.y = otherCenter.y - objCenter.y;
        this._currentGuides.push({
          orientation: "horizontal",
          position: otherCenter.y,
          start: Math.min(objectRect.x, other.x),
          end: Math.max(objectRect.x + objectRect.width, other.x + other.width),
        });
      }

      // Edge alignments
      if (Math.abs(objectRect.x - other.x) < SNAP_DISTANCE && this._currentGuides.length < 6) {
        this._snapOffset.x = other.x - objectRect.x;
        this._currentGuides.push({
          orientation: "vertical",
          position: other.x,
          start: Math.min(objectRect.y, other.y),
          end: Math.max(objectRect.y + objectRect.height, other.y + other.height),
        });
      }

      if (Math.abs(objectRect.x + objectRect.width - (other.x + other.width)) < SNAP_DISTANCE && this._currentGuides.length < 6) {
        this._snapOffset.x = (other.x + other.width) - (objectRect.x + objectRect.width);
        this._currentGuides.push({
          orientation: "vertical",
          position: other.x + other.width,
          start: Math.min(objectRect.y, other.y),
          end: Math.max(objectRect.y + objectRect.height, other.y + other.height),
        });
      }
    }

    return {
      lines: this._currentGuides,
      snapping: this._snapOffset.x !== 0 || this._snapOffset.y !== 0,
      snapOffset: { ...this._snapOffset },
    };
  }

  /** Render guide lines into a container element. */
  renderGuides(lines: GuideLine[], container: HTMLElement, pageWidth: number, pageHeight: number): void {
    // Clear existing guides
    container.querySelectorAll(".smart-guide-line").forEach((el) => el.remove());

    for (const line of lines) {
      const guideEl = document.createElement("div");
      guideEl.className = "smart-guide-line";
      guideEl.style.position = "absolute";
      guideEl.style.pointerEvents = "none";
      guideEl.style.zIndex = "1000";

      if (line.orientation === "vertical") {
        guideEl.style.left = `${line.position}px`;
        guideEl.style.top = `${Math.max(0, line.start)}px`;
        guideEl.style.width = "1px";
        guideEl.style.height = `${Math.min(pageHeight, line.end) - Math.max(0, line.start)}px`;
        guideEl.style.borderLeft = "1px dashed #4a9eff";
      } else {
        guideEl.style.top = `${line.position}px`;
        guideEl.style.left = `${Math.max(0, line.start)}px`;
        guideEl.style.height = "1px";
        guideEl.style.width = `${Math.min(pageWidth, line.end) - Math.max(0, line.start)}px`;
        guideEl.style.borderTop = "1px dashed #4a9eff";
      }

      container.appendChild(guideEl);
    }
  }

  /** Clear all rendered guides. */
  clearGuides(container: HTMLElement): void {
    container.querySelectorAll(".smart-guide-line").forEach((el) => el.remove());
    this._currentGuides = [];
    this._snapOffset = { x: 0, y: 0 };
  }

  /** Get current guide lines. */
  get guides(): GuideLine[] {
    return this._currentGuides;
  }

  /** Get current snap offset. */
  get snapOffset(): Point {
    return { ...this._snapOffset };
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const smartGuides = new SmartGuides();
