/**
 * TextTool.ts — Text Tool (Full Implementation)
 *
 * Purpose: Create and edit text objects on the document.
 *
 * Capabilities:
 *   - Click to create new text at cursor position
 *   - Click existing editable text to edit it inline
 *   - Support rapid consecutive text creation
 *   - Auto-cancel empty objects
 *   - Integration with RenderingManager for inline editing
 *
 * Flow:
 *   1. User clicks page → creates TextObject via store
 *   2. Object enters editing mode immediately
 *   3. InlineTextEditor handles keyboard input
 *   4. On finish → content saved, object exits edit mode
 *   5. On cancel/empty → object is removed
 */

import type { Tool } from "../../types/tools";
import { ToolType } from "../../types/tools";
import { CursorStyle } from "../../types/editor";
import { ObjectType } from "../../types/objects";
import type { InteractionEvent } from "../../types/interaction";
import { useEditorStore } from "../../state/editorStore";
import { inlineEditor } from "../../editing/InlineTextEditor";
import { generateId } from "../../utils/id";
import type { RenderingManager } from "../../rendering/RenderingManager";
import type { EditableObject, TextObject } from "../../types/objects";
import { commandPipeline } from "../../core/CommandPipeline";
import { CreateTextCommand } from "../../commands/CreateTextCommand";
import { EditTextCommand } from "../../commands/EditTextCommand";
import { DeleteObjectCommand } from "../../commands/DeleteObjectCommand";

// Default text object dimensions
const DEFAULT_TEXT_WIDTH = 200;
const DEFAULT_TEXT_HEIGHT = 40;

export class TextTool implements Tool {
  readonly type = ToolType.Text;
  readonly label = "Text";
  readonly shortcut = "t";
  readonly cursor = CursorStyle.Text;

  private _renderingManager: RenderingManager | null = null;
  private _pendingObjectId: string | null = null;
  private _pendingPage: number = 1;

  /** Set the rendering manager reference (called by the viewer). */
  setRenderingManager(manager: RenderingManager): void {
    this._renderingManager = manager;
  }

  onActivate(): void {
    // Ensure cursor reflects text mode
    document.body.style.cursor = "text";
  }

  onDeactivate(): void {
    // Cancel any pending text creation
    if (this._pendingObjectId) {
      this._cancelPending();
    }
    if (inlineEditor.isActive) {
      inlineEditor.stopEditing();
    }
    document.body.style.cursor = "";
  }

  onPointerDown(event: InteractionEvent): void {
    const store = useEditorStore.getState();

    // If inline editor is active, finish editing first
    if (inlineEditor.isActive) {
      inlineEditor.stopEditing();
    }

    // Check if we clicked on an existing text object
    const clickedObject = store.overlayObjects.find((o) => {
      if (o.type !== ObjectType.Text) return false;
      return (
        event.point.x >= o.position.x &&
        event.point.x <= o.position.x + o.size.width &&
        event.point.y >= o.position.y &&
        event.point.y <= o.position.y + o.size.height
      );
    });

    if (clickedObject) {
      // Start editing existing text
      store.setSelectedIds([clickedObject.id]);
      store.setActiveId(clickedObject.id);
      this._startInlineEdit(clickedObject.id);
      return;
    }

    // Get the page from active page
    const page = store.activePage;

    // Create a new text object
    const now = Date.now();
    const newId = `text_${generateId()}`;
    const fontSize = 16;
    const lineHeight = 1.4;

    const newObject = {
      id: newId,
      type: ObjectType.Text,
      page,
      position: {
        x: event.point.x,
        y: event.point.y,
      },
      size: {
        width: DEFAULT_TEXT_WIDTH,
        height: DEFAULT_TEXT_HEIGHT,
      },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      selected: true,
      createdAt: now,
      updatedAt: now,
      data: {
        content: "",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize,
        fontWeight: 400,
        color: "#000000",
        textAlign: "left",
        lineHeight,
      },
    } as TextObject;

    // Execute through command pipeline for undo support
    const cmd = new CreateTextCommand(`cmd_${generateId()}`, () => newObject as EditableObject);
    commandPipeline.execute(cmd);

    this._pendingObjectId = newId;
    this._pendingPage = page;

    // Start inline editing immediately
    this._startInlineEdit(newId);
  }

  onPointerMove(_event: InteractionEvent): void {
    // No pointer move handling needed for text tool
  }

  onPointerUp(_event: InteractionEvent): void {
    // No pointer up handling needed
  }

  onDoubleClick(event: InteractionEvent): void {
    // Treat double-click like single-click for text editing
    this.onPointerDown(event);
  }

  onWheel(_event: InteractionEvent): void {
    // Allow scrolling while text tool is active
  }

  onKeyDown(event: KeyboardEvent): void {
    // If inline editor is active, it handles its own keys
    if (inlineEditor.isActive) return;

    // Press 't' to activate text mode if in select mode
    // (handled by global shortcuts)
  }

  onKeyUp(_event: KeyboardEvent): void {
    // No-op
  }

  // ── Private ──────────────────────────────────────────────────────
  private _startInlineEdit(objectId: string): void {
    const renderer = this._renderingManager?.getRenderer(objectId);
    if (!renderer) return;

    const store = useEditorStore.getState();
    const obj = store.overlayObjects.find((o) => o.id === objectId);
    if (!obj) return;

    const element = renderer.element;
    const originalContent = ((obj.data as Record<string, unknown>)?.content as string) ?? "";

    inlineEditor.startEditing(obj, element, {
      onFinish: (content: string) => {
        const currentStore = useEditorStore.getState();
        const currentObj = currentStore.overlayObjects.find(
          (o) => o.id === objectId,
        );
        if (currentObj && content !== originalContent) {
          // Use EditTextCommand for undoable text editing
          const cmd = new EditTextCommand(
            `cmd_${generateId()}`,
            objectId,
            originalContent,
            content,
          );
          commandPipeline.execute(cmd);
        }
        this._pendingObjectId = null;
      },
      onCancel: () => {
        // If the object was newly created and is empty, remove it
        if (
          this._pendingObjectId === objectId &&
          (!originalContent || originalContent.trim() === "")
        ) {
          const store = useEditorStore.getState();
          const obj = store.overlayObjects.find((o) => o.id === objectId);
          if (obj) {
            const cmd = new DeleteObjectCommand(`cmd_${generateId()}`, [objectId]);
            commandPipeline.execute(cmd);
          }
          store.clearSelection();
        }
        this._pendingObjectId = null;
      },
    });
  }

  private _cancelPending(): void {
    if (!this._pendingObjectId) return;
    const store = useEditorStore.getState();
    store.removeOverlayObject(this._pendingObjectId);
    store.clearSelection();
    this._pendingObjectId = null;
  }
}
