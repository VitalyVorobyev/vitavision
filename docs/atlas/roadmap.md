# Atlas roadmap

> **Status document.** Living state of the Atlas initiative. It deliberately overrides the repo's
> default "work is driven from plan files, not a tracked backlog" rule for this initiative only
> (user decision, 2026-08-23). Page-quality and tech-debt rows live in `docs/atlas/backlog.md`.
>
> Current plan: `~/.claude/plans/ws-f-people-papers.md` (approved 2026-09-23; design canvas
> https://claude.ai/artifact/RcTo7hXnDqmLLwGx6e6vZP).

## Session protocol

1. At session start: read this file top to bottom; pick up the first `planned` row unless directed.
2. Content pages go through skills: `paper-ingest` → research note → `algo-page` /
   `deep-model-page` / `concept-page` / `narrative-page`. Comparison prose only when both
   research notes exist. After each ingest: `bun run papers:backfill-authors --only <id>`.
3. Verification after every phase: `bun run build` (also runs the Atlas graph validator, drafts
   included) · `bun run lint` · `npx vitest run` · `bun run content:validate` (published-only, as
   CI) · `bun run narratives:debt` (narrative PRs) · `bun run ds:validate` (if DS-exported
   components touched) · devtools touch emulation for interactive-canvas changes.
4. At session end: update Workstream status and the Decisions log.

**PR policy (user mandate, 2026-08-23):** Claude opens and merges PRs itself, no codex review;
strictly one PR at a time; PRs must be substantial — every main commit triggers a production deploy.

## Shipped

- **Phase 1 (2026-08-23, PRs #125–#131):** typed `relations[]`, content graph with derived reverse
  edges, quality tiers, authors registry, CLIP wave, canonical rollout.
- **Narratives v2 + authors v1 (2026-09-15, PRs #143–#157):** question nodes, step `claim`,
  `walkthrough: reveal`; `mergedInto` aliases, weighted co-author edges, per-author ego graph,
  `author-identity` skill; source injections (RAFT, COLMAP, Kannala–Brandt, LO-RANSAC); first
  `atlas-audit` batch; all 13 planned narratives live (N1–N13).

Atlas size at 2026-09-23: 55 algorithms · 51 models · 35 concepts · 13 narratives · 151 registered
sources · 141 research notes (7 in v2 form) · 499 canonical authors.
After PR-B: 54 models · 154 sources · 144 notes (11 in v2 form) · 502 canonical authors.

## Workstream status

| WS | Goal | State | Next action |
|---|---|---|---|
| A — Workflow hygiene | Skills and docs describe the system as it is | **done** (#158) | — |
| B — Dense-prediction injection | FPN, DPT, PointRend pages; SegFormer note → v2 | **done** (PR-B) | — |
| F — Authors & papers experience | Papers and people become first-class, well-designed Atlas surfaces | **in progress** — design approved; F1 paper pages (this PR) | F2: Atlas tabs + People views + author page v2 |
| G — Build-pipeline quality | Validator, build scripts, and frontend/editor monoliths modular and tested | **done** (#160, #161, #162) | — |
| H — Note v2 migration | Every relation rests on a note with `# Stated relations` | planned | batch 1: highest-degree segmentation/detection notes |
| I — Coverage waves | Close page debt and notes-without-pages | planned | multi-scale wave after PR-B |
| J — Quality tiers | Canonical rollout per domain; second audit pass | planned | `atlas-audit` batch 2 over BL-001 remainder |
| K — Citation & influence graph | Surface `cites` as paper→paper and author→author influence | long-term | after F ships paper pages |

### B — Dense-prediction injection (short-term)

| Source | Paper id | Page | Committed relations (user-confirmed 2026-09-23) | Status |
|---|---|---|---|---|
| Lin et al., FPN, CVPR 2017 (arXiv:1612.03144) | `lin2017-fpn` | `fpn` | resnet → fpn, faster-rcnn → fpn, fpn → mask-rcnn (`feeds_into`, high); prereqs image-pyramid, CNN; closed BL-011 | **live** |
| Ranftl et al., DPT, ICCV 2021 (arXiv:2103.13413) | `ranftl2021-dpt` | `dpt` | vit → dpt, midas → dpt; dpt → depth-anything ×3, dust3r, vggt (`feeds_into`, high) | **live** |
| Kirillov et al., PointRend, CVPR 2020 (arXiv:1912.08193) | `kirillov2020-pointrend` | `pointrend` | mask-rcnn → pointrend (medium, generic-module caution); pointrend → mask2former (high) | **live** |
| Xie et al., SegFormer, NeurIPS 2021 (arXiv:2105.15203) | `xie2021-segformer` | `segformer` | note refreshed to v2; vit → segformer (`feeds_into`, high); swin `compared_with` segformer (medium, Swin hosts `## When to choose`) | **live** |

Narrative follow-ups (via `narrative-page`) done: `fpn` node + chapter paragraph in
`detection-removing-the-machinery`, `dpt` node + paragraph in `depth-becomes-general-geometry`.

### F — Authors & papers experience (mid-term)

Design-led; approved 2026-09-23 (Atlas-native elevated look, impact-first paper page, People =
directory + network tab, People/Papers as Atlas view tabs). Three PRs: **F1** scholarly data layer
(`public/scholarly-index.json`, lazy) + `/papers/:id`; **F2** 5-tab Atlas view switch (BL-035),
People directory + network, author page v2; **F3** Papers view, search (BL-022), author data
integrity (BL-032), narrative fit (BL-034).

1. **Paper pages** `/papers/:id` — the hub between people and the Atlas: authors, venue/year,
   Atlas pages built on the paper, narratives it appears in, cites / cited-by (the `cites` field is
   already in `index.yaml` but never reaches the site).
2. **Author page v2 (Author → Atlas)** — contribution-first: the pages and narratives the author's
   work underpins, grouped by domain, with a year strip; co-author edges carry their shared-paper
   lists, precomputed at build (drop the client `papersSharedBy` loop).
3. **Global co-author graph** at `/authors` — community clusters, domain/era filters,
   focus+context, touch-safe.
4. **Discoverability** — `/authors` and papers reachable from Atlas navigation; global search
   palette consuming author/paper records (BL-022).
5. **Data integrity** — backfill the 10 papers without `authorIds`; validator rules for authors
   (BL-032).

### H — Note v2 migration (mid-term)

134 of 141 notes predate the structured-ingestion pivot (no `# Claimed contributions` /
`# Stated relations`), so Step 4b's "confirm against the counterpart's note" is impossible for most
existing relations. Upgrade in domain batches (Sonnet Extract, orchestrator review), highest-degree
pages first; each batch ends with a relation audit against the stated relations. Add a v1/v2 count
to a report script so progress is measurable.

### I — Coverage waves (mid-term)

- Multi-scale wave: `retinanet` page (note exists; FPN is its backbone), survey concept
  `multi-scale-feature-fusion` (FPN, U-Net, HRNet, DeepLab/ASPP, SegFormer, DPT).
- N1 extension ("what is normal" lens) + 5 debt pages below; 4 of those papers need notes first.
- BL-021 notes without pages; 10 registered papers without notes.

### J, K — Long-term

- **J:** canonical rollout per domain (5 canonical pages today), MATE stub (BL-002), second
  `atlas-audit` pass over BL-001's remainder, failure-mode pages once candidates reach 3+ referrers.
- **K:** paper-level citation lineage overlay in the graph explorer; author→author influence edges
  derived from `cites`.

## Page-debt from narratives

Maintained via `bun run narratives:debt` after narrative changes. Anything contributing to a
narrative should get a page — paper-only nodes are debt, not normal.

```
| paper | node | narrative(s) | suggested page kind |
| --- | --- | --- | --- |
| `darcet2023-registers` — Vision Transformers Need Registers | registers | foundation-models-for-vision | model or concept |
| `jeong2023-winclip` — WinCLIP: Zero-/Few-Shot Anomaly Classification and Segmentation | winclip | foundation-models-for-vision | model or concept |
| `liu2023-simplenet` — SimpleNet: A Simple Network for Image Anomaly Detection and Localization | simplenet | foundation-models-for-vision | model or concept |
| `tschannen2025-siglip2` — SigLIP 2: Multilingual Vision-Language Encoders with Improved Semantic Understanding, Localization, and Dense Features | siglip2 | foundation-models-for-vision | model or concept |
| `zhou2023-anomalyclip` — AnomalyCLIP: Object-agnostic Prompt Learning for Zero-shot Anomaly Detection | anomalyclip | foundation-models-for-vision | model or concept |
```

## Decisions log

- 2026-08-23 — **Structured ingestion pivot** (user-approved): for modern papers, the research-note
  template gains `# Claimed contributions` (verbatim-anchored) and `# Stated relations` (the paper's
  own Related-Work positioning as a quote-anchored table with *proposed* `relations[].type`).
  paper-ingest Step 4b becomes proposal-then-confirm.
- 2026-08-23 — Narrative nodes: atlas slug XOR registered paper id; paper-only = tracked debt.
- 2026-08-23 — Authors keyed by OpenAlex IDs; `docs/papers/authors.yaml` = identity only.
- 2026-08-23 — IA: narratives are a 4th `/atlas` view tab; detail at `/atlas/narratives/:slug`;
  `/authors` unlisted (search + SourceStrip + index footer discovery). *Revisited 2026-09-23 (WS-F).*
- 2026-08-23 — Narrative edge vocabulary diverges from Atlas relations on purpose: `prerequisite |
  evolution | bridge | contrast` + free-text `label` (story altitude, not encyclopedic claims).
- 2026-08-23 — Narrative layout is loosely chronological; inversions of ≥2 years draw a validator warning.
- 2026-08-23 — Narrative steps carry chapter-length prose anchored to `##` headings; essay stays
  the single authored source.
- 2026-09-15 — Story consolidation, 18 → 13 narratives (overlapping stories became lenses of one
  narrative); `claim` field on steps; `question` node kind; `walkthrough: reveal` mode; narrative
  edges must not contradict Atlas `relations[]` (validator warns).
- 2026-09-15 — First `atlas-audit` run: raw `relations[]` emptiness undercounts connectivity —
  7 of 10 "zero-relation" pages were reverse-linked via `src/generated/content-graph.ts`. Real
  defects were fidelity, comparison-hosting discipline, broken links, missing sections, and
  `flowchart LR` pipelines that should have been generated SVGs.
- 2026-09-15 — Authors: `mergedInto` alias mechanism (build-resolved, cycle-safe, old ids redirect);
  weighted co-author edges precomputed at build; static ego graph on author pages. Identity fixes
  from OpenAlex evidence (Tomasi, Michael S. Brown, Jian Sun merged; Kirillov, Zilong Huang,
  Zhengyou Zhang re-pointed). Lesson: name+initial similarity produces false merges — check
  affiliations/topics before merging.
- 2026-09-15 — Pilot-narrative lesson: extract the drafter's reply from its transcript by script;
  the hand-back summary does not carry the body.
- 2026-09-15 — Source injections (RAFT, COLMAP, Kannala–Brandt, LO-RANSAC): relations decided from
  the notes (see the respective pages' `relations[]`).
- 2026-09-23 — **Atlas review** (user-approved): SegFormer note refreshed to v2 rather than skipped;
  authors roadmap = Author→Atlas pages, global co-author graph, discoverability — explicitly
  design-led; affiliations stay parked. Review found that `bun run build` *does* run the Atlas
  graph validator (docs said otherwise — corrected), 134/141 notes are pre-pivot (WS-H), and the
  page skills still emitted the removed `category` field and an invalid `computer-vision` tag.
- 2026-09-23 — Dense-prediction injection: dropped as unsupported by either paper — fpn→mask2former
  (only a paraphrased "FPN-style" decoder), dpt↔segformer (neither paper mentions the other),
  pointrend↔deeplab/fcn (interchangeable base architectures = data-flow, not lineage). midas→dpt is
  `feeds_into`, not `extended_by`: new architecture reusing the MiDaS loss/data mix as a component.
  OpenAlex 404s on arXiv DOIs for ICCV/CVPR papers indexed under their conference DOI — search by
  title/DOI and verify authors before registering. Lesson: pdftotext drops superscripts (PointRend
  "142"/"282" were 14²/28²) — sanity-check any suspicious constant against the paper's own arithmetic.

- 2026-09-23 — **WS-G monolith batch** (user-approved: all three areas, fix found bugs in separate
  commits, one validator name). `content-validate.ts` deleted; `bun run content:validate` is the single
  validator (`scripts/validate/context.ts` + pure `rules/*.ts` with fixtures), now also checking
  internal links/anchors, images and cross-refs; the build validates before writing `src/generated`.
  `scripts/lib/` holds the one `index.yaml` loader and shared helpers; `content-build.ts` is
  orchestration over `scripts/build/*`. Frontend: GraphExplorer / AlgorithmIndex / RelationshipPanel
  split into pure tested `src/lib/atlas/*` modules + components; GraphExplorer lazy-loaded; search
  index in its own `atlas-search` chunk. WASM worker: entry + command table over
  `src/lib/wasm/worker/*` with a discriminated request protocol. Method: byte/pixel parity against a
  pre-refactor snapshot for every refactor commit (generated files, validator stdout, deterministic
  Playwright screenshots, editor feature exports, worker-command hashes). Found along the way:
  PuzzleBoard results crashed on every run since calib-targets 0.14 reshaped `GridAlignment` (casts in
  the worker hid it from tsc — `test-wasm-schemas` now asserts the shape); 5 broken internal links.

## Deferred / parked

- Authors: affiliations (OpenAlex institutions) and disambiguation tooling beyond `authors:dupes`.
- Foundation-models / frozen-backbones concept page.
