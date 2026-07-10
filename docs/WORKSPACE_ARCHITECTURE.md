# Docflow Workspace Architecture

## Overview

Docflow uses a multi-document workspace architecture inspired by modern code editors (VS Code, Sublime Text). The workspace manages multiple open PDF documents in tabs, with full lifecycle management, drag-to-reorder, and session persistence.

## Core Components

### WorkspaceStore (Zustand)
The central state container for all workspace documents. Manages:
- **Document array** — ordered list of open documents
- **Active document** — which tab is currently focused
- **Recently closed** — history of closed tabs (up to 20)
- **Tab operations** — open, close, close others, close all, reorder, cycle

### WorkspaceManager
High-level API for document lifecycle operations:
- `newDocument()` — create untitled blank document
- `openFile(file)` — load a PDF from a File object
- `saveDocument(id)` — save via registered callback
- `saveDocumentAs(id)` — save with new path
- `saveAllDocuments()` — save all dirty documents
- `closeDocument(id)` — close with dirty checking
- `closeOtherDocuments(id)` — close all except specified
- `closeAllDocuments()` — close everything

### TabManager
Tab-specific operations:
- Tab close handlers (for dirty-check dialogs)
- Tab cycle navigation
- Duplicate document detection
- Tab ordering

### RecentWorkspace
Session persistence via localStorage:
- Save workspace state on changes
- Restore workspace on startup
- Track recently opened file paths

## Data Flow

```
User Action → MenuBar/CommandPalette/DocumentTabs
                 ↓
           WorkspaceManager (orchestrates)
                 ↓
           WorkspaceStore (state update)
                 ↓
           EditorStore sync (viewport, dirty state)
                 ↓
           React re-render (tabs, viewer)
```

## Document Model

Each `WorkspaceDocument` contains:
- `id` — unique tab identifier
- `name` — display name (without extension)
- `filePath` — filesystem path (null for unsaved)
- `isDirty` — unsaved changes flag
- `pdf` — PDFDocumentProxy for pdfjs rendering
- `file` — original File object for re-saving
- `openedAt` / `savedAt` — timestamps
- `activePage` / `zoomLevel` — per-document viewport state

## Duplicate Prevention

When opening a file, the workspace checks if a document with the same `filePath` already exists. If so, it switches to the existing tab instead of creating a duplicate.

## Active Tab Restoration

When closing a tab, the workspace intelligently selects the next active tab:
- If there are documents after the closed one, select the next one
- If the closed tab was the last, select the previous one
- If all tabs are closed, set active to null
