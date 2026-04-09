# Vitavision — Developer Guide

Static computer vision web app. All processing runs client-side via WASM — no backend.

---

## Local Development

### Prerequisites

| Tool | Install |
|------|---------|
| Bun | `curl -fsSL https://bun.sh/install \| bash` |

### Setup

```bash
bun install
bun run dev
```

Open `http://localhost:5173/editor`, upload an image or pick a sample, choose an algorithm, and run it.

---

## Tests & Quality Gates

```bash
bun run build                          # Type-check + Vite production build
bun run lint                           # ESLint
npx vitest run                         # Unit tests
bun run scripts/test-wasm-schemas.ts   # WASM integration tests
```

---

## Deployment

The frontend is deployed as a static site on **Cloudflare Pages**. Every merge to `main` triggers CI:

1. **`validate-content`** — frontmatter, images, links
2. **`build-frontend`** — lint + type-check + Vite build

Security headers are configured in `public/_headers` (CSP, HSTS, etc.).

---

## Architecture

```
src/
  lib/
    types.ts                 # Shared result/config type definitions
    wasm/
      wasmWorker.ts          # Web Worker: loads WASM, runs detection
      wasmWorkerProxy.ts     # Main-thread API: typed proxy + zero-copy transfer
      imageDecoder.ts        # Canvas-based RGBA pixel decoder
  components/editor/
    algorithms/              # Algorithm adapters, configs, overlays
    canvas/                  # Konva canvas layers (features, heatmap)
    panels/                  # Right panel (configure, results, features)
  store/editor/
    useEditorStore.ts        # Zustand store (features, zoom, algorithm state)
  pages/
    Editor.tsx               # Main editor page
```

### WASM Packages

| Package | Algorithm |
|---------|-----------|
| `chess-corners-wasm` | ChESS X-junction keypoints |
| `calib-targets-wasm` | Chessboard, ChArUco, Marker Board |
| `@vitavision/ringgrid` | Concentric ring markers |
| `@vitavision/radsym` | Fast Radial Symmetry Transform |
