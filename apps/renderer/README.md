# Docflow — Renderer (Web App)

This is the web renderer for **Docflow**, a professional PDF editing workspace. It builds with Vite + React 19 and runs in any modern browser or as an Electron desktop app.

## Quick Start

```bash
# From the repository root:
pnpm install
cd apps/renderer
pnpm dev
```

Open http://localhost:5173 in your browser. Drop a PDF to get started.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check and production build |
| `pnpm test` | Run vitest unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run oxlint |

## Project Structure

```
apps/renderer/src/
  components/       # React UI components
  editor/           # Full editing engine (commands, tools, rendering, etc.)
  hooks/            # React hooks (usePDF)
  index.css         # Global styles
  main.tsx          # Application entry point
  App.tsx           # Root component
```

See the [root README](../../README.md) for full documentation.
