/**
 * MenuBar.tsx — Professional Desktop Menu Bar
 *
 * Purpose: Desktop-style menu bar with File, Edit, View, Insert,
 * Tools, Window, Help menus. All actions route through the
 * CommandPipeline or WorkspaceStore.
 *
 * No duplicated logic — keyboard shortcuts execute the same commands.
 * Every action is also available via the CommandPalette.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../../editor/state/editorStore";
import { useWorkspaceStore } from "../../editor/workspace/WorkspaceStore";
import { workspaceManager } from "../../editor/workspace/WorkspaceManager";
import { clipboardManager } from "../../editor/editing/ClipboardManager";
import { ToolType } from "../../editor/types/tools";
import { commandPipeline } from "../../editor/core/CommandPipeline";
import { settingsManager } from "../../editor/core/Settings";


// ── Props ──────────────────────────────────────────────────────────
interface MenuBarProps {
  onOpenFile?: () => void;
  onToggleCommandPalette?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
  onDocumentProperties?: () => void;
  onPreferences?: () => void;
  onAbout?: () => void;
  onExport?: () => void;
}

// ── Menu Definitions ───────────────────────────────────────────────
interface MenuAction {
  label: string;
  shortcut?: string;
  action: () => void;
  enabled?: () => boolean;
  separator?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuAction[];
}

interface MenuDefinition {
  label: string;
  groups: MenuGroup[];
}

function buildMenus(props: MenuBarProps): MenuDefinition[] {
  return [
    {
      label: "File",
      groups: [
        {
          label: "file-actions",
          items: [
            {
              label: "New Document",
              shortcut: "Ctrl+N",
              action: () => workspaceManager.newDocument(),
              enabled: () => true,
            },
            {
              label: "Open...",
              shortcut: "Ctrl+O",
              action: () => props.onOpenFile?.(),
            },
            {
              label: "Open Recent",
              action: () => {},
              enabled: () => false,
            },
            {
              label: "Close",
              shortcut: "Ctrl+W",
              action: () => {
                const activeId = useWorkspaceStore.getState().activeDocumentId;
                if (activeId) workspaceManager.closeDocument(activeId);
              },
              enabled: () => useWorkspaceStore.getState().documents.length > 0,
            },
          ],
        },
        {
          label: "save-actions",
          items: [
            {
              label: "Save",
              shortcut: "Ctrl+S",
              action: () => {
                const activeId = useWorkspaceStore.getState().activeDocumentId;
                if (activeId) workspaceManager.saveDocument(activeId);
              },
              enabled: () => useEditorStore.getState().isDirty,
            },
            {
              label: "Save As...",
              shortcut: "Ctrl+Shift+S",
              action: () => {
                const activeId = useWorkspaceStore.getState().activeDocumentId;
                if (activeId) workspaceManager.saveDocumentAs(activeId);
              },
            },
            {
              label: "Save All",
              shortcut: "Ctrl+Alt+S",
              action: () => workspaceManager.saveAllDocuments(),
              enabled: () =>
                useWorkspaceStore
                  .getState()
                  .documents.some((d) => d.isDirty),
            },
          ],
        },
        {
          label: "export-actions",
          items: [
            {
              label: "Export...",
              action: () => props.onExport?.(),
              enabled: () =>
                useWorkspaceStore.getState().documents.length > 0,
            },
          ],
        },
        {
          label: "doc-actions",
          items: [
            {
              label: "Document Properties",
              action: () => props.onDocumentProperties?.(),
              enabled: () =>
                useWorkspaceStore.getState().documents.length > 0,
            },
            {
              label: "Print...",
              action: () => window.print(),
              enabled: () =>
                useWorkspaceStore.getState().documents.length > 0,
            },
          ],
        },
        {
          label: "exit-actions",
          items: [
            { separator: true, label: "", action: () => {} },
            { label: "Exit", action: () => {}, enabled: () => false },
          ],
        },
      ],
    },
    {
      label: "Edit",
      groups: [
        {
          label: "undo-group",
          items: [
            {
              label: "Undo",
              shortcut: "Ctrl+Z",
              action: () => commandPipeline.undo(),
              enabled: () => commandPipeline.canUndo,
            },
            {
              label: "Redo",
              shortcut: "Ctrl+Y",
              action: () => commandPipeline.redo(),
              enabled: () => commandPipeline.canRedo,
            },
          ],
        },
        {
          label: "clipboard-group",
          items: [
            {
              label: "Cut",
              shortcut: "Ctrl+X",
              action: () => clipboardManager.cut(),
              enabled: () =>
                useEditorStore.getState().selectedIds.length > 0,
            },
            {
              label: "Copy",
              shortcut: "Ctrl+C",
              action: () => clipboardManager.copy(),
              enabled: () =>
                useEditorStore.getState().selectedIds.length > 0,
            },
            {
              label: "Paste",
              shortcut: "Ctrl+V",
              action: () => clipboardManager.paste(),
              enabled: () => clipboardManager.canPaste,
            },
            {
              label: "Duplicate",
              shortcut: "Ctrl+D",
              action: () => clipboardManager.duplicate(),
              enabled: () =>
                useEditorStore.getState().selectedIds.length > 0,
            },
            {
              label: "Delete",
              shortcut: "Del",
              action: () => clipboardManager.delete(),
              enabled: () =>
                useEditorStore.getState().selectedIds.length > 0,
            },
          ],
        },
        {
          label: "selection-group",
          items: [
            {
              label: "Select All",
              shortcut: "Ctrl+A",
              action: () => {
                const store = useEditorStore.getState();
                const ids = store.overlayObjects.map((o) => o.id);
                store.setSelectedIds(ids);
              },
              enabled: () =>
                useEditorStore.getState().overlayObjects.length > 0,
            },
            {
              label: "Deselect",
              shortcut: "Esc",
              action: () => useEditorStore.getState().clearSelection(),
            },
          ],
        },
      ],
    },
    {
      label: "View",
      groups: [
        {
          label: "zoom-group",
          items: [
            {
              label: "Zoom In",
              shortcut: "Ctrl++",
              action: () => props.onZoomIn?.(),
            },
            {
              label: "Zoom Out",
              shortcut: "Ctrl+-",
              action: () => props.onZoomOut?.(),
            },
            {
              label: "Fit Width",
              action: () => props.onFitWidth?.(),
            },
            {
              label: "Fit Page",
              action: () => props.onFitPage?.(),
            },
            {
              label: "Reset Zoom",
              shortcut: "Ctrl+0",
              action: () => props.onFitPage?.(),
            },
          ],
        },
        {
          label: "panels-group",
          items: [
            {
              label: "Toggle Sidebar",
              shortcut: "Ctrl+B",
              action: () => props.onToggleSidebar?.(),
            },
            {
              label: "Toggle Inspector",
              shortcut: "Ctrl+I",
              action: () => props.onToggleInspector?.(),
            },
            {
              label: "Toggle Toolbar",
              action: () => {},
              enabled: () => false,
            },
          ],
        },
        {
          label: "display-group",
          items: [
            {
              label: "Fullscreen",
              shortcut: "F11",
              action: () => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              },
            },
            { separator: true, label: "", action: () => {} },
            {
              label: "Dark Theme",
              action: () => settingsManager.update({ theme: "dark" }),
            },
            {
              label: "Light Theme",
              action: () => settingsManager.update({ theme: "light" }),
            },
          ],
        },
      ],
    },
    {
      label: "Insert",
      groups: [
        {
          label: "insert-group",
          items: [
            {
              label: "Text",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Text),
            },
            {
              label: "Image...",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Image),
            },
            {
              label: "Shape",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Shape),
            },
            {
              label: "Drawing",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Draw),
            },
            {
              label: "Highlight",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Highlight),
            },
            {
              label: "Signature...",
              action: () =>
                useEditorStore.getState().setActiveTool(
                  ToolType.Signature,
                ),
            },
            {
              label: "Stamp",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Stamp),
            },
          ],
        },
        {
          label: "page-group",
          items: [
            {
              label: "Blank Page",
              action: () => {},
              enabled: () => false,
            },
            {
              label: "From File...",
              action: () => {},
              enabled: () => false,
            },
          ],
        },
      ],
    },
    {
      label: "Tools",
      groups: [
        {
          label: "tool-group",
          items: [
            {
              label: "Select (V)",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Select),
            },
            {
              label: "Hand (H)",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Hand),
            },
            {
              label: "Text (T)",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Text),
            },
            {
              separator: true,
              label: "",
              action: () => {},
            },
            {
              label: "Image",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Image),
            },
            {
              label: "Shape",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Shape),
            },
            {
              label: "Drawing",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Draw),
            },
            {
              label: "Highlight",
              action: () =>
                useEditorStore.getState().setActiveTool(
                  ToolType.Highlight,
                ),
            },
            {
              label: "Erase",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Erase),
            },
            {
              label: "Signature",
              action: () =>
                useEditorStore.getState().setActiveTool(
                  ToolType.Signature,
                ),
            },
            {
              label: "Stamp",
              action: () =>
                useEditorStore.getState().setActiveTool(ToolType.Stamp),
            },
          ],
        },
        {
          label: "utility-group",
          items: [
            {
              label: "Command Palette...",
              shortcut: "Ctrl+Shift+P",
              action: () => props.onToggleCommandPalette?.(),
            },
            { separator: true, label: "", action: () => {} },
            {
              label: "Preferences...",
              shortcut: "Ctrl+,",
              action: () => props.onPreferences?.(),
            },
          ],
        },
      ],
    },
    {
      label: "Window",
      groups: [
        {
          label: "window-group",
          items: [
            {
              label: "Minimize",
              action: () => {},
              enabled: () => false,
            },
            {
              label: "Close Window",
              action: () => {},
              enabled: () => false,
            },
            { separator: true, label: "", action: () => {} },
            ...useWorkspaceStore
              .getState()
              .documents.slice(0, 9)
              .map((doc, i) => ({
                label: `${i + 1}. ${doc.name}${doc.isDirty ? " *" : ""}`,
                shortcut: i < 9 ? `Ctrl+${i + 1}` : undefined,
                action: () =>
                  useWorkspaceStore
                    .getState()
                    .setActiveDocument(doc.id),
              })),
          ],
        },
      ],
    },
    {
      label: "Help",
      groups: [
        {
          label: "help-group",
          items: [
            {
              label: "About Docflow",
              action: () => props.onAbout?.(),
            },
            {
              label: "Keyboard Shortcuts",
              action: () => {
                alert(
                  "Keyboard Shortcuts:\n\n" +
                    "Ctrl+N — New Document\n" +
                    "Ctrl+O — Open\n" +
                    "Ctrl+W — Close Tab\n" +
                    "Ctrl+S — Save\n" +
                    "Ctrl+Shift+S — Save As\n" +
                    "Ctrl+Z — Undo\n" +
                    "Ctrl+Y — Redo\n" +
                    "Ctrl+C — Copy\n" +
                    "Ctrl+V — Paste\n" +
                    "Ctrl+X — Cut\n" +
                    "Ctrl+D — Duplicate\n" +
                    "Del — Delete\n" +
                    "Ctrl+A — Select All\n" +
                    "Ctrl+F — Search\n" +
                    "Ctrl+Shift+P — Command Palette\n" +
                    "Ctrl+B — Toggle Sidebar\n" +
                    "Ctrl+I — Toggle Inspector\n" +
                    "Ctrl+Tab / Ctrl+Shift+Tab — Cycle Tabs\n" +
                    "V, H, T, I, R, D, U, S, P, E — Tool shortcuts",
                );
              },
            },
          ],
        },
      ],
    },
  ];
}

// ── Component ──────────────────────────────────────────────────────
export default function MenuBar(props: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  const handleMenuClick = useCallback((label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  }, []);

  const handleAction = useCallback(
    (_menuLabel: string, action: () => void) => {
      action();
      setOpenMenu(null);
    },
    [],
  );

  // Rebuild menus each render to capture latest state
  const menus = buildMenus(props);

  return (
    <div
      ref={menuRef}
      style={{
        display: "flex",
        alignItems: "center",
        height: 28,
        background: "#161616",
        borderBottom: "1px solid #2a2a2a",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {menus.map((menu) => (
        <div key={menu.label} style={{ position: "relative" }}>
          <button
            onClick={() => handleMenuClick(menu.label)}
            style={{
              height: "100%",
              padding: "0 10px",
              border: "none",
              background:
                openMenu === menu.label ? "#2a2a2a" : "transparent",
              color: openMenu === menu.label ? "#fff" : "#aaa",
              cursor: "pointer",
              fontSize: 12,
              transition: "background 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (openMenu) setOpenMenu(menu.label);
              (e.target as HTMLElement).style.background = openMenu
                ? "#2a2a2a"
                : "#222";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background =
                "transparent";
            }}
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {openMenu === menu.label && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 9999,
                background: "#252525",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                minWidth: 200,
                padding: "4px 0",
              }}
            >
              {menu.groups.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: "#333",
                        margin: "4px 0",
                      }}
                    />
                  )}
                  {group.items.map((item, ii) => {
                    if (item.separator) {
                      return (
                        <div
                          key={ii}
                          style={{
                            height: 1,
                            background: "#333",
                            margin: "4px 12px",
                          }}
                        />
                      );
                    }
                    const enabled = item.enabled?.() ?? true;
                    return (
                      <div
                        key={ii}
                        onClick={() => {
                          if (enabled)
                            handleAction(menu.label, item.action);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "5px 12px",
                          cursor: enabled ? "pointer" : "default",
                          color: enabled ? "#ccc" : "#555",
                          fontSize: 12,
                          opacity: enabled ? 1 : 0.5,
                        }}
                        onMouseEnter={(e) => {
                          if (enabled)
                            (e.target as HTMLElement).style.background =
                              "#333";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span
                            style={{
                              color: "#666",
                              fontSize: 11,
                              marginLeft: 24,
                            }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* App title */}
      <span style={{ color: "#555", fontSize: 11, paddingRight: 12 }}>
        Docflow
      </span>
    </div>
  );
}
