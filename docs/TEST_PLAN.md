# Docflow V1 — Test Plan

## Test Scope
This test plan covers all core functionality of Docflow V1. Tests are organized by subsystem.

## 1. Workspace Tests

### 1.1 Document Tabs
| Test | Steps | Expected |
|------|-------|----------|
| Open document | Click Open, select PDF | Document opens in new tab |
| Multiple tabs | Open 3 PDFs | 3 tabs visible, clickable |
| Tab switching | Click a tab | Document content switches |
| Close tab | Click X on active tab | Tab closes |
| Dirty indicator | Edit document | Tab shows * or blue dot |
| Middle-click close | Middle-click a tab | Tab closes |
| Drag reorder | Drag tab to new position | Tab moves to new position |
| Ctrl+Tab | Press Ctrl+Tab | Next tab activates |
| Ctrl+Shift+Tab | Press Ctrl+Shift+Tab | Previous tab activates |
| Context menu | Right-click tab | Close, Close Others, Close All |

### 1.2 File Lifecycle
| Test | Steps | Expected |
|------|-------|----------|
| New Document | File > New | Blank untitled document created |
| Save | Ctrl+S | Document marked as saved |
| Save As | Ctrl+Shift+S | Document saved to new location |
| Close with unsaved | Close dirty doc | Dialog: Save/Discard/Cancel |
| Close Others | Right-click > Close Others | Only active tab remains |
| Close All | Right-click > Close All | All tabs closed |
| Drop PDF | Drag PDF onto window | Document opens in new tab |

## 2. PDF Viewing Tests

### 2.1 Rendering
| Test | Steps | Expected |
|------|-------|----------|
| Page render | Open PDF | All pages rendered correctly |
| Scrolling | Scroll through document | Smooth scrolling |
| Zoom in | Ctrl++ or toolbar | Pages enlarge |
| Zoom out | Ctrl+- or toolbar | Pages shrink |
| Fit width | Click Fit W | Pages fit to container width |
| Fit page | Click Fit P | Full page visible |
| Ctrl+scroll zoom | Ctrl+wheel | Smooth zoom |
| Pan at zoom | Drag when zoomed >100% | Document pans |
| High DPI | Test on HiDPI display | Crisp rendering |

### 2.2 Thumbnails
| Test | Steps | Expected |
|------|-------|----------|
| Thumbnail render | Open document | Thumbnails appear in sidebar |
| Click to navigate | Click thumbnail | View scrolls to that page |
| Lazy loading | Scroll through thumbnails | Thumbnails load progressively |
| Context menu | Right-click thumbnail | Rotate, Duplicate, Delete options |

### 2.3 Search
| Test | Steps | Expected |
|------|-------|----------|
| Open search | Ctrl+F | Search panel opens |
| Text search | Type query | Matches highlighted |
| Case sensitivity | Toggle Aa | Search respects case |
| Whole word | Toggle Word | Only whole words match |
| Navigation | Click Prev/Next | Scrolls to match |
| No results | Type gibberish | "No results found" shown |

## 3. Editing Tests

### 3.1 Tools
| Test | Steps | Expected |
|------|-------|----------|
| Select tool | Press V | Select tool active |
| Hand tool | Press H | Hand tool active, drag pans |
| Text tool | Press T, click on page | Text object created |
| Image tool | Press I, click | File picker opens, image placed |
| Shape tool | Press R, drag | Shape created |
| Draw tool | Press D, draw | Freehand drawing created |
| Highlight tool | Press U | Highlight mode active |
| Erase tool | Press E | Erase mode active |

### 3.2 Object Manipulation
| Test | Steps | Expected |
|------|-------|----------|
| Select | Click object | Object highlighted with handles |
| Multi-select | Ctrl+click objects | Multiple selected |
| Move | Drag selected object | Object moves smoothly |
| Resize | Drag handle | Object resizes |
| Rotate | Drag rotation handle | Object rotates |
| Delete | Select, press Delete | Object removed |
| Copy/Paste | Ctrl+C, Ctrl+V | Object duplicated with offset |
| Duplicate | Ctrl+D | Object duplicated in place |
| Undo | Ctrl+Z | Last action reversed |
| Redo | Ctrl+Y | Undone action reapplied |
| Nudge | Arrow keys | Object moves 1px |
| Nudge 10px | Shift+arrow | Object moves 10px |

## 4. UI Tests

### 4.1 Menus
| Test | Steps | Expected |
|------|-------|----------|
| Menu open | Click menu label | Dropdown appears |
| Menu close | Click elsewhere | Dropdown closes |
| Menu hover | Hover another menu | Menu switches |
| Disabled items | Check grayed items | Not clickable |
| Shortcuts | Verify shortcut text | Shown next to items |

### 4.2 Command Palette
| Test | Steps | Expected |
|------|-------|----------|
| Open | Ctrl+Shift+P | Palette opens |
| Search | Type command name | Results filtered |
| Fuzzy search | Type partial name | Fuzzy matches shown |
| Keyboard nav | Arrow keys, Enter | Navigate and execute |
| Close | Escape | Palette closes |

### 4.3 Dialogs
| Test | Steps | Expected |
|------|-------|----------|
| Focus trap | Tab through dialog | Focus stays in dialog |
| Escape | Press Escape | Dialog closes |
| Enter | Press Enter | Default action triggered |
| Close button | Click X | Dialog closes |
| Overlay click | Click outside dialog | Dialog closes |

## 5. Export Tests
| Test | Steps | Expected |
|------|-------|----------|
| Export dialog | File > Export | Export dialog opens |
| Format selection | Choose PDF/PNG/JPEG | Options update |
| Page range | Select custom range | Only specified pages exported |
| DPI selection | Choose DPI | Resolution applied |
| Cancel | Click Cancel | Dialog closes, no export |

## 6. Performance Tests
| Test | Steps | Expected |
|------|-------|----------|
| Large document | Open 500-page PDF | < 30s to open |
| Memory | Monitor memory | No leaks after operations |
| Thumbnails | Scroll through thumbnails | Smooth, no jank |
| Multi-tab | Open 10 documents | Stable performance |
