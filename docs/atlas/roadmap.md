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
| Phase 0 — design mock + this doc | **direction approved** (v3 = chronological layout; awaiting any further user remarks) | — |
| A — Narratives subsystem | **Phases 3 + 5 merged 2026-08-23** — infra, reader UI, and the first narrative (`foundation-models-for-vision`, 21 stops, 7 chapters) are live | Debt paydown (6 paper-only stops → pages, see table below); second narrative when a track matures |
| B — Authors subsystem | **Phase 6 merged 2026-08-23** — backfill run (135/145 papers, 499 authors), /authors + /authors/:id live, SourceStrip/SourceCard author links | Deferred: affiliations, timelines, co-author graph viz, split-identity dedup (two "Carlo Tomasi" ids) |
| C — Deep-models review | **Waves 0–2 merged (2026-08-23)** | Wave 3: clip page + ~6 compared_with edges + `quality: canonical` rollout (vit, resnet, sam, attention-mechanism, dinov2) |

**PR policy (user mandate, 2026-08-23):** Claude opens and merges PRs itself, no codex review;
strictly one PR at a time; PRs must be substantial — every main commit triggers a production deploy.

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
| attention-mechanism | concept | **full rewrite**, primary → vaswani2017; fix √d_h error; lineage Bahdanau→Vaswani→efficient/KV; regenerate Where-it-appears (14 dependents) | vaswani2017-attention, bahdanau2014-align, katharopoulos2020-linear-attention, darcet2023-registers; register-only: flashattention (dao2022), gqa (ainslie2023); roformer (su2021) upgraded to full note | yes (all 5) | **done** (PR #126) | 2026-08-23 |
| transformer | concept | new | vaswani + ba2016-layernorm + vit + katharopoulos | yes | **done** (PR #126) | 2026-08-23 |
| positional-encoding | concept | new | vaswani, su2021-roformer, vit, lightglue | yes | **done** (PR #126) | 2026-08-23 |
| normalization | concept | new | ioffe2015-batchnorm, ba2016-layernorm, wu2018-groupnorm (+vaswani) | yes (all 3 new) | **done** (PR #126) | 2026-08-23 |
| dino | model | new (v1: self-distillation w/o labels, multi-crop, centering+sharpening, emergent segmentation) | caron2021-dino | yes | **done** (Wave-2 PR) | 2026-08-23 |
| dinov2 | model | delta section `## What v2 changed over v1` + relations chain + prerequisites (Wave-0 frontmatter fixes had already landed) | — | yes | **done** (Wave-2 PR) | 2026-08-23 |
| dinov3 | model | new (gram anchoring verified from note: $\|X_S X_S^\top - X_G X_G^\top\|_F^2$, w=2, from 1M iters, teacher refresh 10k×3) | simeoni2025-dinov3 | yes | **done** (Wave-2 PR) | 2026-08-23 |
| knowledge-distillation | concept | new | hinton2015-distillation (+deit, dino notes) | yes | **done** (Wave-2 PR) | 2026-08-23 |
| self-supervised-learning | concept | new (survey, decision table) | chen2020-simclr, he2019-moco, grill2020-byol (+dino) | yes | **done** (Wave-2 PR) | 2026-08-23 |
| deit | model | new | touvron2020-deit | yes | **done** (Wave-2 PR) | 2026-08-23 |
| swin | model | new | liu2021-swin | yes | **done** (Wave-2 PR) | 2026-08-23 |
| clip | model | new (open_clip impls, real licenses; then ~6 `compared_with` edges from pages comparing to CLIP) | radford2021-clip | no | wave 3 | — |
| vit / resnet / sam / attention-mechanism / dinov2 | — | `quality: canonical` rollout | — | — | wave 3 | — |

Ordering constraints: attention rewrite before `transformer` cross-links; `dino` before `dinov2`
rewrite; kd concept before deit/dinov2 prose; both notes before any comparison prose.

## Page-debt from narratives

Maintained via `bun run narratives:debt` after narrative changes. Anything contributing to a
narrative should get a page — paper-only nodes are debt, not normal.

| Paper | Node | Narrative(s) | Suggested kind | Status |
|---|---|---|---|---|
| radford2021-clip | clip | foundation-models-for-vision | model | **debt** (Wave 3 authors the page; node flips paper→page) |
| tschannen2025-siglip2 | siglip2 | foundation-models-for-vision | model | debt |
| jeong2023-winclip | winclip | foundation-models-for-vision | model | debt |
| zhou2023-anomalyclip | anomalyclip | foundation-models-for-vision | model | debt |
| liu2023-simplenet | simplenet | foundation-models-for-vision | model | debt |
| darcet2023-registers | registers | foundation-models-for-vision | concept or model | debt (note exists) |
| (ibot) | — | — | model | dropped from narrative (optional per plan) |

## Wave 1 session notes (2026-08-23, PR #126)

- 10 papers registered: vaswani2017-attention, bahdanau2014-align, katharopoulos2020-linear-attention,
  darcet2023-registers, dao2022-flashattention, su2021-roformer, ainslie2023-gqa,
  ioffe2015-batchnorm, ba2016-layernorm, wu2018-groupnorm. Notes written for 8 (flashattention +
  gqa remain register-only). OpenAlex's record for Vaswani 2017 is glitched (year 2025, junk DOI) —
  stanza hand-authored from ground truth.
- attention-mechanism rewritten (primary vaswani2017; √d_k per-head scaling fixed to 1/8 consistent
  with vit.md; Bahdanau origins; Katharopoulos linear attention credited with LoFTR as adopter;
  register tokens; SuperGlue/LoFTR/LightGlue demoted to applications; domain → representation-learning).
  Its RoFormer prose warning cleared (28 → 27 validator warnings).
- New concepts: transformer, positional-encoding, normalization (all domain representation-learning;
  transformer prerequisites [attention-mechanism, positional-encoding, normalization]).
- loftr.md: elu+1 kernel credited to Katharopoulos + source ref added. vggt.md: darcet2023-registers
  ref added (fixed dangling register-token mention).
- concept-page SKILL.md: phantom `category:` field replaced with `domain:` (same drift as
  deep-model-page had).
- Draft QA: all three concept drafts audit-verified against notes (54+50+55+44 entries, zero real
  misses — only line-wrap artifacts).

## Phase 3 session notes (2026-08-23)

- Narratives are now a full content kind: `narrativeFrontmatterSchema` (areas / nodes with
  page-XOR-paper / typed edges / hand-authored lenses / ≥2 steps anchored to `##` chapters),
  threaded as the 6th kind through content-build. Per-narrative generated modules export
  `html` + `chapters` (per-`##` slices) + resolved `narrative` graph + `steps`; plus
  `narrative-loaders.ts`, `narrative-refs.ts` (reverse index, drafts excluded), slim
  `NarrativeIndexEntry` (with `draft` flag) in content-index, search records (drafts excluded).
- Build generates the `timeline` lens (x ∝ derived year, y = area lane); the lens id is
  reserved. Years derive from papers index / page `sources.primary` — never authored.
- Validator: narrative error rules (XOR, published-page + registered-paper resolution,
  overview-lens completeness, step-anchor resolution via a rehype-slug mini-pipeline,
  evolution chronology) + warnings (page debt, underivable year, lens x-inversions ≥2yr).
  `bun run narratives:debt` prints the debt table (ignores drafts).
- GraphExplorer machinery extracted unchanged into `src/lib/graph/{edgeGeometry,useViewport,
  graphTheme}.ts` + `src/components/atlas/graph/{ZoomControls,NodeFinder}.tsx`
  (GraphExplorer 1526 → ~1240 lines, behavior identical).
- Frontend: `/atlas?view=narratives` 4th tab (cards w/ preview thumbnails, drafts
  admin-only), `/atlas/narratives/:slug` (NarrativeCanvas with lens switcher / story rail
  reading panel / node inspector / year ruler on timeline lens; MobileNarrativeView =
  stepped reading list, no canvas; URL state `?lens=&step=&node=`). Atlas pages show
  "In narrative:" header chip + sidebar Narratives section from narrative-refs.
  Essay HTML prerenders (SSR snapshot); canvas is client-only. Postbuild prerenders +
  sitemaps non-draft narratives only.
- Edge-type → theme tokens: prerequisite→rel-prereq, evolution→rel-extend,
  bridge→rel-flow (dashed), contrast→rel-compare (dotted) — dash carries the distinction
  where hues collide. Area colors are positional (`AREA_HUES` in narrativeLayout.ts).
- `content/narratives/example-draft.md` is a draft build fixture (never publishes);
  delete or replace when the first real narrative lands (Phase 5).
- Manual touch-emulation pass (Chrome device toolbar) still worth doing on the first
  published narrative: pan on background vs chip, tap-select, pinch-zoom, lens switch,
  mobile card expand, arrow keys vs inputs.

## Wave 2 session notes (2026-08-23)

- 8 papers registered (132 → 140): caron2021-dino (OpenAlex 404 — hand-authored like Vaswani),
  simeoni2025-dinov3 (OpenAlex had family/given names swapped — corrected), hinton2015-distillation,
  touvron2020-deit, liu2021-swin, chen2020-simclr, he2019-moco (arXiv-year id, not "he2020"),
  grill2020-byol. All 8 have research notes; the last 4 use the new structured format
  (`# Claimed contributions` + `# Stated relations`).
- New pages: knowledge-distillation + self-supervised-learning (survey, decision table) concepts;
  dino, dinov3, deit, swin models. dinov2 got the `## What v2 changed over v1` section, the
  `extended_by → dinov3` edge, +[self-supervised-learning, knowledge-distillation] prerequisites,
  +caron2021-dino ref. vit got `extended_by → deit` (user-confirmed, with caution note).
- User-confirmed relations (pivot workflow): vit→deit extended_by/high; swin↔vit prerequisite-only
  (no typed edge); deit↔swin compared_with/high (authored on deit); swin↔resnet compared_with/high
  (authored on swin); deit↔resnet skipped (prose only). hinton→deit expressed as a
  knowledge-distillation prerequisite, not a feeds_into. dino→dinov3 direct edge skipped
  (redundant with the extended_by chain).
- Draft QA: 474 audit entries across 7 drafts (kd 76, ssl 76, dino 79, dinov3 113, deit 62,
  swin 68), zero real misses. Flagged-and-kept honesty: Swin's paper-internal 83.5/83.3
  discrepancy documented on the page; dinov3's unstated w_D/w_DK weights stated as absent.
- implementations[] pinned: facebookresearch/dino@7c446df (Apache-2.0),
  facebookresearch/dinov3@6876159 (bespoke "DINOv3 License" — verified from repo LICENSE.md),
  facebookresearch/deit@7e160fe (Apache-2.0), microsoft/Swin-Transformer@f82860b (MIT).
- Deferred: registering radosavovic2020-regnet (DeiT's default teacher) for a future
  feeds_into edge; ibot paper (optional per plan); mae "surveyed-page" prerequisite decision.

## Phase 5 session notes (2026-08-23)

- First narrative authored by the main agent: `content/narratives/foundation-models-for-vision.md` —
  21 nodes (15 page-backed + 6 paper-debt), 22 edges, 4 hand-authored lenses (overview,
  ssl-lineage, distillation, anomaly-bridge) + generated timeline, 7 chapter-anchored steps
  following the plan's arc (substrate → images-as-tokens → classifier-to-representation →
  distillation-expands → vision-meets-language → three-bridges → AD design space).
- `clip` is a paper-debt node (radford2021-clip) until Wave 3 authors the page — the plan's
  "page-backed after waves 1–2" list assumed clip early; the debt mechanism resolves the
  phasing contradiction cleanly. ibot dropped (optional per plan).
- 5 papers registered (140 → 145), register-only, no notes yet: radford2021-clip,
  tschannen2025-siglip2, jeong2023-winclip, zhou2023-anomalyclip, liu2023-simplenet.
  Notes get written at page-authoring (debt-paydown) time.
- Validator footprint exactly as designed: 0 errors, 6 page-debt warnings + 1 no-year (vad),
  0 lens chronology inversions. Narrative prerendered + sitemapped (147 pages).
- Atlas-page chips and sidebar sections light up automatically via narrative-refs for all 15
  page-backed stops.

## Phase 6 session notes (2026-08-23)

- Backfill: 145 candidates → 74 matched by DOI, 61 by strict normalized title+year, 10 left
  unlinked (vaswani2017 + simeoni2025-dinov3 OpenAlex record glitches; rf-detr + depth-anything-3
  works carry zero author records; 6 classical papers with no clean match). 500 authors resolved;
  2 approved manual fixes applied: "Tomasi" → "Carlo Tomasi", and the misattributed "Jay B. Dean"
  id dropped from hinton2015-distillation (OpenAlex identity error — not Jeff Dean) → 499 authors.
- Backfill script gained a block-list `authors:` insertion fix (its own abort+restore sanity check
  caught the YAML break on first --write; no data was harmed).
- **Alignment caveat discovered**: `authors[]` and `authorIds[]` are NOT reliably position-aligned —
  OpenAlex drops authors on 8/135 papers. `src/lib/atlas/authorLinks.ts` aligns by surname (with
  umlaut transliteration + first-initial disambiguation): 632/640 slots linked, 0 misattributions.
- fetch-meta now emits `authorIds:` + authors.yaml stanza suggestions for every future ingest.
- Frontend: /authors (filter, A–Z/by-count), /authors/:id (papers via SourceCard, atlas chips,
  co-author list), author-name links in SourceStrip/SourceCard (stretched-overlay fix for nested
  anchors). 647 prerendered pages (+499 authors +1 index). Author search records emitted but inert
  until a global search palette consumes SearchRecord.path.

## Decisions log

- 2026-08-23 — **Structured ingestion pivot** (user-approved): for modern papers, the research-note
  template gains `# Claimed contributions` (verbatim-anchored) and `# Stated relations` (the paper's
  own Related-Work positioning as a quote-anchored table with *proposed* `relations[].type`).
  paper-ingest Step 4b becomes proposal-then-confirm: relations are still never auto-committed —
  the table is evidence, confirmed against the counterpart note + user/plan before any `Relations:`
  line is recorded. Applied from the Wave-2 BYOL/DeiT/Swin/DINOv3 extracts onward; the 4 earlier
  Wave-2 notes (distillation, DINO, SimCLR, MoCo) stay on the old format, backfilled only if a
  page draft needs it.

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
