# Vitavision Atlas — Authoring Guide

This is the entry point for everyone (you, me, Claude in a future session) who needs to add or update content on the site. It explains what the atlas is, how the pieces fit together, and the exact workflow for the four content paths: paper-driven algorithm/model pages, concepts, research notes, and blog posts.

If you only have time for one section, read **§6 Workflow at a glance**.

---

## 1. What the atlas is

`vitavision.dev/algorithms` is a connected **practical computer vision atlas**: short reference cards for algorithms, models, and concepts, cross-linked by a typed relationship graph (prerequisites, related, compared-with, used-by, failure-modes). The atlas is intentionally curated — depth and correctness over coverage. Public pages are source-grounded and machine-checked; private research notes carry the reasoning substrate that backs the public content.

Public site lives at:
- `/algorithms` — the atlas index (heading: "Atlas"; URL kept stable for SEO).
- `/algorithms/<slug>` — algorithm pages.
- `/algorithms/models/<slug>` — model pages.
- `/concepts/<slug>` — concept pages.
- `/blog`, `/blog/<slug>` — blog posts (separate from the atlas).

## 2. Content types

| Type | Path | Cardinality with sources | When to create |
|---|---|---|---|
| **Algorithm page** | `content/algorithms/*.md` | **1:1** with primary paper. Other papers go in `sources.references`. | One canonical paper introduces a closed-form method. |
| **Model page** | `content/models/*.md` | 1:1 with primary paper for single-paper models; or 1:family for ResNet/YOLO-style families. | Deep-learning models. Don't chase minor versions — update the family page. |
| **Concept page** | `content/concepts/*.md` | Many-to-many. Cites multiple papers and textbooks. | A reusable mathematical/geometric object referenced by **3+ existing or planned pages** AND supports **≥500 words** of substantive standalone content. |
| **Blog post** | `content/blog/*.md` | Free-form. | Long-form notes, write-ups, exploratory work. Not part of the atlas. |
| **Research note** | `docs/research/notes/<paper-id>.md` | 1:1 with paper. | Always created during paper ingestion. Committed to GitHub but not deployed. |

## 3. The relationship graph

Each public page declares **forward edges** in frontmatter:

```yaml
prerequisites:    [image-gradient, structure-tensor]
related:          [shi-tomasi-corner-detector]
comparedWith:     [shi-tomasi-corner-detector, fast-corner-detector]
failureModes:     []
relatedAlgorithms: [...]   # legacy alias, normalized into related at build
```

The build emits `src/generated/content-graph.ts` containing nodes + forward edges + **derived reverse edges** (`usedBy`, mirrored `comparedFrom` and `relatedFrom`, `affects`). The relationship panel on detail pages reads both directions; never author reverse edges by hand.

All slugs are validated against a single global namespace covering algorithms + models + concepts + (eventually) failure-modes. Unknown slugs are hard build errors.

## 4. Comparisons and surveys

`comparedWith:` declares an algorithmic comparison edge. Comparison **content** — actual prose contrasting two methods — lives on exactly one side of the pair, not on both, and not on a separate page.

### Two-way: inline on the more-authoritative page

The host page carries a `## When to choose X over Y` section inside `# Remarks` (or as a final subsection of `# Algorithm` when the contrast is purely algorithmic). The non-host page does **not** duplicate the content; it carries a single `# Remarks` bullet pointing back:

```markdown
- Compared with Harris: see [When to choose Harris over Shi-Tomasi](/atlas/harris-corner-detector#when-to-choose-harris-over-shi-tomasi). The Harris page hosts the comparison.
```

**More-authoritative tiebreaker**, applied in order:

1. **Older paper hosts.** The page whose primary paper introduced the idea first.
2. **Same year → more general scope hosts.** General-purpose corner detector hosts vs. specialized variant; the gradient-based formulation hosts vs. its application to a specific target.
3. **Tied → author judgment, recorded in the commit message.** No "more cited" rule — citation counts are unstable and we do not track them.

### Three-or-more-way: a survey concept page

Pairwise pages are prohibited. A survey of ≥3 methods lives as a **concept page**, not as an algorithm page (concept pages allow `sources:` to be omitted and have no primary-paper requirement). Required:

