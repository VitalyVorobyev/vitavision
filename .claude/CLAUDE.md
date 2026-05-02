# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Working Principles

**Never guess — verify.** Every conclusion about external interfaces, config schemas, API contracts, or runtime behavior must be backed by reproducible evidence: read the source, call the function, run a test, or inspect actual output. When a WASM package or library expects a certain JSON shape, call its default/example functions and read the result — do not infer the schema from variable names or documentation that may be outdated.

**Write tests that prove correctness.** For any integration with external packages (WASM, npm, APIs), write executable tests that call the real code with the real config shapes. Mock-only tests do not catch schema mismatches. Use `bun run scripts/test-wasm-schemas.ts` to validate WASM config schemas end-to-end.

**When uncertain, stop and ask.** If the correct approach is ambiguous, the requirements are unclear, or you are about to make an assumption that could be wrong — ask the user before proceeding. A question costs seconds; a wrong assumption costs hours of debugging. This applies especially to: external API/package contracts, UI/UX design choices, architectural trade-offs, and anything where multiple valid approaches exist.

## Development Workflow

Work is driven from approved plan files (typically under `~/.claude/plans/`) — not from a tracked backlog.

The main agent (Opus) acts as architect + reviewer. Implementation is delegated to a Sonnet subagent per discrete task.

For any substantive change:
1. **Scope** a discrete task — one focused change, verifiable in isolation, with clear file targets.
2. **Delegate** implementation to a Sonnet subagent via the Agent tool (`subagent_type: "general-purpose"`, `model: "sonnet"`). The prompt must be self-contained and include: goal, files to touch, reused utilities in the codebase, verification steps, explicit don'ts.
3. **Review** the returned diff: run the verification checklist below; inspect for quality issues (dead code, scope creep, missing edge cases, missed reuse). Fix small issues directly; delegate a second pass for larger ones.
4. **Commit** only after review passes.

See the `impl` skill (`.claude/skills/impl/SKILL.md`) for the delegation template.

Trivial edits (typos, one-line fixes, single-file renames) may be done directly by the main agent without delegation.

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

### Secrets & Credentials

`.env.local` holds runtime secrets. It is gitignored (`*.local` in `.gitignore`) and **must never be committed**. Bun auto-loads it for scripts; Vite exposes only `VITE_*` vars to the browser bundle.

Currently present:

- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk dev publishable key (safe in client bundle).
- `OPENALEX_EMAIL` — contact email for the OpenAlex polite pool; used by `bun papers:fetch-meta` (`scripts/papers-fetch-meta.ts`) to raise rate limits.
- `OPENALEX_API_KEY` — OpenAlex premium API key; appended as `?api_key=…` by `withAuth()` in `scripts/papers-fetch-meta.ts` when set. Leave unset on the free tier.

`.env.example` holds the shape and short explanations — keep it in sync when a new variable is introduced, but never paste a real secret there.

## Atlas authoring policy

The site's algorithm/model/concept pages form a connected practical CV atlas. When authoring or editing content, follow these rules:

### Single global slug namespace
All relationship fields (`prerequisites`, `related`, `comparedWith`, `failureModes`, `relatedAlgorithms`) use a single slug namespace covering algorithms (`content/algorithms/`), models (`content/models/`), and concepts (`content/concepts/`). Unknown slugs are hard build errors. Verify slugs exist on disk before adding them.

### Authored vs derived edges
Authors write only forward edges. The build emits `src/generated/content-graph.ts` with derived reverse edges (`usedBy`, `comparedFrom`, `relatedFrom`, `affects`). **Never** add `usedBy: [...]` or similar reverse fields manually — they will be ignored at best and confusing at worst.

For symmetric relations (`comparedWith`, `related`), author on one side only. The graph mirrors them.

### When a topic deserves its own page
- **Concept page**: only when referenced by 3+ algorithm/model pages AND can support ≥500 words of substantive standalone content (definition, math, numerical concerns, implementation implications).
- **Failure-mode page**: same criterion (3+ references, ≥500 words). Failure-mode authoring is deferred until natural candidates accumulate.
- **Pairwise comparison page**: prohibited. Use `comparedWith:` field + an inline `## When to choose X over Y` section inside the more authoritative page. The non-host page carries a single Remarks bullet linking to the comparison anchor — never duplicate the prose.
- **Survey concept page** (3+ methods): a concept page (`content/concepts/<survey-slug>.md`), not an algorithm page. Required: ≥3 surveyed methods, ≥800 words, decision table near the top, every surveyed algorithm page lists the survey concept in its `related`. Author only when ≥3 of the surveyed papers have research notes.

