# Atlas initiative roadmap — narratives v2 · authors · dev docs

> **Status document.** This file is the living state of the Atlas narratives/authors initiative
> and deliberately overrides the repo's default "work is driven from plan files, not a tracked
> backlog" rule for this initiative only (user decision, 2026-08-23).
>
> Full plan: `~/.claude/plans/i-want-you-to-tingly-matsumoto.md` (approved 2026-09-15).

## Session protocol

1. At session start: read this file top to bottom; pick up the first `planned` row unless directed.
2. Content pages go through skills: `paper-ingest` → research note → `algo-page` /
   `deep-model-page` / `concept-page` / `narrative-page`. Comparison prose only when both
   research notes exist.
3. Verification after every phase: `bun run build` · `bun run lint` · `npx vitest run` ·
   `bun run scripts/validate-content.ts` · `bun run content:validate` ·
   `bun run narratives:debt` (narrative PRs) · `bun run ds:validate` (if DS-exported components
   touched) · devtools touch emulation for interactive-canvas changes (narrative canvas, ego graph).
4. At session end: update Workstream status, the program tables, and the Decisions log.

## Workstream status

| WS | State | Next action |
|---|---|---|
| A — Narratives infra v2 | **done** (PR-1) — `question` nodes, step `claim`, `walkthrough: reveal`, edge-vs-relations validator warning, orphan layout generator removed | — |
| B — Authors: identity, edges, ego graph | **done** (PR-2) | run `author-identity` Workflow B on the remaining `authors:dupes` candidates (Dong Liu ×2 HRNet, Yang Zou ×2 WinCLIP/VisA look like real splits); re-run backfill — the dry-run now matches 4 of the 10 unlinked papers by DOI |
| C — Narratives program (13 stories) | planned | N9 pilot via `narrative-page` (PR-3) |
| D — Page-quality audit | skill + seeded backlog **done** (PR-1) | first `atlas-audit` run over the BL-001 zero-relation pages after the N9 pilot |
| E — Source injections (RAFT, COLMAP, Kannala–Brandt, LO-RANSAC) | planned | after N9/N7/N8/N3 need them |

**PR policy (user mandate, 2026-08-23):** Claude opens and merges PRs itself, no codex review;
strictly one PR at a time; PRs must be substantial — every main commit triggers a production deploy.

## Narratives program (13)

Consolidated from an 18-story proposal (see Decisions log). Authoring order (readiness × value):
N9 → N7, N8, N3 (after source injections) → N4, N5, N2, N6 → N10, N11, N12, N13 → N1 extension + debt pages.

| # | Slug | Thesis | Nodes | New-page deps | Lenses | Status | PR |
|---|---|---|---|---|---|---|---|
| N1 | `foundation-models-for-vision` | Extend: "what is normal" lens; question node | 21 existing + 5 debt | winclip, anomalyclip, simplenet, siglip2, register-tokens pages | overview, ssl-lineage, distillation, anomaly-bridge, +what-is-normal | live, extension planned | — |
| N2 | `where-did-the-inductive-bias-go` | Assumptions migrate algorithm → architecture → data+objective | 12 | — | classifier-lineage, bias-migration, timeline | planned | — |
| N3 | `the-geometry-pipeline-collapses` | Learned geometry absorbs pipeline stages | 19 | colmap | features, pipeline, timeline | planned | — |
| N4 | `segmentation-from-energy-to-prompt` | Prior moves from energy function to pretrained model | 14 | — | dense-prediction, interactive | planned | — |
| N5 | `detection-removing-the-machinery` | Sliding windows → proposals → regression → set prediction | 8 | — | overview, timeline | planned | — |
| N6 | `depth-becomes-general-geometry` | Training signal, not architecture, is the story | 7 | — | overview, timeline | planned | — |
| N7 | `forty-years-against-outliers` | Algebra → numerics → outliers → adaptive thresholds | 8 | lo-ransac | overview, timeline | planned | — |
| N8 | `calibration-changed-the-target` | Usability came from the planar target, not new math | 8 | kannala-brandt-model | overview, timeline | planned | — |
| N9 | `finding-a-chessboard` | Local evidence isn't enough; topology, learning, self-identifying targets | 15 | — | local-response, topology-beats-appearance, timeline | planned (pilot) | — |
| N10 | `local-versus-global-motion` | Three answers, then learned iteration | 4 + question | raft | overview, timeline | planned | — |
| N11 | `one-homography-is-not-enough` | Parallax breaks the global model | 5 | — | overview, timeline | planned | — |
| N12 | `four-answers-to-rectification` | One goal, four assumption sets | 6 | — | assumptions (2×2 grid), timeline | planned | — |
| N13 | `vision-under-a-latency-budget` | History of compute constraints, not accuracy | 14 | — | overview, timeline | planned | — |

