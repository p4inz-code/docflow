# Docflow Menu System

## Architecture

Docflow uses a declarative menu system. Menu definitions are built by the `buildMenus(props)` function which returns a typed array of `MenuDefinition` objects. Each definition contains groups of items with actions, shortcuts, and enable/disable conditions.

## Menu Structure

### File
| Item | Shortcut | Action |
|------|----------|--------|
| New Document | Ctrl+N | `workspaceManager.newDocument()` |
| Open... | Ctrl+O | Trigger file input |
| Open Recent | — | Show recent files submenu |
| Close | Ctrl+W | `workspaceManager.closeDocument(activeId)` |
| Separator | | |
| Save | Ctrl+S | `workspaceManager.saveDocument(activeId)` |
| Save As... | Ctrl+Shift+S | `workspaceManager.saveDocumentAs(activeId)` |
| Save All | Ctrl+Alt+S | `workspaceManager.saveAllDocuments()` |
| Separator | | |
| Export... | — | (placeholder) |
| Export as PNG | — | (placeholder) |
| Separator | | |
| Document Properties | — | Open properties dialog |
| Print... | — | `window.print()` |
| Separator | | |
| Exit | — | (Electron only) |

### Edit
| Item | Shortcut | Action |
|------|----------|--------|
| Undo | Ctrl+Z | `commandPipeline.undo()` |
| Redo | Ctrl+Y | `commandPipeline.redo()` |
| Separator | | |
| Cut | Ctrl+X | `clipboardManager.cut()` |
| Copy | Ctrl+C | `clipboardManager.copy()` |
| Paste | Ctrl+V | `clipboardManager.paste()` |
| Duplicate | Ctrl+D | `clipboardManager.duplicate()` |
| Delete | Del | `clipboardManager.delete()` |
| Separator | | |
| Select All | Ctrl+A | Select all objects |
| Deselect | Esc | Clear selection |

### View
| Item | Shortcut | Action |
|------|----------|--------|
| Zoom In | Ctrl++ | Zoom in |
| Zoom Out | Ctrl+- | Zoom out |
| Fit Width | — | Fit to width |
| Fit Page | — | Fit to page |
| Reset Zoom | Ctrl+0 | Reset to 100% |
| Separator | | |
| Toggle Sidebar | Ctrl+B | Toggle thumbnail panel |
| Toggle Inspector | Ctrl+I | Toggle properties panel |
| Toggle Toolbar | — | (placeholder) |
| Separator | | |
| Fullscreen | F11 | Toggle fullscreen |
| Dark Theme | — | Apply dark theme |
| Light Theme | — | Apply light theme |

### Insert
| Item | Action |
|------|--------|
| Text | Set active tool to Text |
| Image... | Set active tool to Image |
| Shape | Set active tool to Shape |
| Drawing | Set active tool to Draw |
| Highlight | Set active tool to Highlight |
| Signature... | Set active tool to Signature |
| Stamp | Set active tool to Stamp |
| Separator | |
| Blank Page | (placeholder) |
| From File... | (placeholder) |

### Tools
| Item | Action |
|------|--------|
| Select (V) | Set active tool to Select |
| Hand (H) | Set active tool to Hand |
| Text (T) | Set active tool to Text |
| (all other tools) | Set active tool to respective tool |
| Separator | |
| Command Palette... | Open Ctrl+Shift+P palette |
| Separator | |
| Preferences... | Open settings dialog |

### Window
| Item | Shortcut | Action |
|------|----------|--------|
| Minimize | — | (Electron only) |
| Close Window | — | (Electron only) |
| Separator | | |
| {doc 1..9} | Ctrl+{1..9} | Switch to document |

### Help
| Item | Action |
|------|--------|
| About Docflow | Open about dialog |
| Keyboard Shortcuts | Show shortcuts list |

## Implementation Details

- Menu definitions are **rebuilt on every render** to capture latest state (dirty flags, enabled states, document list)
- Menus close on click outside
- Hovering over a menu label while another menu is open switches to the hovered menu
- Disabled items are shown with reduced opacity and no cursor interaction
- Keyboard shortcuts are displayed alongside menu items
- All actions are synchronous and route through the CommandPipeline, WorkspaceManager, or ClipboardManager

## Props Interface

The MenuBar accepts callbacks for:
- `onOpenFile` — trigger file picker
- `onToggleCommandPalette` — open/close palette
- `onSave` / `onSaveAs` — save operations
- `onZoomIn` / `onZoomOut` — zoom control
- `onFitWidth` / `onFitPage` — fit modes
- `onToggleSidebar` / `onToggleInspector` — panel toggles
- `onDocumentProperties` — open properties dialog
- `onPreferences` — open settings
- `onAbout` — open about dialog
