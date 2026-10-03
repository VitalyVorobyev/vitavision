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
bun run test:screens                   # screenshots of the main routes (after a build)
```

`test:screens` serves `dist/` with `vite preview` and captures seventeen main routes in
light and dark. Its baseline (`e2e/.screens/`) is local and uncommitted: capture it with
`--update-snapshots` before a change such as a dependency upgrade, and compare after it
on the same machine. It is not a CI gate.

The toolchain follows the shared vitavision baseline: compiler options from
`@vitavision/config-ts` and lint from `@vitavision/config-eslint` (type-aware), with no
exceptions: `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on. Index
reads are narrowed rather than asserted where it reads naturally; a `!` is reserved for
an access whose bound is visible right there (a loop bound, a length check, a fixed-size
buffer). An optional prop that callers legitimately pass `undefined` to is declared
`prop?: T | undefined`.

---

## Styling and theme

The site is styled with Tailwind v4 (through `@tailwindcss/postcss`) on the tokens of
[`@vitavision/ui`](https://github.com/VitalyVorobyev/lab-ui/tree/main/packages/ui), the
shared vitavision design system (lab-ui PLAN L3-3):

- **Tokens.** `src/index.css` imports `@vitavision/ui/styles.css`: `ground`, `surface`,
  `raised`, `overlay`, `line`, `line-strong`, `fg`, `fg-muted`, `fg-subtle`, `signal`
  (the one accent), the verdicts `normal` / `defect` / `warn`, and the radii
  `rounded-control` / `rounded-panel`. Use the utilities (`bg-surface`, `text-fg-muted`)
  or `var(--surface)`; never a hex or HSL literal in a component.
- **Editorial token layer.** `src/styles/editorial-tokens.css` holds only what ui has no
  name for: the article reading colours (`--article-body`, `--article-heading`,
  `--article-link`), the Atlas graph and paper-lineage category palettes (`--graph-*`,
  `--lineage-*`), the article block and inline-colour palettes used by
  `src/styles/article.css` (`--vv-*`), and the logo's cyan pupil (`--vv-brand-mark`).
  Chrome there is written in ui tokens; category colours are literals, held at 4.5:1 as
  text in both themes.
- **Type.** IBM Plex Sans and Plex Mono from `@vitavision/ui/fonts.css` (imported in
  `main.tsx`: see the comment there for why not in `index.css`); Source Serif 4
  (`font-serif`) for editorial body text only. Prose keeps Source Serif's own figures
  (`.prose, .font-serif` reset ui's `tabular-nums`).
- **Theme.** ui's controller, under the storage key `"theme"` (`src/lib/theme.ts`):
  `light`, `dark` or `system` (the default, following the OS). The inline script in
  `index.html` paints the `dark` class and the favicon before the first paint;
  `main.tsx` calls `initTheme`; the Navbar renders ui's `ThemeToggle`. Read the painted
  theme with `useIsDark()`, never from storage. ui's `ThemeToggle`, `Tooltip` and
  `InfoHint` need a `TooltipProvider` above them: the app root, the prerender tree in
  `entry-server.tsx` and each article-illustration island have one.
- **Controls.** Everything interactive (the editor, the target generator, the article
  illustrations) is built from ui's components: `Button`, `Field` with `NumberInput`,
  `Select`, `SegmentedControl`, `Checkbox`, `Switch`, `Slider`, `ToggleChip`, `Section`,
  `Disclosure`, `Panel`, `Dialog`, `Callout`, `Tooltip` and `InfoHint`. The seams to the
  typed configs are in `src/lib/fieldBindings.ts`: `numberInputProps` (text ↔ an optional
  number), `choiceProps` (a string union ↔ ui's string options) and `fieldGridClass`. A
  field with a help mark is a `Field as="group"` with an `InfoHint` annotation and an
  `aria-label` on its control: a button must not sit inside the field's `<label>`. The
  editor rail and the target generator's side panel are `DensityProvider value="compact"`;
  touch layouts keep the comfortable density. Editorial pages keep their own markup
  (visual-language §7).
- **Tokens only (G5.1).** `eslint.config.js` runs `tokensOnly(["src/**"])`: no raw
  Tailwind palette class, no hex literal. Konva and Canvas 2D cannot resolve `var(--x)`,
  so canvas code takes resolved colours from `useCanvasTokens()` in
  `src/lib/canvasTokens.ts` (re-read on a theme change; `"well"` resolves them as in the
  always-dark image well the editor overlays are drawn in). Colours that are data sit in
  a few allowlisted modules, each exempted in `eslint.config.js` with its reason:
  `src/store/editor/featureColors.ts`, `src/components/targetgen/printColors.ts`,
  `src/components/illustrations/_shared/dataColors.ts` (and Shiki's output in
  `src/generated/`).
- **Toasts.** ui's `toast({ title, tone })` raises one from anywhere; a single `<Toaster />`
  is mounted in `App.tsx`.
- **CSP.** The inline theme script is allowed by its sha256 in the CSP of `index.html`
  and `public/_headers`. Any edit to the script's text changes the hash: recompute it
  from the built page (`dist/index.html`) and update both.

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
| `@vitavision/chess-corners` | ChESS X-junction keypoints |
| `@vitavision/calib-targets` | Chessboard, ChArUco, Marker Board |
| `@vitavision/ringgrid` | Concentric ring markers |
| `@vitavision/radsym` | Fast Radial Symmetry Transform |
