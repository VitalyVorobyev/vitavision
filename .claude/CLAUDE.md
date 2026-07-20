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
All relationship fields (`prerequisites`, `failureModes`, `relations[].target`) use a single slug namespace covering algorithms (`content/algorithms/`), models (`content/models/`), and concepts (`content/concepts/`). Unknown slugs are hard build errors. Verify slugs exist on disk before adding them.

### Authored vs derived edges
Authors write only forward edges. The build emits `src/generated/content-graph.ts` with derived reverse edges (`usedBy`, `affects`, `generalises`, `extending`, `fedBy`, `hasLearnedAlternative`). **Never** add a reverse field manually — the build computes them from forward `relations[]`.

For symmetric relation types (`compared_with`, `alternative_formulation_of`, `parallel_foundation_with`), author on one side only. The build mirrors them onto the target's forward edges so both pages render the same relation.

### When a topic deserves its own page
- **Concept page**: when the topic is a genuinely fundamental, cross-cutting CV concept that can support ≥500 words of substantive standalone content (definition, math, numerical concerns, implementation implications). The number of pages referencing the concept is **not** a gate — fundamental concepts get a page even before their dependents are written. Source-diversity still applies: a concept must synthesise ≥3 distinct sources (see the `concept-page` skill).
- **Failure-mode page**: only when referenced by 3+ algorithm/model pages AND can support ≥500 words. Failure-mode authoring is deferred until natural candidates accumulate.
- **Pairwise comparison page**: prohibited. Use `relations[type=compared_with]` + an inline `## When to choose X over Y` section inside the more authoritative page. The non-host page carries a single Remarks bullet linking to the comparison anchor — never duplicate the prose. When the relationship is supersession, alternative formulation, parallel foundation, extension, pipeline, or cross-paradigm rather than peer practitioner-choice, pick the appropriate `type` from the Relations field vocabulary below.
- **Survey concept page** (3+ methods): a concept page (`content/concepts/<survey-slug>.md`), not an algorithm page. Required: ≥3 surveyed methods, ≥800 words, decision table near the top, every surveyed algorithm page lists the survey concept in its `prerequisites`. Author only when ≥3 of the surveyed papers have research notes.

### Comparison authoring discipline
- **More-authoritative tiebreaker** for which page hosts the `## When to choose X over Y` section: (1) older paper hosts; (2) same year → more general scope hosts; (3) tied → author judgment with reason recorded in the commit message. No "more cited" rule. The tiebreaker applies only to **peer** comparisons; it does not apply when one method supersedes the other (see Rule A).
- **Both research notes required.** Comparison content can be written agentically only when `docs/research/notes/<both-paper-ids>.md` both exist. If either is missing, the page-authoring skill must refuse and request `paper-ingest` first. This is enforceable via filesystem check; without it, comparison prose is hallucination.
- **Rule A — supersession is not comparison.** When method B is a same-domain generalisation of method A (B recovers everything A recovers, plus strictly more, in the same problem class), do not use `compared_with`. Use `generalized_by` instead. The strong form — A is preserved only for citation lineage and B is the practical replacement — sets `quality: "historical"` on A AND adds `{ type: generalized_by, target: B, confidence: high }`. The weaker form (B generalises A but A retains practical relevance, e.g. as a faster baseline) keeps `quality:` omitted and uses `confidence: medium` plus a `caution:` note. Worked example: Tsai 1987 → Zhang 2000 — Zhang's planar method recovers everything Tsai recovers from a precision 3D fixture, plus the image-scale factor $s_x$ from $\geq 3$ planar views; Tsai is preserved as `quality: "historical"` with `generalized_by`/high to `zhang-planar-calibration`.
- **Rule B — cross-domain methods are not comparable.** If methods A and B address different problem classes, do not link them. The reader interprets a `relations[]` entry as a meaningful relationship within a shared problem; cross-domain pairings are misleading. Omit the link entirely. Worked example: Tsai 1987 (frontal-sensor calibration) vs Kumar gRAC (tilted-optics calibration) — same RAC family but different problem; no relation type applies.
- **Rule C — pick the right `relations[].type`.** When two methods are both alive but differ in formulation, use `alternative_formulation_of` (Daniilidis dual-quaternion ↔ Tsai-Lenz hand-eye). When two methods are concurrent peers, use `parallel_foundation_with` (Sturm-Maybank ↔ Zhang). When the target paper extends this one without replacing it, use `extended_by` (FRST → RSD). When method B was conceived building on method A — incorporating A as a named internal component while remaining a distinct method — use `feeds_into` (VGG → fcn-semantic-segmentation; FAST → orb); it is intellectual lineage and must respect chronology (A's paper ≤ B's). Do not use `feeds_into` for "A's output can be fed to B" data-flow when B was not built on A's idea — omit the edge and let a shared concept page carry the pipeline relationship. When a deep-learning model replaces a classical algorithm, use `learned_alternative_of` on the model side (MATE → chess-corners). Reach for `caution:` on any entry where the relationship is nuanced and a casual reader might misinterpret it.
- See `docs/README.md` §4 for the full convention with worked examples.