- `content/concepts/<survey-slug>.md` — e.g. `general-purpose-corner-detection.md`, `x-corner-detection-for-calibration.md`.
- ≥3 surveyed methods.
- ≥800 words of substantive content.
- A decision table near the top (rows = methods, columns = "use when / avoid when / typical cost / typical accuracy").
- Each surveyed algorithm page lists the survey concept in its `related` (so the relationship panel surfaces it from each method's page).

### Agentic discipline

Comparison content is written agentically only when the **research notes for both papers exist** under `docs/research/notes/`. If either is missing, the page-authoring skill must refuse and request `paper-ingest` first. This is enforceable: the skill greps for both `<paper-id>.md` files and aborts if either is absent. Without paper grounding, comparison prose is hallucination — exactly what the README's "never publish raw LLM extractions" rule forbids.

For surveys: at least 3 of the surveyed methods' primary papers must have research notes before the concept page can be drafted.

## 5. The four authoring skills

| Skill | Purpose | Touches |
|---|---|---|
| `paper-ingest` | Convert a paper (arxiv ID, DOI, URL, or local PDF) into a private research note. Maps to existing atlas pages, writes an "Atlas update plan" as bullets. | `docs/research/notes/<paper-id>.md`, `docs/papers/index.yaml`. **Never** `content/**`. |
| `algo-page` | Author or update an algorithm page. Reads research notes for the page's primary paper if present. | `content/algorithms/<slug>.md`, `docs/papers/index.yaml`. |
| `deep-model-page` | Author or update a deep-learning model page. Family pages vs single-paper pages. | `content/models/<slug>.md`, `docs/papers/index.yaml`. |
| `concept-page` | Author or update a concept page. Enforces the 3+ refs / 500+ words criterion. Reads multiple research notes when synthesizing. | `content/concepts/<slug>.md`. |

The four skills cover every authoring path. There is **no separate `atlas-update` skill** — page skills handle both create-from-scratch and apply-update-plan.

## 6. Workflow at a glance

### Path A — paper-driven (the common case)

```
new paper          paper-ingest                   review                 algo-page / deep-model-page / concept-page                 validate
arxiv:2304.02643 → docs/research/notes/<id>.md →  read the           →  apply the "## NEW: <slug>" or "## UPDATE: <slug>" bullets → bun run build
                                                  Atlas update plan      to the public page                                          + validate-content.ts
```

Concrete:

```text
You: Use paper-ingest with arxiv:2304.02643. Don't modify public pages yet.
→ writes docs/research/notes/<paper-id>.md, leaves content/** untouched.

You: review the note (especially the # Atlas update plan section at the bottom).

You: Use algo-page on harris-corner-detector. Apply the bullets from
     docs/research/notes/<paper-id>.md.
→ updates content/algorithms/harris-corner-detector.md.

You: bun run build && bun run scripts/validate-content.ts
```

### Path B — concept page (no single paper)

Concepts span many sources. Don't go through `paper-ingest` first; start at the page skill:

```text
You: Use concept-page to evaluate whether "epipolar geometry" meets the
     page-creation criterion given current atlas pages.
→ skill checks 3+ refs / 500+ words criterion. If it passes, drafts
  content/concepts/epipolar-geometry.md citing multiple papers from
  docs/papers/index.yaml.
```

### Path C — blog post

Blog is outside the atlas. Just create `content/blog/<slug>.md` with the standard frontmatter (`title`, `date`, `summary`, `tags`, `author`). See `docs/blog-authoring-guide.md` for the long form.

## 7. Research notes — the reasoning substrate

`docs/research/notes/<paper-id>.md`. One file per paper. Naming matches `docs/papers/index.yaml` so discovery is automatic — when Claude reads a public page's `sources.primary: harris1988-corner`, the corresponding note is at a known path.

Notes are **unpublished working drafts**, not private — they are committed to the public GitHub repo (so a fresh checkout has the full reasoning substrate, version history, and reproducibility) but excluded from the deployed site: not built, not indexed, not in sitemap or RSS. The postbuild guard in `scripts/postbuild.ts` fails the build if any `docs/research/` path leaks into `dist/`.

**Authoring rule:** write every research note as if a peer reviewer or paper author might read it tomorrow. No surprise-attributable critical takes, no sensitive third-party material, no half-formed opinions you would not put in a blog post. Personal opinion lives in `content/blog/`, not here.

What goes in a note (see `docs/research/templates/source-note.md`):
- **Setting** — problem class, inputs/outputs with preconditions
- **Core idea** — mechanism in 3-6 sentences, equations adjacent to prose
- **Assumptions** — preconditions for validity (soft vs hard)
- **Failure regime** — when it breaks, empirically and theoretically
- **Numerical sensitivity** — conditioning, scale, precision
- **Applicability** — use-when / don't-use-when / compared-against
- **Connections** — upstream (builds-on), downstream (enables), refutes/supersedes
- **Atlas update plan** — `## NEW: <slug>` or `## UPDATE: <slug>` bullets per affected page
- **Provenance** — section/equation citations, short quotes only when paraphrasing would change meaning

Notes are **page-authoring focused**: every field exists because it serves writing or updating a public page.

## 8. Validation

Run before every commit:

```bash
bun run build              # type-check + content-build + Vite + postbuild guard
bun run lint               # ESLint
npx vitest run             # 238 unit tests
bun run scripts/validate-content.ts          # public pages only
INCLUDE_DRAFTS=true bun run scripts/validate-content.ts   # public + drafts
```

What validation catches:
- Unknown slugs in `prerequisites` / `related` / `comparedWith` / `failureModes` / `relatedAlgorithms`.
- Cycles in the prerequisites graph.
- Missing source IDs (any `sources.primary` or `sources.references` not in `docs/papers/index.yaml`).
- `quality: canonical` pages missing the canonical-gate fields.
- Non-draft model pages missing `implementations[]`.
- `docs/research/` paths leaking into `dist/`.

## 9. Frontmatter quick reference

Every public page shares the base fields:

```yaml
---
title: "..."
date: 2026-04-30
summary: "One sentence. Subject-first."
tags: ["..."]
author: "Vitaly Vorobyev"
draft: true                # default: false (public). Hides until INCLUDE_DRAFTS=true.
quality: stub | canonical  # optional. Stub = visible placeholder; canonical = strict gate.
difficulty: beginner | intermediate | advanced

# Relationship fields (all optional; all forward edges)
prerequisites: []
related: []
comparedWith: []
failureModes: []

# Sources (algorithms/models: required for canonical; concepts: optional)
sources:
  primary: harris1988-corner       # paper-id in docs/papers/index.yaml
  references: [shi-tomasi1994-features, ...]
---
```

Type-specific fields (`category` enum, `editorAlgorithmId`, model `implementations`, etc.) live in `src/lib/content/schema.ts`.

## 10. What never gets deployed to the site

- Anything under `docs/research/` (committed to GitHub, excluded from `dist/`).
- Anything under `docs/atlas-vault/` (generated Obsidian projection; see §11).

- Full quotes from papers (use short quotes inline only when paraphrasing would change technical meaning).
- Raw LLM extractions of paper content. Always synthesize against your own understanding plus the research note's structured fields.
- Pairwise comparison pages. Use `comparedWith:` plus an inline `## When to choose X over Y` section in the more authoritative page.
- Any frontmatter field you invented. Schema is checked at build time.

## 11. Atlas vault — graph view in Obsidian

`docs/atlas-vault/` is a generated Obsidian-compatible projection of the atlas. Every algorithm, model, concept, and paper becomes a stub `.md` whose body is `[[wikilinks]]` for every forward edge — useful for opening in Obsidian and looking at the atlas as a graph (clusters by shared concepts, by `comparedWith`, by paper citations).

```bash
bun run vault:build       # regenerate docs/atlas-vault/ from content/** + docs/papers/index.yaml
```

The vault is a derived artifact: never edit it by hand, never author from it. It is committed (so a fresh checkout has the same graph state) but excluded from the deployed site by the postbuild guard. Open `docs/atlas-vault/` as a vault in Obsidian; the `.obsidian/` config folder is gitignored.

## 12. Further reading

- `docs/research/README.md` — deep dive on research notes (Section 6 expanded).
- `.claude/skills/paper-ingest/SKILL.md` — paper-ingest workflow detail.
- `.claude/skills/algo-page/SKILL.md` — algorithm page authoring rules.
- `.claude/skills/deep-model-page/SKILL.md` — model page rules.
- `.claude/skills/concept-page/SKILL.md` — concept page rules.
- `.claude/CLAUDE.md` — atlas authoring policy (machine-readable for Claude).
- `.claude/AGENTS.md` — concise operating guide for agent sessions.
- `~/.claude/plans/i-want-to-brainstorm-splendid-scott.md` — the original implementation plan, useful as historical context.

`docs/practical-computer-vision-atlas-spec.md` is the **original spec from the brainstorming phase**, kept for posterity. The actual implementation diverged significantly through grilling — read this `README.md` and the skill SKILL.md files for what was built.