### Comparison authoring discipline
- **More-authoritative tiebreaker** for which page hosts the `## When to choose X over Y` section: (1) older paper hosts; (2) same year → more general scope hosts; (3) tied → author judgment with reason recorded in the commit message. No "more cited" rule.
- **Both research notes required.** Comparison content can be written agentically only when `docs/research/notes/<both-paper-ids>.md` both exist. If either is missing, the page-authoring skill must refuse and request `paper-ingest` first. This is enforceable via filesystem check; without it, comparison prose is hallucination.
- See `docs/README.md` §4 for the full convention with worked examples.

### Quality field
- Omitted = normal published page (default).
- `quality: "stub"` = public placeholder; reader-visible warning badge.
- `quality: "canonical"` = flagship reviewed page; reader-visible badge; passes stricter validation (sources, prerequisites, no TODO).

`draft: true` remains the publication gate. Do not introduce `status:` or `review:` fields.

### Sources
Source IDs in `sources.primary` and `sources.references` must exist in `docs/papers/index.yaml`. Do not invent paper IDs. Concept pages may omit `sources:` if no canonical paper exists.

### Validation
Run `bun run scripts/validate-content.ts` before opening a PR. The build runs the same validation and will fail on broken slugs, prerequisite cycles, missing source IDs, or canonical-quality violations.

### Research notes (unpublished reasoning substrate)

Notes live at `docs/research/notes/<paper-id>.md`, where `<paper-id>`
matches an entry in `docs/papers/index.yaml`. They are reasoning material for
Claude — committed to the public GitHub repo for reproducibility, but never
deployed to the site, never indexed, never imported from `src/**`.

**Authoring rule:** write every research note as if a peer reviewer or paper
author might read it tomorrow. No surprise-attributable critical takes, no
sensitive third-party material. Personal opinion lives in `content/blog/`.

Discovery: any public page's frontmatter `sources.primary` and
`sources.references` are paper IDs; the corresponding research note (if
written) is at the matching path. When reasoning about an algorithm, model,
or concept, read both the public page and any research notes for its cited
papers.

Use `paper-ingest` to create a research note from a paper. Use `algo-page`,
`deep-model-page`, or `concept-page` to apply a note's "Atlas update plan"
section to public pages — never publish from a raw LLM summary.

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

Currently registered: `chess-corners`, `chessboard`, `charuco`, `markerboard`, `ringgrid`, `radsym`, `puzzleboard`.

WASM config schema validation: run `bun run scripts/test-wasm-schemas.ts` to verify config shapes are accepted by real WASM modules.

### WASM Execution Architecture
- **Worker proxy** (`src/lib/wasm/wasmWorkerProxy.ts`): Main-thread typed API, lazy Worker spawn, zero-copy pixel transfer via `Transferable`
- **Web Worker** (`src/lib/wasm/wasmWorker.ts`): Lazy-loads WASM modules, runs detection handlers, returns results via `postMessage`
- **WASM packages**: `@vitavision/chess-corners`, `@vitavision/calib-targets`, `@vitavision/ringgrid`, `@vitavision/radsym`

### Type Definitions
Shared result/config types live in `src/lib/types.ts`. These describe WASM detection result shapes consumed by adapters, overlays, and UI components.

### Security Model

#### Frontend Headers
- **Cloudflare Pages** (`public/_headers`): HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, full CSP with script SHA-256 hash, `frame-ancestors 'none'`, `wasm-unsafe-eval`
- **Dev CSP**: the `<meta>` CSP in `index.html` already includes `wasm-unsafe-eval` and `worker-src 'self' blob:`, so no additional dev-only plugin is needed in `vite.config.ts`.

#### Client-Side Safety
- Image pixel-count limit: `WASM_MAX_PIXELS=20_000_000` in `useAlgorithmRunner.ts`
- WASM runs in Web Workers (off main thread, no DOM access)
- No shared memory — pixel buffers transferred via `Transferable`
