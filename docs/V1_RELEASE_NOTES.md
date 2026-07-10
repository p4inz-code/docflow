# Docflow V1.0.0 — Release Notes

## Overview
Docflow is a professional PDF editing workspace built for modern browsers and Electron. V1 delivers a complete multi-document PDF editor with annotation tools, export pipeline, and a polished desktop UI.

## New Features

### Multi-Document Workspace
- Open multiple PDF documents in tabs
- Closable tabs with dirty indicators (*)
- Drag-to-reorder tabs
- Ctrl+Tab / Ctrl+Shift+Tab navigation
- Tab context menu (Close, Close Others, Close All)
- Unsaved document warning on close
- Session persistence across restarts

### PDF Viewing & Navigation
- High-quality PDF rendering via pdfjs-dist
- Multi-page document support
- Smooth zoom (50%–300%) with Ctrl+scroll
- Fit width / fit page modes
- Drag-to-pan when zoomed in
- Lazy-loading page thumbnails with context menu
- Full-text search with case/whole-word options

### Editing Engine
- 10 editing tools: Select, Hand, Text, Image, Shape, Draw, Highlight, Signature, Stamp, Erase
- Object manipulation: move, resize, rotate, delete
- Clipboard: copy, cut, paste, duplicate
- Undo/redo with command merging during drags
- Smart guides for alignment
- Inline text editing with contentEditable

### Image Support
- Import PNG, JPEG, WebP images
- Image editing controls (size, rotation, flip, opacity)
- Aspect ratio lock during resize
- Border, shadow, corner radius styling
- Drag-and-drop image placement

### Professional UI
- Desktop-style menu bar with File, Edit, View, Insert, Tools, Window, Help
- Command Palette (Ctrl+Shift+P) with fuzzy search
- Context menus on right-click
- Properties inspector panel
- Page manager dialog
- Preferences dialog with all settings
- About dialog
- Error handling with toast notifications
- Search panel (Ctrl+F)
- Status bar with page/zoom/tool info
- Custom scrollbars
- Animation keyframes (fadeIn, slideIn, scaleIn)
- Skeleton loading states
- Empty state with recent files

### Export & Save
- Save / Save As workflow
- Export dialog with format, range, DPI options
- Flatten annotations and forms on export
- Metadata preservation
- Autosave with crash recovery
- Recovery session management

### Accessibility
- Keyboard shortcut support for all tools
- Focus trapping in dialogs
- ARIA labels on interactive elements
- High contrast mode
- Reduced motion mode
- Large UI mode

## Known Issues

### Browser Limitations
- File system access limited in browser mode (full support requires Electron)
- Save only works as download in browser (no overwrite)
- Open recent from file path not available in browser

### Editing
- Undo/redo not yet wired for all tool operations
- PDF overlay flattening during export is a framework placeholder
- Forms are architecture-ready but not yet interactive
- Annotations (sticky notes, callouts) are type-defined but tools are placeholders

### Performance
- All pages rendered upfront; virtual rendering improvements planned for V1.1
- Thumbnail data URLs cached in memory (LRU eviction planned)
- Large documents (500+ pages) may be slow to open

## System Requirements

### Browser
- Chrome 100+, Edge 100+, Firefox 120+, Safari 16+
- JavaScript enabled
- WebAssembly support (for pdfjs-dist)

### Electron (Desktop)
- Windows 10+, macOS 12+, Ubuntu 20.04+
- 4GB RAM minimum (8GB recommended)
- 100MB disk space

## Installation

### Browser
```bash
pnpm install
cd apps/renderer
pnpm dev
```
Open http://localhost:5173 in a browser.

### Electron
```bash
pnpm install
cd apps/desktop
pnpm dev
```
