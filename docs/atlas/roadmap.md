# Atlas initiative roadmap — quality · narratives · authors

> **Status document.** This file is the living state of the Atlas-quality + narratives + authors
> initiative and deliberately overrides the repo's default "work is driven from plan files, not a
> tracked backlog" rule for this initiative only (user decision, 2026-08-23). Read it at session
> start; update statuses and the decisions log at session end.
>
> Full plan: `~/.claude/plans/i-am-not-satisfied-soft-waterfall.md` (approved 2026-08-23).

## Session protocol

1. At session start: read this file top to bottom; pick up the first `next` item unless directed.
2. Content pages go through skills: `paper-ingest` → research note → `deep-model-page` /
   `concept-page`. Comparison prose only when both research notes exist.
3. Verification after every phase: `bun run build` · `bun run lint` · `npx vitest run` ·
   `bun run scripts/validate-content.ts` · `bun run content:validate` · `bun run ds:validate`
   (if DS-exported components touched) · devtools touch emulation for interactive-canvas changes.
4. At session end: update Workstream status, wave tables, and the Decisions log (dated one-liners).

## Workstream status

| WS | State | Next action |
|---|---|---|
| Phase 0 — design mock + this doc | **direction approved** (user liked v1; requested chapter-length prose — incorporated in v2 as the reading panel) | Final look at mock v2 |
| A — Narratives subsystem | not started | Schema + build infra (Phase 3) |
| B — Authors subsystem | not started | After Phase 3: fetch-meta extension + backfill dry-run (Phase 6) |
| C — Deep-models review | **Wave 0 in progress** | Finish validator warning + frontend quickies; then Wave 1 attention ingest |

## Wave plan (Workstream C)

### Wave 0 — systemic fixes (Phase 1, Sonnet via /impl)

- [x] Add `representation-learning` to `domainValues` + `domainLabels.ts` + constellation cluster;
      re-domain `vit`, `mae`, `dinov2` (2026-08-23)
- [x] Remove phantom `category:` field from `.claude/skills/deep-model-page/SKILL.md` (2026-08-23)
- [x] Move `feeds_into → rf-detr` from `content/models/vit.md` to `dinov2.md` (2026-08-23)
- [x] `dinov2.md`: `mae` prerequisite → `compared_with` relation; add `attention-mechanism`
      prerequisite (2026-08-23)
- [x] `midas → depth-anything` `feeds_into` — already existed, no change needed (2026-08-23)
- [x] Zero-relation pages (rf-detr, depth-anything-3, unet-segmentation, efficientad, lightglue):
      audited — all their prose relationships are already authored on the counterpart pages
      (detr→rf-detr, vggt/da-v2/dust3r→da-3, fcn→unet, patchcore/uninformed-students/resnet→efficientad,
      superglue/loftr→lightglue); correctly left untouched to avoid duplicate symmetric edges (2026-08-23)
