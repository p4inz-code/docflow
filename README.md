<div align="center">
  <br />
  <h1>📄 Docflow</h1>
  <p>
    <strong>A professional PDF editing workspace for the modern web.</strong>
  </p>
  <p>
    Built with React · TypeScript · pdf.js · pdf-lib · Zustand
  </p>
  <br />

  <p>
    <a href="#features">Features</a> ·
    <a href="#quick-start">Quick Start</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#keyboard-shortcuts">Shortcuts</a> ·
    <a href="#license">License</a>
  </p>

  <br />

  <p>
    <img src="https://img.shields.io/badge/TypeScript-strict-%233178c6" alt="TypeScript Strict" />
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT" />
    <img src="https://img.shields.io/badge/platform-web%20%7C%20electron-lightgrey" alt="Platform" />
    <img src="https://img.shields.io/badge/version-1.0.0--rc.1-orange" alt="Version 1.0.0-rc.1" />
    <img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Passing" />
  </p>

  <br />
</div>

Docflow is a **feature-complete PDF editing application** that runs entirely in the browser. It provides professional-grade document viewing, annotation, and editing capabilities with a clean, dark-themed interface.

**Why Docflow?** Most PDF editors are either heavy desktop applications or limited web tools. Docflow combines the accessibility of a web app with the power of a desktop editor — all running client-side with zero server dependencies.

---

## Features

### 📖 Document Management
- Open PDF files via file picker, drag-and-drop, or recent files
- Multi-document workspace with tabbed interface
- Session persistence — automatically restore your workspace
- Autosave with configurable intervals

### ✏️ Full Editing Toolset
| Tool | Shortcut | Purpose |
|------|----------|---------|
| Select | `V` | Select, move, resize, rotate objects |
| Hand | `H` | Pan the document |
| Text | `T` | Add and edit text annotations |
| Image | `I` | Import and place images |
| Shape | `R` | Draw rectangles, ellipses, and more |
| Draw | `D` | Freehand drawing |
| Highlight | `U` | Highlight PDF content |
| Signature | `S` | Add signature stamps |
| Stamp | `P` | Add pre-built stamp annotations |
| Erase | `E` | Remove annotations |

### 🎨 Professional Editing
- Object selection, move, resize, and rotation
- Undo/redo with full command history
- Clipboard support (copy, cut, paste, duplicate)
- Layer ordering (bring to front, send to back)
- Property inspector panel
- Search within documents

### 📤 Export
- Export to PDF with overlay flattening
- Export to PNG and JPEG
- Custom page ranges
- Metadata preservation
- Compression optimization

### ⌨️ Keyboard-First
- Full keyboard shortcut system
- Command palette (Ctrl+Shift+P)
- Ctrl+Tab document switching
- Tool shortcuts (V, H, T, I, R, D, U, S, P, E)

---

## Quick Start

### Prerequisites
- **Node.js** >= 22.12.x
- **pnpm** >= 11.x (or use `corepack enable && corepack install`)

> The project includes a `packageManager` field in `package.json`. If you have [corepack](https://nodejs.org/api/corepack.html) enabled, the correct pnpm version will be selected automatically.

```bash
# Clone the repository
git clone https://github.com/your-org/docflow.git
cd docflow

# Install dependencies
cd apps/renderer
pnpm install

# Start the development server
pnpm dev
```

Open http://localhost:5173 in your browser. Drop a PDF to get started.

### Production Build

```bash
pnpm build
```

Output is in `apps/renderer/dist/`.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 19 with TypeScript |
| **Build System** | Vite 8 |
| **State Management** | Zustand 5 |
| **PDF Rendering** | pdf.js (Mozilla) |
| **PDF Generation** | pdf-lib |
| **Linting** | oxlint |

### Architecture

```
apps/renderer/src/
  components/       # React UI components
  editor/
    commands/       # Command pattern (undo/redo)
    core/           # Settings, accessibility, error handling
    editing/        # Keyboard, clipboard, text editing
    export/         # Export/import engines
    history/        # Undo/redo history
    rendering/      # Canvas + overlay rendering pipeline
    state/          # Zustand stores
    tools/          # 10 editing tools
    workspace/      # Multi-doc workspace management
  hooks/            # React hooks
```

**Design Philosophy:**
- All mutations go through the **CommandPipeline** for full undo/redo
- **Zustand** selectors with shallow equality for minimal re-renders
- **Canvas** for PDF page rendering, **DOM** for overlay annotations
- All errors route through **GlobalErrorManager** for structured handling

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New document |
| `Ctrl+O` | Open file |
| `Ctrl+W` | Close tab |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+X` | Copy / Paste / Cut |
| `Ctrl+D` | Duplicate |
| `Del` | Delete |
| `Ctrl+A` | Select all |
| `Ctrl+F` | Search |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+I` | Toggle inspector |
| `Ctrl++` / `Ctrl+-` | Zoom in / out |
| `Ctrl+0` | Reset zoom |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Cycle tabs |
| `Esc` | Deselect / close dialogs |

---

## Project Status

Docflow is at **v1.0.0-rc.1** (Release Candidate). The application is feature-complete and production-hardened:

- ✅ Zero TypeScript errors (strict mode)
- ✅ Zero `as any` casts in production code
- ✅ All console output production-guarded
- ✅ Comprehensive ARIA accessibility
- ✅ Structured error handling
- ✅ Production build succeeds
- ⚠️ Awaiting community testing before v1.0.0 stable

### Known Limitations
- Electron desktop shell not yet integrated
- No per-subsystem error boundaries (global only)
- Limited unit test coverage
- Bundle size exceeds 500kB (pdf.js worker)
- Some components lack full ARIA support

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md) | High-level architecture and data flow |
| [QA Report](docs/QA_REPORT.md) | Test coverage, known issues, stress tests |
| [Performance Report](docs/PERFORMANCE_REPORT.md) | Rendering, memory, and bundle analysis |
| [Security Review](docs/SECURITY_REVIEW.md) | Threat model, risk assessment, audit |
| [Contributing Guide](docs/CONTRIBUTING.md) | Setup, coding standards, PR process |
| [Engineering Audit](docs/FINAL_ENGINEERING_AUDIT.md) | Final release certification report |

---

## Contributing

Contributions are welcome! Please see the [Contributing Guide](docs/CONTRIBUTING.md) for details.

Before submitting a PR:
1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm build` — must succeed
3. Ensure no `console.*` in production code

---

## License

MIT © 2026 Docflow. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for the open-source community</sub>
</div>
