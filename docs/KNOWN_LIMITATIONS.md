# Docflow — Known Limitations (V1)

## General

1. **Browser file system**: Docflow runs in a browser/sandboxed Electron environment. Direct filesystem access (save to arbitrary paths, open recent files from disk) is limited. Full filesystem integration requires native Electron dialogs and fs module.

2. **PDF Export**: The ExportEngine architecture is complete but actual PDF flattening of overlay objects (text, images, shapes) into the PDF is not yet fully implemented. The pdf-lib integration for overlay flattening needs completion.

3. **Undo/Redo for overlay operations**: The command pipeline and history manager are wired up, but some editing tool interactions don't yet go through the CommandPipeline — they modify the editor store directly. This means not all edits are undoable.

4. **Print**: `window.print()` is called but PDF pages aren't formatted for printing. A proper print layout is needed.

## Workspace

5. **Session restoration**: Workspace session is saved to localStorage but restoration on startup is limited — the file picker can't re-open files from paths in the browser context. Full restoration requires Electron's file system access.

6. **Drag-and-drop tab reorder**: Works within the tab bar but visual indicators (drop zone highlighting) are minimal. No animation for tab reordering.

7. **Ctrl+Tab cycling**: Tab cycling works but there's no visual tab switcher overlay (like VS Code's Ctrl+Tab dialog).

## Dialogs

8. **Preferences dialog**: Reads/writes all settings but some settings (theme, uiScale) don't yet apply changes reactively to the UI.

9. **Export dialog**: Not yet implemented. Export currently uses default settings only.

## Performance

10. **PDF rendering**: All pages are rendered upfront. For very large documents (100+ pages), this causes a delay on open. Virtual rendering (render only visible pages) is configured but not fully optimized.

11. **Thumbnail caching**: Thumbnails are cached as data URLs in memory. For large documents, this can consume significant memory. A limit or LRU eviction is needed.

12. **Canvas cleanup**: When closing documents, canvas elements and their associated rendering contexts should be more aggressively cleaned up to prevent memory leaks.

## Accessibility

13. **ARIA labels**: Many interactive elements lack proper ARIA labels and roles. Screen reader support is minimal.

14. **Keyboard navigation**: Tab navigation through all controls is not fully tested. Focus management in dialogs works but could be improved.

## Electron

15. **Window management**: Minimize, maximize, and close window menu items are placeholders. They need Electron IPC integration.

16. **Native menus**: The application uses custom HTML menus rather than Electron's native Menu API. This limits OS integration (e.g., macOS menu bar).

## Future V2

- Full undo/redo for all editing operations
- PDF overlay flattening (text, images, shapes into PDF)
- Native file dialogs for save/open
- Multi-page PDF manipulation (insert/delete/reorder pages via pdf-lib)
- Print layout
- Cloud storage integration
- Collaboration support
- Plugin system
