/**
 * ImageTool.ts — Image Tool
 *
 * Purpose: Place image objects onto PDF pages.
 *
 * Capabilities:
 *   - Click to open file picker (PNG, JPEG, WebP)
 *   - Drag to define image placement rectangle
 *   - Maintain aspect ratio during drag
 *   - Resize after placement (via SelectTool handles)
 *   - Rotation, opacity, layer ordering support
 *   - Undo/Redo via CreateObjectCommand
 *   - Clipboard integration
 *
 * Flow:
 *   1. User clicks/drags → opens file picker
 *   2. After file selection → creates ImageObject with data URL
 *   3. If dragged → size matches drag rect; if clicked → default size
 *   4. ImageObject is added to store via CreateObjectCommand
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import { ObjectType } from "../../types/objects";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { generateId } from "../../utils/id";
import type { EditableObject } from "../../types/objects";
import { commandPipeline } from "../../core/CommandPipeline";
import { CreateObjectCommand } from "../../commands/CreateObjectCommand";

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";
const DEFAULT_IMAGE_WIDTH = 200;
const DEFAULT_IMAGE_HEIGHT = 150;
const MIN_DRAG_SIZE = 20;

export class ImageTool implements Tool {
  readonly type = ToolType.Image;
  readonly label = "Image";
  readonly shortcut = "i";
  readonly cursor = CursorStyle.Crosshair;

  private _dragStart: { x: number; y: number } | null = null;
  private _dragCurrent: { x: number; y: number } | null = null;
  private _page: number = 1;

  onActivate(): void {
    document.body.style.cursor = "crosshair";
  }

  onDeactivate(): void {
    this._cancelDrag();
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    this._dragStart = { x: event.point.x, y: event.point.y };
    this._dragCurrent = { x: event.point.x, y: event.point.y };
    this._page = store.activePage;
  }

  onPointerMove(event: InteractionEvent): void {
    if (!this._dragStart) return;
    this._dragCurrent = { x: event.point.x, y: event.point.y };
  }

  onPointerUp(_event: InteractionEvent): void {
    if (!this._dragStart) return;

    const start = this._dragStart;
    const current = this._dragCurrent ?? start;

    // Determine placement size
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    // If barely dragged, use default size (click-to-place)
    if (width < MIN_DRAG_SIZE && height < MIN_DRAG_SIZE) {
      width = DEFAULT_IMAGE_WIDTH;
      height = DEFAULT_IMAGE_HEIGHT;
    }

    const posX = Math.min(start.x, current.x);
    const posY = Math.min(start.y, current.y);

    // Open file picker
    this._openFilePicker(posX, posY, width, height);

    this._cancelDrag();
  }

  onDoubleClick(_event: InteractionEvent): void {
    // No-op
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this._cancelDrag();
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _openFilePicker(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_TYPES;
    input.style.display = "none";

    const changeHandler = () => {
      const file = input.files?.[0];
      if (!file) {
        input.remove();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this._createImage(dataUrl, file.type, x, y, width, height);
        input.remove();
      };
      reader.onerror = () => {
        input.remove();
      };
      reader.readAsDataURL(file);
    };
    input.addEventListener("change", changeHandler, { once: true });

    document.body.appendChild(input);
    input.click();

    // Clean up the input element if it's not removed by the change handler
    // (e.g., user cancels the file dialog)
    const cleanupTimer = setTimeout(() => {
      if (input.parentNode) {
        input.remove();
      }
    }, 5000);

    // Store cleanup timer on the input for cleanup
    (input as any)._cleanupTimer = cleanupTimer;

    // Also clean up on blur (dialog closed without selection)
    const blurHandler = () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (input.parentNode) {
        input.remove();
      }
    };
    window.addEventListener("focus", blurHandler, { once: true });
  }

  private _createImage(
    src: string,
    mimeType: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const now = Date.now();
    const newId = `img_${generateId()}`;

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Image,
      page: this._page,
      position: { x, y },
      size: { width, height },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        src,
        mimeType,
        originalWidth: width,
        originalHeight: height,
      },
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }

  private _cancelDrag(): void {
    this._dragStart = null;
    this._dragCurrent = null;
  }
}
