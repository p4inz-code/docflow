/**
 * ContextMenu.tsx — Right-Click Context Menu
 *
 * Purpose: Provide professional right-click context menus that
 * adapt to the current selection and cursor position.
 *
 * Menus:
 *   - No selection / empty space: Paste, Select All
 *   - Object(s) selected: Copy, Paste, Duplicate, Delete, Layer, Lock
 *   - Text object: Add Edit Text
 *
 * Every action goes through the clipboard manager or command pipeline.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore } from "../editor/state/editorStore";
import { clipboardManager } from "../editor/editing/ClipboardManager";
import { commandPipeline } from "../editor/core/CommandPipeline";
import { ZOrderCommand } from "../editor/commands/ZOrderCommand";
import { generateId } from "../editor/utils/id";

// ── Menu Item ──────────────────────────────────────────────────────
interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 9998,
  },
  menu: {
    position: "fixed" as const,
    zIndex: 9999,
    background: "#252525",
    border: "1px solid #3a3a3a",
    borderRadius: 6,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    minWidth: 160,
    padding: "4px 0",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    cursor: "pointer",
    color: "#ccc",
    fontSize: 13,
    transition: "background 0.1s",
  },
  itemDisabled: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    cursor: "default",
    color: "#555",
    fontSize: 13,
  },
  shortcut: {
    color: "#666",
    fontSize: 11,
    marginLeft: 24,
  },
  separator: {
    height: 1,
    background: "#333",
    margin: "4px 8px",
  },
};

// ── Context Menu Component ─────────────────────────────────────────
export default function ContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();

    const store = useEditorStore.getState();
    const hasSelection = store.selectedIds.length > 0;
    const items: MenuItem[] = [];

    if (hasSelection) {
      const allLocked = store.selectedIds.every(
        (id) => store.overlayObjects.find((o) => o.id === id)?.locked,
      );

      items.push(
        { label: "Copy", action: () => clipboardManager.copy(), shortcut: "Ctrl+C" },
        { label: "Cut", action: () => clipboardManager.cut(), shortcut: "Ctrl+X" },
        { label: "Duplicate", action: () => clipboardManager.duplicate(), shortcut: "Ctrl+D" },
        { label: "", action: () => {}, separator: true },
        { label: "Delete", action: () => clipboardManager.delete(), shortcut: "Del" },
        { label: "", action: () => {}, separator: true },
        {
          label: allLocked ? "Unlock" : "Lock",
          action: () => {
            for (const id of store.selectedIds) {
              store.updateOverlayObject(id, { locked: !allLocked });
            }
          },
        },
        { label: "", action: () => {}, separator: true },
        {
          label: "Bring to Front",
          action: () => {
            const cmd = new ZOrderCommand(generateId(), store.selectedIds, "front");
            commandPipeline.execute(cmd);
          },
        },
        {
          label: "Send to Back",
          action: () => {
            const cmd = new ZOrderCommand(generateId(), store.selectedIds, "back");
            commandPipeline.execute(cmd);
          },
        },
        {
          label: "Bring Forward",
          action: () => {
            const cmd = new ZOrderCommand(generateId(), store.selectedIds, "forward");
            commandPipeline.execute(cmd);
          },
        },
        {
          label: "Send Backward",
          action: () => {
            const cmd = new ZOrderCommand(generateId(), store.selectedIds, "backward");
            commandPipeline.execute(cmd);
          },
        },
      );
    } else {
      items.push(
        {
          label: "Paste",
          action: () => clipboardManager.paste(),
          disabled: !clipboardManager.canPaste,
          shortcut: "Ctrl+V",
        },
        { label: "", action: () => {}, separator: true },
        { label: "Select All", action: () => {}, shortcut: "Ctrl+A", disabled: true },
      );
    }

    items.push(
      { label: "", action: () => {}, separator: true },
      { label: "Properties", action: () => {} },
    );

    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [handleContextMenu]);

  // Close on click outside
  useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    // Use requestAnimationFrame instead of setTimeout(0) for better
    // lifecycle management — cleanup fires on next frame if unmounted.
    const rafId = requestAnimationFrame(() => {
      document.addEventListener("click", handleClick);
    });
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", handleClick);
    };
  }, [menu, close]);

  // Close on Escape
  useEffect(() => {
    if (!menu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menu, close]);

  if (!menu) return null;

  // Keep menu within viewport
  const menuX = Math.min(menu.x, window.innerWidth - 180);
  const menuY = Math.min(menu.y, window.innerHeight - menu.items.length * 32);

  return (
    <>
      <div style={styles.overlay} onClick={close} onContextMenu={(e) => e.preventDefault()} />
      <div ref={menuRef} style={{ ...styles.menu, left: menuX, top: menuY }} role="menu" aria-label="Context menu">
        {menu.items.map((item, i) => {
          if (item.separator) {
            return <div key={i} style={styles.separator} />;
          }
          return (
            <div
              key={i}
              role="menuitem"
              tabIndex={-1}
              style={item.disabled ? styles.itemDisabled : styles.item}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  close();
                }
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  (e.target as HTMLElement).style.background = "#333";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = "transparent";
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <span style={styles.shortcut}>{item.shortcut}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
