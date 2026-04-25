---
name: deep-model-page
description: Write reference entries for the Vitavision deep-learning model register under content/models/*.md. Accepts a bare `arxiv:<id>`, `doi:<doi>`, or paper URL and drives the full pipeline — fetches metadata, appends to docs/papers/index.yaml, caches PDFs, gathers open-source implementations with verified licenses, synthesizes frontmatter, drafts the page. Each entry is a compact, textbook-style card — motivation, architecture, implementations, assessment, references. This is NOT a blog-post voice and NOT the tech-writer skill. For closed-form algorithms, use `algo-page` instead.
---

# Vitavision Deep-Learning Model Reference

A model page is a **reference entry in a register**, not an essay. It is read for fact lookup: what the model computes, its architecture, what open-source implementations exist under what licenses, and what distinguishes it from prior work. Prose is minimal and impersonal; architecture specs, tables, and citations carry the content.

This skill is the deep-learning counterpart of `algo-page`. The voice is identical — textbook/reference, not blog. The pipeline is identical — `arxiv:` / `doi:` / URL → `papers:fetch-meta` → `docs/papers/index.yaml` → `papers:fetch` → draft. The structure differs because the content differs: models have an architecture, not a closed-form formula, and they have one or more external implementations with licenses that matter.

## Structure

Five top-level sections, in this order, with these exact titles:

```
# Motivation
# Architecture
# Implementations
# Assessment
# References
```

No numbering prefix on the headings. No other top-level sections.

### `# Motivation`

One paragraph. State the model's input, its output, the class of problems it addresses, and what distinguishes it from the nearest prior approach — a **named** distinction, not a narrative one. No rhetorical opening, no history of the field, no attribution. Attribution lives in `# References`.

**Do not**: open with "Dense prediction has long been a challenge…", name multiple competing methods, quote authors.
**Do**: state what the model takes in, what it produces, and the property that makes it specific.

### `# Architecture`

The heart of the page. Four bolded sub-blocks — bold leads, **not** `##` subheadings, to keep the card compact:

1. **Family & shape.** Model family (CNN / ViT / encoder-decoder / diffusion / GAN / hybrid), input tensor shape, output tensor shape, backbone. One or two sentences.
2. **Blocks.** Layer inventory and the defining computation: attention flavor (vanilla / windowed / linear / flash), conv kernel sizes, residual pattern, normalization (BN / LN / GN / none). Include **one code snippet, ≤ 30 lines**, of the signature block of the architecture (the transformer block, the residual unit, the U-Net skip) when the design is non-obvious. Same rules as `algo-page` `# Implementation`: the code must be the block's computation, not a loader API call.
3. **Training.** Dataset(s), loss / objective, schedule in one sentence, augmentation. Report **one or two headline metrics** on the canonical benchmark with a paper-table citation (e.g. "Top-1 76.5 % on ImageNet-1k, Table 2"). Not a results dump.
4. **Complexity.** Parameter count, FLOPs / MACs at a stated input size, inference memory if the paper reports it. One line.

Use `:::definition[...]` blocks for named losses or architectural quantities with a defining formula (e.g. InfoNCE, triplet loss, classifier-free-guidance scale). Use `:::algorithm[...]` blocks for the training loop's procedure only when the loop has non-obvious steps (teacher-student distillation, EMA update, gradient reversal). Do not wrap a standard SGD loop in `:::algorithm`.

### `# Implementations`

Auto-rendered by `ModelPost.tsx` from the frontmatter `implementations[]` array. **Do not hand-write a markdown table here.** The body content for this section is at most a one-sentence lead clarifying scope (e.g. "Official Caffe release; PyTorch torchvision port widely used."); often the section body is empty and the table stands alone.

The frontmatter entry is the source of truth. See the Frontmatter section below for the schema.

### `# Assessment`

Three bolded sub-blocks, each 2–4 declarative bullets. No narrative, no hedging.

1. **Novelty.** What this paper contributed relative to antecedents. Name the antecedents; do not narrate. A bullet like "Replaces anchor boxes with point-based heatmap regression (contrast to Faster R-CNN's RPN)." is the form.
2. **Strengths.** Regimes or metrics where the model wins. Each bullet cites either a benchmark result (with table reference) or a qualitative capability that is a direct consequence of the architecture.
3. **Limitations.** Failure modes, compute cost, domain gaps, reproducibility caveats, licensing restrictions. A restrictive license on weights belongs here — readers planning to use the model need to know.

Bullets are declarative. No softeners, no marketing vocabulary, no opinions.

### `# References`

Numbered list. 1–5 entries. Format identical to `algo-page`:

```
1. Authors. *Title.* Venue, Year. [link-text](url)
```

Entry 1 is the primary paper. Follow-ups are the closest antecedents and the one or two extension papers a reader would chase next.

## Typography blocks

The site's directive-style blocks are shared across all content types. See `.claude/skills/algo-page/SKILL.md` §"Typography blocks" for the full table of blocks, their syntax, and authoring rules.

Model-page-specific pointers:

- **Named losses.** A loss with a closed-form definition (InfoNCE, SimCLR NT-Xent, classifier-free guidance) goes in a `:::definition[Name]` block under `# Architecture`, body = one-sentence gloss + display formula. Do not inline it in prose.
- **Training procedures.** Wrap a non-standard training loop (distillation, self-distillation, momentum encoder, EMA update) in an `:::algorithm[Name]` block with `::input[...]` / `::output[...]` leaf directives. Do not wrap a standard SGD loop.
- **Long display math.** Multi-term loss sums or the full attention score formula must wrap in `\begin{aligned}...\end{aligned}` with `\\` breaks. Same overflow rules as `algo-page`.

## Illustrations

Illustration rules are inherited verbatim from `.claude/skills/algo-page/SKILL.md` §"Illustrations" — the decision tree (Mermaid vs hand-authored SVG vs generated SVG), the hand-authored SVG rules, the generator-script requirements, the palette, the typography floor. Do not restate; treat them as binding.

Model-page-specific pointers:

- **Block diagrams are the archetypal earn-your-place figure for a model page.** A transformer encoder, a ResNet bottleneck, a U-Net's skip topology — these are near-impossible to describe in prose and trivial to read from a diagram.
  - If the block is < ~15 primitives (rectangles, arrows, labels) and has no data dependence, **hand-author the SVG** under `content/images/<slug>/block.svg`.
  - If the figure plots a learning curve, a scaling law, or a parameter-efficiency frontier, **write a generator script** under `py/generate_<slug>_<name>.py` that writes to `content/images/<slug>/<name>.svg`. Deterministic SVG, accessibility post-pass, Tailwind palette — same rules as `algo-page`.
- **Data-flow pipelines** (training loop, inference pipeline, multi-stage distillation) → Mermaid flowchart, inline.
- **Architecture block diagrams should not restate the `# Architecture.Blocks` code snippet.** Pick one — if the code is the clearer explanation, omit the figure; if the topology only reads cleanly visually, omit the code snippet.

Real-image output (segmentation masks on an example photo, detection overlays) belongs in a blog post or a demo, not on the reference card. Use `<!-- TODO figure: ... -->` placeholders only for figures that genuinely depend on real-image data; write a generator script for everything else.

## Frontmatter

Validates against `modelFrontmatterSchema` in `src/lib/content/schema.ts`.

```yaml
# Required
title: "..."                 # Display title (e.g. "ResNet", "SuperPoint")
date: YYYY-MM-DD
summary: "..."               # One sentence, index-card length
tags: [...]                  # At least one; start with "computer-vision" if applicable
category: ...                # detection | depth-stereo | pose-geometry | segmentation-flow | foundation-ssl | calibration-learning
author: "Vitaly Vorobyev"

# Required for any non-draft page
sources:
  primary: <paper-id>        # id from docs/papers/index.yaml
  references: [<paper-id>]   # additional cited papers
  notes: |
    Freeform grounding notes — defining equations, symbol
    definitions, table references used by the page.

implementations:             # 1..N entries — REQUIRED on non-drafts. First entry is the official repo when one exists.
  - role: official           # official | community | port
    repo: https://github.com/<owner>/<repo>
    commit: <sha>            # 7..40 hex chars; pins the impl version
    framework: pytorch       # pytorch | tensorflow | jax | caffe | other
    license: MIT             # SPDX-like string — verified from LICENSE at the pinned commit (see Workflow B9a)
    weights_url: https://... # optional
    weights_license: MIT     # required when weights_url is set
  # Add a community reimpl when one is materially more used than the official repo
  # (e.g. torchvision's ResNet is the de-facto reference even though deep-residual-networks is official).

# Optional — header badges
arch_family: cnn             # cnn | vit | encoder-decoder | diffusion | gan | hybrid
params: "25.5M"              # canonical config — human-readable
flops: "4.1 GMAC @ 224×224"  # canonical config — human-readable

# Optional — cross-links and metadata
difficulty: intermediate     # beginner | intermediate | advanced
draft: false
relatedPosts: [...]          # Blog post slugs
relatedAlgorithms: [...]     # Algorithm page slugs (for hybrid pipelines)
relatedDemos: [...]          # Demo page slugs
coverImage: "..."
```

`sources` is required for every non-draft page. `implementations[]` is required for every non-draft page — a model without a referenceable implementation cannot ship as non-draft.

## Workflow

This procedure is mandatory for any new or rewritten model page.

### Trigger

- **Bootstrap mode** fires whenever the user supplies an input token — `arxiv:<id>`, `doi:<doi>`, or a PDF / publisher URL — without a pre-filled frontmatter file. Example triggers: "draft arxiv:1512.03385", "draft doi:10.1109/ICCV.2017.322", "draft https://…/paper.pdf". Run Bootstrap §B1–B10 below, then continue with Workflow §4.
- **Legacy mode** fires when a page file already exists with filled `sources` and `implementations`. Skip Bootstrap and start at Workflow §1.

### Bootstrap (Claude-driven, for entirely new pages)

B1. **Resolve the input.** Parse to `arxiv:<id>` or `doi:<doi>`. URL → extract arxiv id or DOI first. `bun papers:fetch-meta` accepts all three forms.

B2. **Fetch metadata.** `bun papers:fetch-meta <arg>`; capture stdout YAML. Review `id` and `url` as in `algo-page` B2 — rename awkward ids now, replace fragile URLs with stabler mirrors.

B3. **Append to `docs/papers/index.yaml`.** Edit tool, end of file. Preserve inline `# <title>` comments on unresolved `<name><year>-???` cite lines.

B4. **Curate the cites list.** Same rules as `algo-page` B4: chase direct antecedents (the backbone paper, the training-objective paper, the seminal architecture the model extends), drop tangential citations.

B5. **Cache PDFs + text + ar5iv HTML.** `bun papers:fetch`.

B6. **Read the primary.** Prefer `docs/papers/.cache/<primary-id>.html` (ar5iv) for arxiv papers; `<primary-id>.txt` otherwise. Extract: the method section, the architecture block definitions, the training objective, the headline benchmark numbers, the parameter count and FLOPs. Note table and equation numbers — they will be cited in the page.

B7. **Choose the page slug.** Kebab-case, descriptive — the model's common name. `resnet`, not `he2016`. `superpoint`, not `detone2018`. `swin-transformer`, not `swin` (ambiguous) or `swin-v1` (version-chasing).

B8. **Synthesize the frontmatter — sources, category, and header metadata.** No body yet.
   - `title` (display name, quoted), `date: <today>`, `summary` (one sentence: what the model takes in, produces, and how it is trained), `tags` (at least `computer-vision` + primary task), `category` (one of the six vision-domain values), `difficulty: intermediate` unless clearly another tier, `author: "Vitaly Vorobyev"`.
   - `sources.primary`, `sources.references` (curated in B4 + cross-link candidates from `bun papers:query pages-using <ref-id>`), `sources.notes` (key equations / losses / table references grounding the page).
   - `arch_family`, `params`, `flops` if the paper reports them. Use the canonical configuration the paper tables compare against.
   - `relatedAlgorithms` / `relatedPosts` as applicable.
   - **Omit `implementations` for now; it is filled in B9a.**

B9. **Write `content/models/<slug>.md`** with the frontmatter above — no body, no `implementations` yet. This file will not validate as a non-draft until B9a completes; set `draft: true` temporarily if running a build during Bootstrap.

B9a. **Gather implementations.** Identify open-source implementations. Typical sources: the paper's footer / abstract / acknowledgments (the authors' repo), `paperswithcode.com/paper/<slug>` (community reimplementations ranked by stars), the primary paper's `code_url` on OpenAlex if present.

   For each candidate:
   1. Verify the repo resolves: `curl -fLsI https://github.com/<owner>/<repo> | head -3`. 200 or 301 is fine.
   2. Pick a pinned commit. Prefer a release tag's SHA over `main`. Find the tag via `https://github.com/<owner>/<repo>/releases` or `git ls-remote --tags`.
   3. Read the LICENSE file at that commit: `curl -fLs https://raw.githubusercontent.com/<owner>/<repo>/<sha>/LICENSE`. Record the SPDX-like identifier verbatim from the file's header. **Do not infer the license from README badges.** If there is no LICENSE file, the license is effectively "all rights reserved" — note this in `# Assessment.Limitations` and set `license: "unlicensed"`.
   4. If the impl ships weights separately, locate the download URL and the weights-license note (README, MODEL_CARD.md, HuggingFace model card). Record `weights_url` and `weights_license` verbatim. Weights licenses often diverge from code licenses (Apache-2.0 code + CreativeML Open RAIL-M weights; BSD-3-Clause code + LLaMA-3 community weights).
   5. Classify `role`:
      - `official` — the paper authors' repository.
      - `community` — a third-party reimplementation that is materially more used than the official repo, or fills a framework gap (e.g. torchvision's ResNet, timm's ViT).
      - `port` — a cross-framework port (e.g. a Caffe→PyTorch port of the official Caffe release). Classify as `port` only when the port's role is faithful reproduction; if the port added novel contributions, it is `community`.
   6. Write the entry into `implementations[]` in the page's frontmatter.

   **Floor.** One verified entry is the minimum for a non-draft page. If no public implementation exists, set `draft: true` and add a `# Assessment.Limitations` bullet noting "no public implementation"; the page can ship as a draft but not as a non-draft reference card.

B10. **Flip `draft: false`** once B9a wrote at least one valid entry. Continue with Workflow §4.

### What Bootstrap writes where

| Artifact | Location | Writer |
|---|---|---|
| Paper metadata stanza | `docs/papers/index.yaml` | Edit tool (B3, B4) |
| Cached PDF + `pdftotext` output | `docs/papers/.cache/<id>.{pdf,txt}` | `bun papers:fetch` (B5) |
| Cached ar5iv HTML (arxiv papers) | `docs/papers/.cache/<id>.html` | `bun papers:fetch` (B5) |
| Cached LICENSE files (optional) | `docs/impls/.cache/<owner>/<repo>/<sha>/LICENSE` | `curl` in B9a |
| Page frontmatter | `content/models/<slug>.md` | Write tool (B9) |
| Page body | `content/models/<slug>.md` | Workflow §7 drafting |

### Workflow steps

1. **Read `sources` and `implementations` from the page frontmatter.** If either is missing, run Bootstrap above.
2. **Cache the papers.** `bun papers:fetch <primary-id>` and `bun papers:fetch <ref-id>` for each reference.
3. **Re-verify implementations.** For each entry in `implementations[]`:
   - `curl -fLsI <repo>` returns 200/301.
   - `curl -fLs https://raw.githubusercontent.com/<owner>/<repo>/<commit>/LICENSE | head -3` returns the recorded license header.
   - If the repo has moved, rewritten history, or changed license: update the entry (or remove it with a note in working notes).
4. **Read the primary paper.** Prefer the cached ar5iv HTML for arxiv papers; `.txt` otherwise. Extract: architecture spec, loss definition, training protocol summary, headline benchmark numbers with their table references, parameter count, FLOPs.
5. **Read a reference implementation** when a design detail is unclear from the paper (attention dimensions, residual pattern, normalization placement, initialization). Pin every architectural claim on the page to either a paper section/equation or an impl file/line.
6. **Query the citation graph.** `bun papers:query cites <primary-id>` → candidates for `# References` and `relatedAlgorithms`. `bun papers:query pages-using <ref-id>` for each cited paper → cross-link candidates.
7. **Draft.** Use the 5-section template and the typography blocks. The `# Implementations` section body is empty or a single sentence — the React page renders the table from frontmatter.
7.5. **Illustration pass.** Scan each section against the "good signals" in the shared illustrations guidance. Typical figures for a model page:
   - Data-flow / training pipeline → Mermaid (inline).
   - Architecture block diagram → hand-authored SVG (< ~15 primitives) OR skip and let the code snippet in `# Architecture.Blocks` carry the design.
   - Learning curve, scaling law, efficiency frontier → generator script under `py/generate_<slug>_<name>.py`.
   Do not include real-image output from the model — that belongs in a demo or a blog post. At most two figures per page.
8. **Quality gate.** Enumerate every numerical constant, symbol, benchmark number, parameter count, and label on any figure. For each, write the source line in working notes: paper §/equation/table, or impl file/line. Anything untraceable is fabricated or implementation noise — fix or remove. *Pay special attention to the `implementations[]` entries: each license must be grounded in the LICENSE file at the pinned commit, each weights-license must be grounded in the README / MODEL_CARD at the matching commit or release.*
9. **Verify.** `bun run build && bun run lint && npx vitest run`.

## Voice rules

Voice rules are inherited from `.claude/skills/algo-page/SKILL.md` §"Voice rules". Do not restate; treat them as binding.

The shortlist, for recall:

- Impersonal. No first person.
- Declarative. Statements of fact or definition.
- Minimal glue prose. One sentence between math/code blocks, usually.
- No narrative arc.
- No attribution in prose; authors live in `# References`.
- Sentences short; passive voice acceptable when it keeps the subject nominal.
- No softeners, no marketing words, no hedges.

## Forbidden patterns

Inherit the full `algo-page` forbidden-patterns list (first-person sentences, library-usage code, attribution in prose, narrative openers, "in practice" closers, "reference implementation: <crate>" bullets, horizontally-overflowing display math, etc.). The list below is the **model-page-specific additions**:

- **No first-person benchmarks in `# Architecture.Training`.** Report the paper's numbers with a table citation ("Top-1 76.5 %, Table 2"), not measurements from any personal rerun. Personal benchmarks belong in blog posts.
- **No loader-API code** in `# Architecture.Blocks`: no `pip install transformers`, no `AutoModel.from_pretrained(...)`, no `torchvision.models.resnet50(pretrained=True)`. The snippet is the block's computation (the attention, the residual, the sampling step), not the API for loading published weights.
- **No "state-of-the-art on <benchmark>" bullet in `# Assessment.Strengths`** without a year and a delta. "SOTA" without context is marketing. "Top-1 76.5 % vs ResNet-34's 73.3 % on ImageNet-1k (2015)" is acceptable.
- **No license string that is not grounded in the LICENSE file at the pinned commit.** Inferring the license from a README badge, a shields.io URL, or the `package.json` is banned. The Workflow's B9a step mandates reading the LICENSE file; the quality gate in §8 verifies it.
- **No "we" or "our" in Assessment bullets.** The page is not a paper. "Outperforms" and "achieves" are fine; "we outperform" is not.
- **No "future work" bullet in `# Assessment.Limitations`.** Limitations are actual limitations of the model as it stands, not paper-future-work placeholders.
- **No personal ranking in `# Implementations` body prose** ("the best PyTorch implementation is X"). If a community impl is materially more used than the official, the frontmatter `role: community` + presence in the table is the signal — do not editorialize in prose.

## Checklist

Run before handing off a draft.

- [ ] Exactly five top-level sections, in order: Motivation, Architecture, Implementations, Assessment, References. No numbered heading prefixes.
- [ ] `# Motivation` is one paragraph. No narrative, no attribution, no named alternative tools.
- [ ] `# Architecture` has four bolded sub-blocks in order: **Family & shape.**, **Blocks.**, **Training.**, **Complexity.**. Each is declarative; glue prose is one sentence per gap at most.
- [ ] The `# Architecture.Blocks` code snippet (if present) shows the block's computation, not a loader API. ≤ 30 lines. Language tag on the code fence.
- [ ] `# Architecture.Training` headline numbers cite a paper table or equation. No personal benchmark numbers.
- [ ] `# Implementations` body is empty or a single sentence. The table is rendered from frontmatter; no hand-written markdown table.
- [ ] `# Assessment` has three bolded sub-blocks in order: **Novelty.**, **Strengths.**, **Limitations.**. 2–4 bullets each. Each bullet declarative.
- [ ] `# References` is a numbered list. 1–5 entries. Primary source is entry 1.
- [ ] Frontmatter: `category` present, valid value.
- [ ] Frontmatter `sources:` block populated: `primary` set; `references` lists every paper cited in `# References`; `notes` summarizes equations / losses / tables the page references.
- [ ] Frontmatter `implementations:` has ≥ 1 entry (or the page is `draft: true`). Every entry has `role`, `repo`, `commit` (7–40 hex), `framework`, `license`. Every `weights_url` has a matching `weights_license`.
- [ ] **Every `license` field has been verified by reading the LICENSE file at the pinned `commit`** via `curl https://raw.githubusercontent.com/<owner>/<repo>/<sha>/LICENSE`. Working notes record the verification.
- [ ] Every paper id in `sources:` exists as an entry in `docs/papers/index.yaml`.
- [ ] Working notes trace every numerical constant, benchmark number, parameter count, FLOPs figure, and figure label to a specific source line — paper §/equation/table, or impl file/line, or LICENSE file.
- [ ] `# Assessment.Limitations` includes a bullet when a restrictive weights license (CC-BY-NC, RAIL, bespoke research-only) limits practical use.
- [ ] No first-person pronouns anywhere on the page.
- [ ] No softeners, no marketing vocabulary, no hedges.
- [ ] Math uses `$...$` and `$$...$$`. Every code fence has a language tag.
- [ ] Every display-math formula fits within the content column — long loss sums use `\begin{aligned}...\end{aligned}` with explicit `\\` breaks.
- [ ] Illustration pass done: at most two figures. Mermaid pipelines inline; hand-authored SVGs under `content/images/<slug>/`; generated SVGs have a sibling `py/generate_<slug>_<name>.py` committed alongside the SVG, deterministic, accessibility post-pass, Tailwind palette — same rules as `algo-page`.
- [ ] No real-image model-output figure committed as a reference-card illustration. Real-image figures belong in a demo or blog post.

## When not to use this skill

- For **closed-form algorithms** (FAST, Harris, ChESS, non-maximum suppression, homography refinement), use `algo-page`. The `# Algorithm` section with defining formulas and per-pixel code is the right shape for those.
- For **blog posts about a model** — history, intuition, comparison narrative, personal benchmarks — use `tech-writer`. Move the material to `content/blog/` and link back to the model page via `relatedModels`.
- For **hybrid pipelines that combine a learned component with a classical algorithm** (e.g. SuperGlue on top of SuperPoint), pick the content type that dominates: if the page's primary contribution is the learned matcher's architecture, use `deep-model-page`; if it is the classical geometric verification, use `algo-page`. The other component goes in `sources.references` or `relatedAlgorithms` / `relatedModels`.

## Resources

- [references/deep-model-page-template.md](references/deep-model-page-template.md) — copy-pasteable skeleton
- `.claude/skills/algo-page/SKILL.md` — the companion skill. Voice rules, typography blocks, and illustration rules are inherited from there.
- `/Users/vitalyvorobyev/vitavision/docs/papers/index.yaml` — registry of authoritative sources (papers + citation graph). Query via `bun papers:query`.
- `bun papers:fetch [id]` / `bun papers:fetch-meta <arxiv-id|doi>` / `bun papers:query <relation> <id>` — the three reasoning tools that drive the Workflow above.
- `.venv/bin/python py/generate_<slug>_<name>.py` — repo-root venv (matplotlib, numpy preinstalled) for running generator scripts. Model generators on `py/generate_harris_eigenvalue_regions.py`.
- `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/LICENSE` — the canonical source for an implementation's license string. Read the file; do not infer.
