# Contributing to Docflow

> **Version:** 1.0.0-RC  

Thank you for your interest in contributing to Docflow! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

This project is committed to providing a welcoming and inclusive experience for everyone. Contributors are expected to treat each other with respect and professionalism.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **pnpm** >= 8.x (corepack enabled recommended: `corepack enable && corepack prepare pnpm@latest --activate`)
- **Git** >= 2.x

### Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/docflow.git
cd docflow

# Install dependencies
pnpm install

# Start development server
cd apps/renderer
pnpm dev
```

---

## Development Setup

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite development server (renderer) |
| `pnpm build` | Production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run oxlint |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |

### Editor Setup

Recommended VS Code extensions:

- **oxlint** (for linting)
- **Prettier** (code formatting)
- **TypeScript + TSLint** (type checking)

---

## Project Architecture

```
apps/
  renderer/          # Main Electron renderer application
    src/
      components/    # React UI components
      editor/        # Core editor engine
        commands/    # Command pattern implementations
        core/        # Core utilities (settings, accessibility)
        editing/     # Editing tools (keyboard, clipboard)
        export/      # Export/Import engines
        history/     # Undo/redo history
        interactions/# Mouse/touch interactions
        models/      # Data models
        rendering/   # Canvas rendering pipeline
        selection/   # Object selection system
        state/       # Zustand stores
        tools/       # Editing tools (10 tools)
        types/       # TypeScript types
        utils/       # Utility functions
        workspace/   # Document workspace management
      hooks/         # React hooks
      main.tsx       # Application entry point
docs/                # Documentation
packages/
  core/
    pdf-engine/      # PDF loading library
```

### Key Architecture Decisions

1. **Command Pattern**: All mutations go through `CommandPipeline` for undo/redo support
2. **Zustand State Management**: Lightweight, selector-based state with shallow equality
3. **Canvas Rendering**: PDF pages rendered to canvas via pdf.js
4. **DOM Overlays**: Edit objects rendered as positioned HTML elements on top of canvas

---

## Coding Standards

### TypeScript

- **Strict mode**: Always enabled. No `as any` casts in production code.
- **verbatimModuleSyntax**: Enabled. Use `import type` for type-only imports.
- **erasableSyntaxOnly**: Enabled. No enums — use `const` objects with `as const`.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/classes, `SCREAMING_SNAKE_CASE` for constants.

### React

- Functional components with hooks (no class components except ErrorBoundary)
- Zustand for global state (not React Context)
- `useMemo`/`useCallback` for expensive computations and stable callbacks
- No direct DOM mutations outside rendering pipeline

### CSS

- Inline styles via style objects (no CSS modules)
- Design tokens defined in constants (not magic values)
- Dark theme as default (no light theme toggle in V1)

### Code Quality

- Zero `console.*` calls in production (guarded by `process.env.NODE_ENV`)
- Zero TODO/FIXME/HACK comments
- Zero unused imports, variables, or exports
- Zero circular dependencies
- All error paths go through `GlobalErrorManager`

---

## Pull Request Process

1. **Create an issue** describing the change before starting work
2. **Fork the repository** and create a feature branch
3. **Write code** following the coding standards above
4. **Add tests** for new functionality
5. **Run validation**:
   ```bash
   pnpm typecheck  # Must pass with zero errors
   pnpm lint       # Must pass with zero warnings
   pnpm test       # All tests must pass
   ```
6. **Update documentation** if public APIs change
7. **Submit PR** with a clear description of changes

### PR Checklist

- [ ] TypeScript strict mode passes (zero errors)
- [ ] Build succeeds
- [ ] Existing tests pass
- [ ] New tests added (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] No `console.*` in production code
- [ ] No `as any` casts
- [ ] No unused imports/variables
- [ ] No TODO/FIXME/HACK comments

---

## Testing

### Test Types

| Type | Location | Runner |
|------|----------|--------|
| Unit tests | `__tests__/` alongside source | Vitest |
| Integration | Manual (Electron environment) | N/A |
| Type checking | N/A | `tsc --noEmit` |

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- ExportEngine

# Watch mode
pnpm test -- --watch
```

---

## Documentation

All documentation lives in the `docs/` directory.

| Document | Purpose |
|----------|---------|
| ARCHITECTURE_OVERVIEW.md | High-level architecture and data flow |
| ENGINEERING_DECISIONS.md | Key architectural decisions and rationale |
| COMMAND_SYSTEM.md | Command pattern documentation |
| MENU_SYSTEM.md | Menu and keyboard shortcut system |
| WORKSPACE_ARCHITECTURE.md | Workspace and tab management |
| DOCUMENT_LIFECYCLE.md | Document open/save/close lifecycle |
| TEST_PLAN.md | Test strategy and coverage |
| RELEASE_CHECKLIST.md | Pre-release validation steps |
| QA_REPORT.md | Quality assurance report |
| PERFORMANCE_REPORT.md | Performance benchmarks |
| SECURITY_REVIEW.md | Security analysis |
| CONTRIBUTING.md | This file |

---

*Thank you for contributing to Docflow!*
