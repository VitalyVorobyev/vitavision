# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Working Principles

**Never guess — verify.** Every conclusion about external interfaces, config schemas, API contracts, or runtime behavior must be backed by reproducible evidence: read the source, call the function, run a test, or inspect actual output. When a WASM package or library expects a certain JSON shape, call its default/example functions and read the result — do not infer the schema from variable names or documentation that may be outdated.

**Write tests that prove correctness.** For any integration with external packages (WASM, npm, APIs), write executable tests that call the real code with the real config shapes. Mock-only tests do not catch schema mismatches. Use `bun run scripts/test-wasm-schemas.ts` to validate WASM config schemas end-to-end.

**When uncertain, stop and ask.** If the correct approach is ambiguous, the requirements are unclear, or you are about to make an assumption that could be wrong — ask the user before proceeding. A question costs seconds; a wrong assumption costs hours of debugging. This applies especially to: external API/package contracts, UI/UX design choices, architectural trade-offs, and anything where multiple valid approaches exist.

## Development Workflow

**All work is tracked through the backlog at `docs/backlog.md`.** Before starting any task:

1. Check whether it already exists in the backlog. If not, add it.
2. Run `/implement <backlog-id>` to execute the full Architect → Implementer → Reviewer → commit pipeline.
3. Mark the task `done` in `docs/backlog.md` once merged.

Backlog IDs follow the pattern `CV-NNN`, `EDITOR-NNN`, `DEV-NNN`, `DOCS-NNN`, `TEST-NNN`, etc.
Handoff reports live in `docs/handoffs/<task-id>/` (separate files per role).
Full handoff process is documented in `docs/handoffs.md`.

For local dev setup see `README.dev.md`.

## Commands

```bash
bun run dev       # Dev server at http://localhost:5173
bun run build     # Type-check + Vite production build
bun run lint      # ESLint
```

### Verification Checklist
After any code change, run **all** of the following before committing:
1. `bun run build` — type-check + production build
2. `bun run lint` — ESLint
3. `npx vitest run` — unit tests
4. `bun run scripts/test-wasm-schemas.ts` — WASM integration tests (when touching algorithm configs)

## Architecture Overview

Static computer vision web app: image annotation editor + WASM algorithm runner. **No backend** — all processing is client-side.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand (`src/store/editor/useEditorStore.ts`)
- **Canvas**: react-konva
- **CV Processing**: WASM npm packages executed in Web Workers
- **Hosting**: Cloudflare Pages (static)

### Frontend Routes
- `/` — Home
- `/blog`, `/blog/:slug` — Blog
- `/editor` — Main image editor

### Editor Layout (`src/pages/Editor.tsx`)
Two modes via `galleryMode` in the Zustand store:
1. **Gallery mode** — `EditorGallery` for browsing/uploading images
2. **Editor mode** — three-panel layout:
   - Left: tool palette, zoom, import/export JSON
   - Center: `CanvasWorkspace` (react-konva, pan/zoom); `FeatureLayer` renders features; `HeatmapLayer` renders FRST heatmap overlay
   - Right: `EditorRightPanel` — scrollable guided rail (hint → algorithm → config → run/summary → features)

### Feature Model
Every drawn or detected item is a `Feature` union type with a `source` field (`'manual'` | `'algorithm'`). Algorithm features are `readonly: true` and tagged with `algorithmId` + `runId`. Use `replaceAlgorithmFeatures(algorithmId, features)` to swap a run's results without touching manual features.

### Algorithm Plugin System
All algorithms run client-side via WASM (`executionModes: ["wasm"]`). Add a new CV algorithm by:
1. Creating `src/components/editor/algorithms/<name>/adapter.ts` implementing `AlgorithmDefinition`:
   - `runWasm({ pixels, width, height, config })` → calls WASM via `src/lib/wasm/wasmWorkerProxy.ts`
   - `toFeatures(result, runId)` → converts result to `Feature[]`
   - `summary(result)` → label/value pairs for the run summary UI
   - `ConfigComponent` → React form for the algorithm's config
2. Registering in `src/components/editor/algorithms/registry.ts`
3. Adding WASM handler in `src/lib/wasm/wasmWorker.ts` — **always start from WASM module defaults and deep-merge user overrides** to avoid missing required fields.

Currently registered: `chess-corners`, `chessboard`, `charuco`, `markerboard`, `ringgrid`, `radsym`.

WASM config schema validation: run `bun run scripts/test-wasm-schemas.ts` to verify config shapes are accepted by real WASM modules.

### WASM Execution Architecture
- **Worker proxy** (`src/lib/wasm/wasmWorkerProxy.ts`): Main-thread typed API, lazy Worker spawn, zero-copy pixel transfer via `Transferable`
- **Web Worker** (`src/lib/wasm/wasmWorker.ts`): Lazy-loads WASM modules, runs detection handlers, returns results via `postMessage`
- **WASM packages**: `chess-corners-wasm`, `calib-targets-wasm`, `@vitavision/ringgrid`, `@vitavision/radsym`

### Type Definitions
Shared result/config types live in `src/lib/types.ts`. These describe WASM detection result shapes consumed by adapters, overlays, and UI components.

### Security Model

#### Frontend Headers
- **Cloudflare Pages** (`public/_headers`): HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, full CSP with script SHA-256 hash, `frame-ancestors 'none'`, `wasm-unsafe-eval`
- **Dev CSP** (`vite.config.ts`): relaxes CSP for WASM and Web Workers in dev mode only

#### Client-Side Safety
- Image pixel-count limit: `WASM_MAX_PIXELS=20_000_000` in `useAlgorithmRunner.ts`
- WASM runs in Web Workers (off main thread, no DOM access)
- No shared memory — pixel buffers transferred via `Transferable`
