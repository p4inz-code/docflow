/**
 * ClipboardManager.ts — Clipboard Management
 *
 * Purpose: Handle copy, paste, cut, duplicate, and delete operations
 * for overlay objects. Generates fresh IDs on paste/duplicate so
 * that pasted objects are unique.
 *
 * Every clipboard operation creates the corresponding command for
 * history integration.
 */

import type { EditableObject } from "../types/objects";
import { generateId } from "../utils/id";
import { useEditorStore } from "../state/editorStore";
import { commandPipeline } from "../core/CommandPipeline";
import { DuplicateCommand } from "../commands/DuplicateCommand";
import { DeleteObjectCommand } from "../commands/DeleteObjectCommand";
import { CreateObjectCommand } from "../commands/CreateObjectCommand";

// ── Clipboard Manager ──────────────────────────────────────────────
export class ClipboardManager {
  /**
   * Copy selected objects to the clipboard.
   * Does NOT modify the document — only stores serialized copies.
   */
  copy(): void {
    const store = useEditorStore.getState();
    const selected = store.overlayObjects.filter((o) =>
      store.selectedIds.includes(o.id),
    );

    if (selected.length === 0) return;

    // Deep clone the selected objects, stripping selection state
    const clones = selected.map((obj) => ({
      ...JSON.parse(JSON.stringify(obj)),
      selected: false,
    }));

    store.setClipboard(clones);
  }

  /**
   * Cut selected objects (copy + delete).
   */
  cut(): void {
    this.copy();
    const store = useEditorStore.getState();
    if (store.selectedIds.length > 0) {
      const cmd = new DeleteObjectCommand(`cmd_${generateId()}`, [...store.selectedIds]);
      commandPipeline.execute(cmd);
    }
  }

  /**
   * Paste objects from the clipboard.
   * Pasted objects receive new IDs and are offset slightly so they
   * are visually distinct from the originals.
   */
  paste(): void {
    const store = useEditorStore.getState();
    const clipboard = store.clipboard;
    if (!clipboard || clipboard.length === 0) return;

    const newIds: string[] = [];
    const now = Date.now();
    const offsetStep = 20; // px offset for each pasted object

    for (let i = 0; i < clipboard.length; i++) {
      const source = clipboard[i];
      const newId = `obj_${generateId()}`;
      const pasted: EditableObject = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        position: {
          x: source.position.x + offsetStep,
          y: source.position.y + offsetStep,
        },
        selected: true,
        createdAt: now,
        updatedAt: now,
      };

      const cmd = new CreateObjectCommand(`cmd_${generateId()}`, () => pasted);
      commandPipeline.execute(cmd);
      newIds.push(newId);
    }

    store.setSelectedIds(newIds);
    store.setActiveId(newIds[0] ?? null);
  }

  /**
   * Duplicate selected objects in-place.
   * Creates copies with a small offset and selects them.
   */
  duplicate(): void {
    const store = useEditorStore.getState();
    const selected = store.overlayObjects.filter((o) =>
      store.selectedIds.includes(o.id),
    );

    if (selected.length === 0) return;

    const cmd = new DuplicateCommand(
      `cmd_${generateId()}`,
      selected.map((o) => o.id),
      20,
      20,
    );
    commandPipeline.execute(cmd);
  }

  /**
   * Delete selected objects.
   */
  delete(): void {
    const store = useEditorStore.getState();
    const idsToRemove = [...store.selectedIds];
    if (idsToRemove.length === 0) return;
    const cmd = new DeleteObjectCommand(`cmd_${generateId()}`, idsToRemove);
    commandPipeline.execute(cmd);
  }

  /**
   * Check if there's anything on the clipboard to paste.
   */
  get canPaste(): boolean {
    const store = useEditorStore.getState();
    return store.clipboard !== null && store.clipboard.length > 0;
  }

  /**
   * Check if there are selected objects to copy/cut/delete.
   */
  get hasSelection(): boolean {
    const store = useEditorStore.getState();
    return store.selectedIds.length > 0;
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const clipboardManager = new ClipboardManager();
