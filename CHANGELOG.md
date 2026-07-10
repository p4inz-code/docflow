# Changelog

## [1.0.0-rc.1] — 2026-07-10

### Added
- Complete PDF viewing and editing engine
- Multi-document workspace with tabs
- 10 editing tools: Select, Hand, Text, Image, Shape, Draw, Highlight, Signature, Stamp, Erase
- Full undo/redo via CommandPipeline architecture
- PDF export with overlay flattening (PDF, PNG, JPEG)
- Image import via drag-and-drop and clipboard paste
- Document search with case sensitivity and whole-word options
- Command palette (Ctrl+Shift+P)
- Keyboard shortcuts for all tools and actions
- Inspector panel for object property editing
- Page thumbnail sidebar with navigation
- Autosave with configurable interval
- Workspace session persistence and restore
- Recent files tracking
- Error boundary with graceful degradation
- Structured error handling via GlobalErrorManager
- Dark theme UI

### Technical
- Strict TypeScript with zero errors
- Zustand state management with selector-based subscriptions
- Canvas-based PDF rendering via pdf.js
- DOM overlay system for edit objects
- Export engine with pdf-lib integration
- Vite build system with React + TypeScript
- Full accessibility (ARIA) on 7 major components
- Production-guarded console output
- Zero `as any` casts in production code
- Comprehensive documentation (architecture, QA, performance, security)

### Known Limitations
- MenuBar and InspectorPanel lack full ARIA support
- No per-subsystem ErrorBoundary boundaries (global only)
- No unit tests beyond ExportEngine
- Chunk size exceeds 500kB (pdf.js worker)
- No Electron desktop shell integration in this release