- [x] Validator: arxiv/doi prose-reference warning rule (reuses existing warnings channel);
      first run surfaced **28 unregistered prose references** across 17 pages — triage list captured
      in the Wave 1+ ingestion queue below. Known gap: citations with no identifier at all
      (e.g. attention page's bare "NeurIPS 2017" Vaswani line) escape the scan (2026-08-23)
- [x] Frontend quickies: `RelatedPosts.tsx` + Algorithm/Model/ConceptCard now link `/atlas/<slug>`
      directly; redirect routes kept for external links (2026-08-23)

**Wave 0 complete.** Prose-reference triage (28 warnings, notable clusters): segmentation family
cites FCN/U-Net/DeepLab/Mask R-CNN arXiv ids not in registry (bisenet, deeplab, segformer,
mask-rcnn, fcn, fast-scnn, ritm, unet ×5); `sam`/`mobilesam` cite SAM's own arXiv 2304.02643
(registry entry apparently keyed differently — verify); `attention-mechanism` cites RoFormer
2104.09864; `barath-magsac`/`ransac` cite 1803.07469; `alexnet` cites dropout 1207.0580;
`midas` cites 1810.04650; `rochade` a DOI. Register-or-reword during the relevant waves.

### Waves 1–3 — pages

| Page | Kind | Action | Papers to ingest | Note exists | Status | Session |
|---|---|---|---|---|---|---|
| attention-mechanism | concept | **full rewrite**, primary → vaswani2017; fix √d_h error; lineage Bahdanau→Vaswani→efficient/KV; regenerate Where-it-appears (14 dependents) | vaswani2017-attention, bahdanau2014-align, katharopoulos2020-linear-attention, darcet2023-registers; register-only: flashattention, roformer, gqa | no | wave 1 | — |
| transformer | concept | new | (vaswani + ≥2 from above) | no | wave 1 | — |
| positional-encoding | concept | new | vaswani, roformer, vit | no | wave 1 | — |
| normalization | concept | new | ba2016-layernorm, ioffe2015-batchnorm, +1 | no | wave 1 | — |
| dino | model | new (v1: self-distillation w/o labels, multi-crop, centering+sharpening, emergent segmentation) | caron2021-dino | no | wave 2 | — |
| dinov2 | model | rewrite (derive v1→v2 delta; land Wave-0 frontmatter fixes; relations `dino —extended_by→ dinov2 —extended_by→ dinov3`) | — | yes | wave 2 | — |
| dinov3 | model | new (gram anchoring, 7B/1.7B-image scale — verify from note) | dinov3 (arXiv 2508.10104) | no | wave 2 | — |
| knowledge-distillation | concept | new (load-bearing in 6+ pages) | hinton2015-distillation, +2 | no | wave 2 | — |
| self-supervised-learning | concept | new (survey-style, decision table) | chen2020-simclr, he2020-moco, grill2020-byol | no | wave 2 | — |
| deit | model | new | touvron2020-deit | no | wave 2 | — |
| swin | model | new | liu2021-swin | no | wave 2 | — |
| clip | model | new (open_clip impls, real licenses; then ~6 `compared_with` edges from pages comparing to CLIP) | radford2021-clip | no | wave 3 | — |
| vit / resnet / sam / attention-mechanism / dinov2 | — | `quality: canonical` rollout | — | — | wave 3 | — |

Ordering constraints: attention rewrite before `transformer` cross-links; `dino` before `dinov2`
rewrite; kd concept before deit/dinov2 prose; both notes before any comparison prose.

## Page-debt from narratives

Maintained via `bun run narratives:debt` after narrative changes. Anything contributing to a
narrative should get a page — paper-only nodes are debt, not normal.

| Paper | Node | Narrative(s) | Suggested kind | Status |
|---|---|---|---|---|
| (siglip2) | siglip2 | foundation-models-for-vision | model | anticipated |
| (winclip) | winclip | foundation-models-for-vision | model | anticipated |
| (anomalyclip) | anomalyclip | foundation-models-for-vision | model | anticipated |
| (simplenet) | simplenet | foundation-models-for-vision | model | anticipated |
| darcet2023-registers | registers | foundation-models-for-vision | concept or model | anticipated |
| (ibot) | ibot | foundation-models-for-vision | model (optional node) | anticipated |

## Decisions log

- 2026-08-23 — Narrative nodes: atlas slug XOR registered paper id; paper-only = tracked debt.
- 2026-08-23 — Review scope: full fundamental gap-fill, state carried in this doc across sessions.
- 2026-08-23 — Authors keyed by OpenAlex IDs; backfill inserts `authorIds:` into
  `docs/papers/index.yaml` (dry-run diff reviewed first); `docs/papers/authors.yaml` = identity only.
- 2026-08-23 — Weights licensing: keep `implementations[]` with real repo license; bespoke weights
  terms verbatim in `weights_license`; no `noPublicImpl` dodge.
- 2026-08-23 — IA: narratives are a 4th `/atlas` view tab; detail at `/atlas/narratives/:slug`;
  no new Navbar items; `/authors` unlisted (search + SourceStrip + index footer discovery).
- 2026-08-23 — Narrative edge vocabulary diverges from Atlas relations on purpose:
  `prerequisite | evolution | bridge | contrast` + free-text `label` (story altitude, not
  encyclopedic claims). Lens coordinates are hand-authored; `timeline` lens is build-generated.
- 2026-08-23 — DINO trio relations: `dino —extended_by→ dinov2 —extended_by→ dinov3`; none
  `historical` (all remain in practical use).
- 2026-08-23 — **Narrative layout is loosely chronological** (user feedback on mock v2): in every
  hand-authored lens, x preserves publication order — same-year and adjacent-year stops may reorder
  freely; inversions of ≥2 years draw a validator **warning**. Thematic clustering moves to y-lanes.
  A subtle year ruler renders along the canvas top. The generated Timeline lens is the exact view
  (x∝year, y=area lane — horizontal time, not the preview.html vertical variant). Corollary for
  content: bridge edges should target the stops that actually postdate the source (DINOv2 → 
  EfficientAD 2023, not PatchCore 2022); "foundation features retrofit an older method" nuance
  belongs in chapter prose, not in an anachronistic edge.
- 2026-08-23 — Narrative steps carry **chapter-length prose**, not a ≤500-char caption (user
  feedback on mock v1). Steps reference `##` chapter sections of the body essay by heading anchor;
  the build extracts per-chapter HTML. Desktop: right rail is a reading panel (current chapter's
  1–2 paragraphs + focused-stop block); the stepper is navigation-only. Mobile chapter sections
  show the full chapter prose. Essay stays the single authored source.

## Deferred / parked

- Notes-without-page backlog: maskformer, sam2, sam3, retinanet, ast, mvtec datasets.
- Foundation-models / frozen-backbones concept page.
- Narrative prev/next reading-position strip on Atlas pages (`?narrative=` context).
- Obsidian vault projection of narratives (`scripts/atlas-vault-build.ts`).
- Authors: affiliations, per-author timelines, co-author graph viz, disambiguation tooling.
- `manualChunks` split of content-graph / content-index / content-search (236 KB shared Atlas chunk).