### Quality field
- Omitted = normal published page (default).
- `quality: "stub"` = public placeholder; reader-visible warning badge.
- `quality: "canonical"` = flagship reviewed page; reader-visible badge; passes stricter validation (sources, prerequisites, no TODO).
- `quality: "historical"` = preserved for citation/lineage; method is superseded for practical use. Renders a "Historical" badge and a prominent "Superseded by" link derived from the page's `relations[]`. Body is trimmed to `# Goal` + `# Historical context` + `# References` only — no `# Algorithm`, no `# Implementation`, no `# Remarks`. Requires at least one `relations[]` entry of type `generalized_by` with `confidence: high`. Drops `editorAlgorithmId` (no Try-in-editor CTA) and any `comparedWith:` entries.

`draft: true` remains the publication gate. Do not introduce `status:` or `review:` fields.

### Relations field

`relations: <TypedRelation>[]` carries every typed inter-page link except `prerequisites` (knowledge dependency) and `failureModes` (placeholder). It replaces the legacy generic catch-alls `related`, `relatedAlgorithms`, and `comparedWith`. Available on algorithms, models, and concepts.

Each entry has:

- `type` — one of a small fixed vocabulary, organised in three categories:

  **Lineage** (theoretical evolution):
  - `generalized_by` — same problem, target strictly more general/robust. Asymmetric (A→B). The historical-supersession case when paired with `confidence: high` and `quality: "historical"`.
  - `alternative_formulation_of` — same problem, different mathematical formulation; both methods coexist (Daniilidis ↔ Tsai-Lenz). Symmetric.
  - `parallel_foundation_with` — concurrent peers that founded the field together; neither supersedes the other (Sturm-Maybank ↔ Zhang). Symmetric.
  - `extended_by` — target builds on this method without replacing it (FRST → RSD fused-radii). Asymmetric (A→B).

  **Practice** (practitioner choice / pipeline):
  - `compared_with` — peer practitioner choice; reader picks between A and B (Harris ↔ Shi-Tomasi ↔ FAST). Symmetric.
  - `feeds_into` — intellectual/compositional lineage: B's method or pipeline was conceived building on A, incorporating A's idea as a named building-block component. **Not** a runtime data-flow edge ("you can chain these tools"). Chronological: A's primary-source year ≤ B's — the build validator enforces this. Asymmetric (A→B). Distinguish from `extended_by`: `extended_by` = B is the *same* method improved; `feeds_into` = B is a *different* method that uses A as one component. When the only link is "A's output can be fed to B" with no genuine build-on (e.g. a modern detector supplying corners to an older calibration algorithm), there is **no** edge — express the shared pipeline via a concept page. Example: VGG → FCN (FCN is VGG convolutionalised for dense prediction).

  **Cross-paradigm**:
  - `learned_alternative_of` — model A is a deep-learning replacement for classical algorithm B (MATE → chess-corners; SuperPoint → harris-corner-detector). Asymmetric (model→algorithm only).

