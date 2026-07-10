# Docflow V1 — Architecture Overview

## System Architecture

Docflow is a single-page application (SPA) built with React, TypeScript, and Zustand for state management. It uses pdfjs-dist for PDF rendering and pdf-lib for PDF manipulation.

```
┌─────────────────────────────────────────────┐
│                  App.tsx                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ MenuBar   │ │ Document │ │   Toolbar    │ │
│  │           │ │  Tabs    │ │              │ │
│  ├──────────┤ ├──────────┤ ├──────────────┤ │
│  │Sidebar   │ │          │ │ Inspector    │ │
│  │Thumbnails│ │ PDFViewer│ │ Panel        │ │
│  └──────────┘ │          │ └──────────────┘ │
│               └──────────┘                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ StatusBar │ │Search    │ │ Command      │ │
│  │           │ │ Panel    │ │ Palette      │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└─────────────────────────────────────────────┘
```

## Core Subsystems

### 1. Workspace (Multi-Document)
- **WorkspaceStore** (Zustand): Manages open documents, active tab, dirty state
- **WorkspaceManager**: High-level API for open/save/close lifecycle
- **TabManager**: Keyboard navigation (Ctrl+Tab) and drag-reorder
- **RecentWorkspace**: Session persistence to localStorage

### 2. Rendering Engine
- **RenderingManager**: Central coordinator for overlay rendering
- **ObjectRenderer** interface: Per-type renderers (Text, Image, Shape, etc.)
- **DirtyTracker**: Change detection for efficient re-renders
- **RenderScheduler**: Batched re-render scheduling

### 3. Editing Engine
- **CommandPipeline**: Wires CommandManager → HistoryManager
- **CommandManager**: Executes commands, notifies history
- **HistoryManager**: Undo/redo stacks with configurable depth
- **Commands**: 10 command types (Create, Move, Delete, Resize, etc.)

### 4. Tool System
- **ToolManager**: Registry and lifecycle for editing tools
- **10 tools**: Select, Hand, Text, Image, Shape, Draw, Highlight, Signature, Stamp, Erase
- **InteractionManager**: Normalizes DOM events → routes to active tool

### 5. Export Pipeline
```
User → ExportDialog → ExportEngine
  ├── Validator (pre-flight checks)
  ├── FontManager (font embedding)
  ├── ImageEmbedder (image embedding)
  ├── OverlayFlattener (object → PDF rendering)
  ├── PageExporter (page iteration)
  ├── MetadataWriter (title, author, etc.)
  └── ProgressReporter (progress callbacks)
```

### 6. Import Pipeline
```
User → File/Clipboard/Drag → ImportEngine
  ├── ImageImport (data URL conversion)
  ├── PDF Import (pdf-lib merge)
  ├── Clipboard Import (image + text)
  ├── Batch Import (multi-file)
  └── Validation (type checking, corruption detection)
```

### 7. History Flow
```
User Action → Tool → Command → CommandPipeline
  ├── CommandManager.execute(cmd)
  └── HistoryManager.push(cmd)
       ├── Undo: HistoryManager.undo() → cmd.undo()
       └── Redo: HistoryManager.redo() → cmd.execute()
```

### 8. Recovery Flow
```
App Start → RecoveryManager.checkForStaleSessions()
  ├── If found → Show recovery dialog
  │     ├── Recover → restoreSession(id)
  │     └── Discard → discardSession(id)
  └── If clear → Start fresh
```

## Key Design Decisions

1. **Command Pattern**: Every user action is an undoable command
2. **Zustand over Redux**: Simpler API, less boilerplate, built-in selectors
3. **pdf-lib for export**: Full-featured PDF manipulation without heavy dependencies
4. **ContentEditable for text**: Inline text editing without a separate editor
5. **Data URLs for images**: Simplifies serialization and clipboard support

## Data Flow

```
User Interaction → Tool.onPointerDown/Move/Up
  → Tool creates Command
  → CommandPipeline.execute(cmd)
  → CommandManager.execute(cmd) → mutates editorStore
  → HistoryManager.push(cmd) → stores for undo
  → editorStore state change → React re-render
  → RenderingManager.updateObject() → DOM update
```
