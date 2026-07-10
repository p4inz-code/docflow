# Docflow V1 — Release Checklist

## Pre-Release Verification

### Build & Type Safety
- [x] TypeScript compiles with 0 errors (`tsc --noEmit`)
- [ ] Vite build succeeds (`vite build`)
- [ ] No `any` type casts in production code
- [ ] All exports are properly typed

### Testing
- [ ] All unit tests pass
- [ ] Manual smoke test of core workflows:
  - Open PDF (file picker)
  - View multi-page document
  - Navigate pages (scroll, thumbnail click)
  - Zoom in/out (Ctrl+scroll, toolbar)
  - Fit width / fit page
  - Search text (Ctrl+F)
- [ ] Workspace tests:
  - Open multiple documents
  - Switch between tabs
  - Close a tab
  - Close all tabs
  - Drag-reorder tabs
  - Ctrl+Tab / Ctrl+Shift+Tab
- [ ] Editing tests:
  - Select tool
  - Hand tool (pan)
  - Create text object
  - Create image object
  - Create shape
  - Create drawing
  - Move, resize, rotate objects
  - Copy/paste/duplicate/delete
  - Undo/redo
- [ ] Menu tests:
  - File > New, Open, Save, Save As, Close
  - Edit > Undo, Redo, Cut, Copy, Paste
  - View > Zoom, Fit, Toggle Sidebar
  - Tools > Tool switching
  - Window > Document switching
  - Help > Keyboard Shortcuts
- [ ] Dialog tests:
  - Document Properties
  - Preferences (all settings)
  - Page Manager
  - About
  - Confirm/Save Changes

### Performance
- [ ] Cold start < 3 seconds
- [ ] 100-page PDF opens in < 5 seconds
- [ ] Smooth scrolling (60fps)
- [ ] Memory usage < 500MB for typical documents
- [ ] No memory leaks after close/reopen cycle

### Cross-Platform
- [ ] Windows (Chrome, Edge)
- [ ] macOS (Safari, Chrome)
- [ ] Linux (Chrome)
- [ ] Electron (desktop app)

### Accessibility
- [ ] Keyboard navigation for all controls
- [ ] Focus indicators visible
- [ ] ARIA labels on dialogs
- [ ] High contrast mode tested
- [ ] Reduced motion mode tested

## Release Steps

1. [ ] Run full TypeScript check
2. [ ] Run full build
3. [ ] Run all tests
4. [ ] Update version number
5. [ ] Update release notes
6. [ ] Tag release in git
7. [ ] Build Electron packages (Windows, macOS, Linux)
8. [ ] Smoke test all builds
9. [ ] Publish release
