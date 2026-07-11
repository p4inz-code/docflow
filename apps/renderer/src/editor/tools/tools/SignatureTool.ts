/**
 * SignatureTool.ts — Signature Tool
 *
 * Purpose: Create signature objects on the document by importing
 * signature images. Supports transparent PNGs for clean overlays.
 *
 * Capabilities:
 *   - Import signature image via file picker (PNG preferred)
 *   - Click to place at pointer position
 *   - Resize after placement (via SelectTool handles)
 *   - Rotate, duplicate, undo support
 *   - Maintain aspect ratio
 *   - Export flattening
 *   - Save with document
 *   - Clipboard support
 *
 * Architecture supports handwritten signature capture later:
 *   - data.isDrawn field indicates drawn vs imported
 *   - Future: add on-canvas drawing pad for signature capture
 *
 * Flow:
 *   1. User clicks on page → opens file picker
 *   2. After selection → SignatureObject created with data URL
 *   3. Signature renders as img element with object-fit contain
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

const ACCEPTED_TYPES = "image/png,image/jpeg";
const DEFAULT_SIG_WIDTH = 150;
const DEFAULT_SIG_HEIGHT = 60;

export class SignatureTool implements Tool {
  readonly type = ToolType.Signature;
  readonly label = "Signature";
  readonly shortcut = "s";
  readonly cursor = CursorStyle.Crosshair;

  private _page: number = 1;

  onActivate(): void {
    document.body.style.cursor = "crosshair";
  }

  onDeactivate(): void {
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();
    this._page = store.activePage;

    // Open file picker at click position
    this._openFilePicker(event.point.x, event.point.y);
  }

  onPointerMove(_event: InteractionEvent): void {
    // No-op: signature placement is click-only
  }

  onPointerUp(_event: InteractionEvent): void {
    // No-op
  }

  onDoubleClick(_event: InteractionEvent): void {
    // No-op
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      // Cancel pending operation
    }
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _openFilePicker(x: number, y: number): void {
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
        this._createSignature(dataUrl, x, y);
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

    // Clean up the input element if dialog is cancelled
    const cleanupTimer = setTimeout(() => {
      if (input.parentNode) {
        input.remove();
      }
    }, 5000);

    // Clean up on window focus regain (dialog closed without selection)
    window.addEventListener("focus", () => {
      clearTimeout(cleanupTimer);
      if (input.parentNode) {
        input.remove();
      }
    }, { once: true });
  }

  private _createSignature(
    src: string,
    x: number,
    y: number,
  ): void {
    const now = Date.now();
    const newId = `sig_${generateId()}`;

    const newObject: EditableObject = {
      id: newId,
      type: ObjectType.Signature,
      page: this._page,
      position: { x, y },
      size: { width: DEFAULT_SIG_WIDTH, height: DEFAULT_SIG_HEIGHT },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        src,
        isDrawn: false, // Imported, not drawn
      },
    } as EditableObject;

    const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => newObject);
    commandPipeline.execute(cmd);
  }
}
