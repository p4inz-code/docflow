# Docflow — Engineering Decisions

## 1. Zustand Over Redux

**Decision**: Use Zustand for state management instead of Redux or Context API.

**Rationale**:
- Minimal boilerplate — no action creators, reducers, or dispatch
- Direct store access outside React (`useEditorStore.getState()`) makes it easy to read/write state from non-React code (event handlers, command pipeline)
- Built-in subscription model with fine-grained selectors prevents unnecessary re-renders
- Simple API — `create()` with a single function
- No provider wrapping needed at the app root

**Trade-off**: Loses Redux DevTools middleware. We use a custom `incrementHistoryVersion()` mechanism for reactive undo/redo buttons instead.

## 2. Command Pattern for Undo/Redo

**Decision**: Implement the GoF Command pattern for all undoable operations.

**Rationale**:
- Every user action becomes an object that knows how to execute and undo itself
- Commands can be serialized for future collaborative editing
- Support for command merging during drag operations (consecutive MoveObject commands coalesce)
- Clean separation between execution logic (commands) and state management (store)

**Trade-off**: More initial code than a simpler memento-based approach. But commands are more flexible for future features like macros and collaboration.

## 3. Direct DOM Manipulation for PDF Rendering

**Decision**: Render PDF pages directly to canvas elements via pdfjs-dist, bypassing React's virtual DOM for the page content.

**Rationale**:
- pdfjs-dist renders to canvas natively — React can't virtualize canvas rendering
- Direct DOM access for page wrappers allows efficient page-level operations (rotation, visibility)
- Performance: thousands of canvas pixels don't need to go through React's reconciliation

**Trade-off**: Some manual DOM management (cleanup, event handlers) that React would normally handle. We use `useEffect` cleanup functions to manage this.

## 4. Singleton Managers

**Decision**: Export singleton instances of core managers (commandPipeline, workspaceManager, clipboardManager, keyboardShortcuts).

**Rationale**:
- These are application-level services with a single instance
- Singletons allow non-React code (event handlers, command callbacks) to access services without dependency injection
- Simplifies the mental model — there's only one command pipeline, one workspace manager

**Trade-off**: Harder to test than dependency-injected services. In tests, we can reset singleton state through exposed methods.

## 5. Custom Menu Bar vs Native Electron Menu

**Decision**: Implement menus as custom HTML/React components rather than using Electron's native Menu API.

**Rationale**:
- Works identically in browser and Electron modes
- Full control over styling (dark theme, animations, custom layouts)
- No IPC communication needed for menu actions
- Easier to develop and debug (works in browser dev tools)

**Trade-off**: Loses OS-level integration (macOS menu bar, system shortcuts, screen reader integration). Future V2 may add native menu support alongside the custom menus.

## 6. WorkspaceStore + EditorStore Separation

**Decision**: Maintain two separate Zustand stores — WorkspaceStore for document-level state and EditorStore for editing-level state.

**Rationale**:
- Clear separation of concerns: workspace manages tabs/documents, editor manages tools/selection/objects
- Editor state is reset when switching documents (each document gets its own editor state)
- Workspace state persists independently of editor state
- Components that only care about tabs don't re-render on editing changes

**Trade-off**: More boilerplate for cross-store synchronization (dirty state, active page). We use explicit `switchToDocument()` logic to sync between stores.

## 7. Overlay Rendering Separate from PDF

**Decision**: Render editable overlays (text, shapes, images) in a separate layer on top of the PDF canvas rather than flattening them into the PDF at render time.

**Rationale**:
- Overlays remain editable and selectable
- No need to re-render the PDF when overlays change
- Overlays can be independently styled, animated, and transformed
- Flattening only happens during export/save

**Trade-off**: Two-pass rendering (PDF + overlays). Coordination needed for transformations (zoom, pan, scroll) across both layers.

## 8. localStorage for Persistence

**Decision**: Use localStorage for settings, recent files, and workspace session persistence instead of IndexedDB or a backend.

**Rationale**:
- Simple synchronous API
- Sufficient for the data volume (settings object, file path list)
- No async complexity for simple key-value storage
- Works in both browser and Electron contexts

**Trade-off**: Limited storage (5-10MB). Not suitable for storing actual PDF data or large editing histories. Future versions may use IndexedDB for larger state.