- `target` — slug that must resolve to a non-draft on-disk page; validated.
- `confidence` — `high` | `medium` | `low`. Required, no default — authors must commit. The renderer hides the confidence label only when it's `high`; medium / low surface in the UI to flag editorial uncertainty.
- `caution` — optional one-line note (free text, ≤ 200 chars) rendered next to the relation. Use to encode editorial nuance ("Newer and more coupled, but not a universal replacement"). Don't write paragraphs; use a research note for those.

Symmetric types are mirrored by the build onto the target's `relations[]`. Asymmetric types produce typed reverse buckets on the target (`generalises`, `extending`, `fedBy`, `hasLearnedAlternative`). Author one side only — the renderer composes the reader-visible bidirectional view.

The renderer groups entries into three sidebar sections by category — **Lineage**, **Practice**, **Cross-paradigm** — each entry showing its specific type label, target link, confidence-if-not-high, and optional caution. The legacy fields `related`, `relatedAlgorithms`, and `comparedWith` are removed; do not introduce them.

### Sources

Frontmatter `sources.primary` and `sources.references[]` accept three source kinds, all registered in `docs/papers/index.yaml`:

- `<bare-id>` or `paper:<id>` — a paper. Default kind; the 45+ existing entries use this form. Do not invent paper IDs.
- `repo:<https-url>@<sha>` — a GitHub repo pinned at a 7–40-char commit SHA. The index entry must exist with `kind: repo` and matching commit. Use this for repos cited as background or comparison; for the page's own reference implementation use `sources.impl` (algo) or `implementations[]` (model) — those are richer-typed and license-verified.
- `doc:<repo-relative-path>` — a markdown doc inside this repo. The path must exist under `docs/` or `content/`. Index entry has `kind: doc`.

Bare IDs are treated as `paper:<id>` for backward compatibility. New paper IDs must not start with `repo:` or `doc:`.

Each registered source has a corresponding research note at `docs/research/notes/<source-id>.md` — papers via `paper-ingest`, repos via `bun sources:fetch-repo` then stub-fill via `paper-ingest`, docs via `bun sources:fetch-doc` then stub-fill via `paper-ingest`. Notes are the canonical input the page-authoring skills consume; cache files (`docs/papers/.cache/`, `docs/sources/.cache/`) are read only by the Sonnet Extract subagent during ingestion, never by the orchestrator.

Concept pages may omit `sources:` if no canonical source exists.

### Validation
Run `bun run scripts/validate-content.ts` **by path** before opening a PR. It checks slug
resolution (including `relations[].target`), prerequisite cycles, source-id existence, and
canonical-quality gates.

Nothing automated runs it. `bun run build` does not, and CI's `validate-content` job runs
`bun run content:validate` → `scripts/content-validate.ts`, a different and much narrower
script that only checks blog/algorithm internal links and `relatedPosts`. So a broken
`relations[].target` slug or a prerequisite cycle will pass CI. Until that gap is closed,
the manual run is the only gate — do not skip it.

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

### Touch & mobile interaction

Any interactive SVG, canvas, or react-konva surface that handles drag or in-surface gestures **must** set `touch-action: none` on the interactive element. Without it, the browser claims touches as pan/scroll gestures before pointer-capture can win, and drag becomes impossible on touch devices.

Hover-only affordances (highlight-on-mouseover, tooltips that require pointermove) **must** have a tap-equivalent on touch. Detect via `e.pointerType === "touch"` or `"pen"` inside the pointer handler — do not branch on viewport width, since touch laptops exist. Reuse the same hit-test code; do not duplicate it.

Verify in browser devtools touch emulation (Chrome → Device Toolbar → "Responsive" with touch enabled) before declaring an interactive change complete. Type-check and unit tests do not catch this class of bug.
