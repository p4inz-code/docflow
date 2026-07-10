# Docflow Document Lifecycle

## States

A document transitions through these states:

```
                    ┌──────────┐
                    │  Closed  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
         ┌─────────│  Opening │◄──────────┐
         │         └────┬─────┘           │
         │              │                 │
    ┌────▼────┐   ┌─────▼──────┐    ┌────┴─────┐
    │  New    │   │   Open     │    │  Recent  │
    │(blank)  │   │ (from file)│    │ (session)│
    └────┬────┘   └─────┬──────┘    └──────────┘
         │              │
         └──────┬───────┘
                │
          ┌─────▼──────┐
          │   Active   │◄──────┐
          │ (viewing/  │       │
          │  editing)  │       │
          └─────┬──────┘       │
                │              │
     ┌──────────┼──────────┐   │
     │          │          │   │
┌────▼───┐ ┌────▼───┐ ┌───▼──┴───┐
│ Unsaved│ │ Saved  │ │ ReadOnly │
│ (dirty)│ │ (clean)│ │          │
└────┬───┘ └────┬───┘ └──────────┘
     │          │
     └────┬─────┘
          │
    ┌─────▼──────┐
    │   Closing  │
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │   Closed   │
    └────────────┘
```

## Lifecycle Operations

### New Document
1. Generate unique tab ID
2. Create document with `Untitled` name, null filePath
3. Reset editor store
4. Add to workspace store
5. Save session

### Open File
1. Load PDF via pdfjs-dist
2. Check for duplicate (same filePath → switch to existing tab)
3. Create document with file info
4. Sync editor store with page 1
5. Record in recent files
6. Save session

### Save
1. Mark saving state
2. Call registered save callback (or simulate for browser mode)
3. On success: clear dirty flag, update savedAt timestamp
4. Update editor store dirty state
5. Save session

### Save As
1. Trigger download/save dialog (browser) or native dialog (Electron)
2. Save to new path
3. Update filePath
4. Clear dirty flag

### Close
1. Check dirty flag
2. If dirty: show dialog (Save / Discard / Cancel)
3. If Save: save first, then close
4. Clean up PDF resources (destroy pdfjs proxy)
5. Remove from workspace store
6. Restore previous active tab
7. If no tabs remain: reset editor store
8. Save session

## Session Persistence

Workspace state is persisted to localStorage under the key `docflow_workspace_session`. The session includes:
- Open documents (filePath, name, activePage, zoomLevel)
- Active document ID
- Timestamp

Restoration happens on application startup. Files from the session are re-opened if available.

## Dirty State Synchronization

Dirty state is maintained in both:
- **WorkspaceStore** — per-document `isDirty` flag
- **EditorStore** — global `isDirty` for the active document

When switching tabs, the editor store's dirty state is synced from the workspace store's document state.