## Authors program

- [x] Alias mechanism: `mergedInto` on `authors.yaml` rows, resolved in `buildAuthorsIndex`, `AuthorPage` redirects alias → canonical.
- [x] Data fixes (OpenAlex-verified, see `author-identity` worked cases): Tomasi, Michael S. Brown, Jian Sun merged via `mergedInto`; Kirillov (SAM) and Zilong Huang (Depth Anything) were misattributions to a crystallographer and a microbiologist — re-pointed; `zhang2000-flexible` re-pointed to Zhengyou Zhang `A5113678278`.
- [x] `scripts/authors-dupes.ts` (`bun run authors:dupes`) — candidate-split report.
- [x] Backfill merge fix (`--write` merges into existing `authors.yaml` instead of overwriting) + `--only <paper-id>` flag (`bun run papers:backfill-authors`).
- [x] Weighted co-author edges (`AuthorsIndex.coauthors`) at build time.
- [x] Static ego graph on `AuthorPage` (top collaborators, ring layout, click-through).
- [x] `author-identity` skill.

## Sources to inject

| Source | Paper id | Page | Kind | Narrative |
|---|---|---|---|---|
| Teed & Deng, RAFT, ECCV 2020 | `teed2020-raft` | `raft` | model (`deep-model-page`) | N10 |
| Schönberger & Frahm, SfM Revisited, CVPR 2016 | `schonberger2016-colmap` | `colmap` | algorithm (`algo-page`) | N3 |
| Kannala & Brandt, generic camera model, TPAMI 2006 | `kannala2006-generic` | `kannala-brandt-model` | algorithm (`algo-page`) | N8 |
| Chum, Matas & Kittler, LO-RANSAC, DAGM 2003 | `chum2003-lo-ransac` | `lo-ransac` | algorithm (`algo-page`) | N7 |

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
  `/authors` unlisted (search + SourceStrip + index footer discovery).
- 2026-08-23 — Narrative edge vocabulary diverges from Atlas relations on purpose: `prerequisite |
  evolution | bridge | contrast` + free-text `label` (story altitude, not encyclopedic claims).
- 2026-08-23 — Narrative layout is loosely chronological; inversions of ≥2 years draw a validator warning.
- 2026-08-23 — Narrative steps carry chapter-length prose anchored to `##` headings; essay stays
  the single authored source.
- 2026-09-15 — Story consolidation, 18 → 13: 3+4 merged (segmentation dense/interactive are two
  lenses of one energy→prompt arc); 12+13 merged (topology is the second half of the chessboard
  story); 1+6 merged (features and pipeline are the same collapse from two ends); 2+18 merged
  (inductive bias is the thesis of the classifier→foundation lineage); 8+9 folded into the
  existing Foundation Models narrative (N1) as a "what is normal" lens + question node.
- 2026-09-15 — `claim` field added to narrative steps (≤360 chars, rendered as step headline)
  while chapters remain the reading body.
- 2026-09-15 — `question` node kind added: no year, no link, not counted as page debt.
- 2026-09-15 — `walkthrough: reveal` mode added (default stays `focus`): hides not-yet-focused
  nodes/edges instead of dimming them.
- 2026-09-15 — Narrative edges must not contradict Atlas `relations[]` (validator warns, does not error).
- 2026-09-15 — Orphaned constellation layout generator deleted (`scripts/computeConstellationLayout.ts`,
  `src/generated/atlas-graph-layout.ts`, the `atlas:layout` build step) — nothing imported it.
- 2026-09-15 — Authors: `mergedInto` alias mechanism (build-resolved, cycle-safe, old ids redirect);
  weighted co-author edges precomputed at build; static ego graph on author pages.
- 2026-09-15 — Author identity fixes, all from OpenAlex `authors/<id>` evidence: Tomasi `A5088492440`→`A5079878449`,
  Michael S. Brown `A5075135613`→`A5106406020` (more works; both stitching papers are his), Jian Sun
  `A5100785015`→`A5101425421` (Microsoft affiliation) merged; `kirillov2023-sam` re-pointed
  `A5008626158` (a crystallographer) → `A5101930471`; `yang2024-depth-anything` re-pointed `A5101358906`
  (a microbiologist) → `A5099137433`; `zhang2000-flexible` re-pointed `A5056480447` → `A5113678278`.
  Lesson: name+initial similarity produced two false merges in the original plan — always check
  affiliations/topics before merging.

## Deferred / parked

Page-quality and tech-debt items live in `docs/atlas/backlog.md`; this list holds only scoped-out features.

- Foundation-models / frozen-backbones concept page.
- Authors: affiliations, per-author timelines, disambiguation tooling beyond `authors:dupes`.
- Global co-author graph (ego graph per author is scheduled; a full-graph view is not).
