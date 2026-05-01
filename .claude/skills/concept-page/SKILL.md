---
name: concept-page
description: Author or update a concept page in content/concepts/. Concepts span multiple sources; the skill enforces the page-creation criterion (3+ public-page references AND ≥500 words substantive content) and reads research notes for cited papers. Closed-form algorithms use algo-page; deep-learning models use deep-model-page.
---

# Vitavision Concept Reference

A concept page is a **reference entry for a mathematical or algorithmic idea** that underpins multiple algorithms or models — not an essay, not a tutorial. It is read to understand what the concept is, how it is formalized, where it breaks down numerically, and which registered pages use it.

The closest analogues are Wikipedia's mathematics articles, *Numerical Recipes* chapters on foundational topics, and introductory graduate textbook sections. The voice is identical to `algo-page` — impersonal, declarative, minimal glue prose between math. See `.claude/skills/algo-page/SKILL.md §"Voice rules"` for the full voice specification.

Use this skill for cross-cutting mathematical ideas (`homography`, `structure-tensor`, `scale-space`). Use `algo-page` for closed-form algorithms with a specific procedure. Use `deep-model-page` for learned models.

## Page-creation criterion (FIRST gate — evaluate before any other step)

**Do not create a new concept page unless both conditions are met:**

1. The concept is referenced as a `prerequisites` entry in 3 or more existing or planned public pages (`content/algorithms/`, `content/models/`, `content/concepts/`).
2. The concept can support at least 500 words of substantive standalone content across the five required sections.

If either condition is not met, **reject the request** and suggest where the topic should live:

- If only 1–2 pages reference it: suggest adding the concept as a `## <Concept>` subsection inside the most relevant existing algorithm or model page.
- If the topic is too narrow for 500 words: same — it's a section, not a page.

Report clearly: "This concept does not meet the page-creation criterion because [reason]. It belongs as a section in [existing-slug]."

## Structure

Five top-level sections, in this order, with these exact titles:

```
# Definition
# Mathematical Description
# Numerical Concerns
# Where it appears
# References
```

No numbering prefix on headings. No other top-level sections. This matches the existing MVP concept pages in `content/concepts/`.

### `# Definition`

One or two paragraphs. State the concept precisely: what it is, what it takes as input, and what it produces. Give the defining formula immediately — do not delay it to `# Mathematical Description`. Use a `:::definition[...]` block for the central named quantity if it has a short display formula; otherwise write a display equation in line with the prose.

No narrative opening. No "this concept is important because." No attribution — attribution lives in `# References`.

### `# Mathematical Description`

The formal development. Use `## <Subsection>` headings when the concept has multiple distinct named constructions (e.g. the structure tensor has eigenvalue classification, three response functions, two-scale construction, and a relation to the autocorrelation surface — each is a subsection). Use `:::definition[Name]` blocks for named quantities with defining formulas.

Each subsection is self-contained: one or two sentences of context, then the math, then at most one or two sentences of consequence. No narrative transitions, no intuition paragraphs.

### `# Numerical Concerns`

Bulleted or sub-sectioned. Cover, as applicable: floating-point accumulation, ill-conditioning, scale sensitivity, boundary effects, threshold units and portability, precision requirements (32- vs 64-bit), normalization requirements. Be specific: "for 8-bit images, $I_x^2$ spans $[0, 4 \times 255^2]$; use 32-bit accumulators" beats "use appropriate precision."

This section has no counterpart in algo-page. It is mandatory for concept pages because the same concept appears across many implementations with different numerical choices.

### `# Where it appears`

A paragraph or short list naming the specific registered pages that use this concept, and exactly how each uses it. Name the page slug explicitly. For example: "harris-corner-detector computes $M$ as described above; the Harris response $R = \det(M) - k\,\mathrm{tr}(M)^2$ is the standard cornerness score."

If the concept appears in unregistered algorithms (Lucas-Kanade, etc.), mention them by name with a note that they are not yet registered.

### `# References`

Numbered list. 1–5 entries. Format identical to `algo-page`:

```
1. Authors. *Title.* Venue, Year. [link-text](url)
```

The first entry is the paper or textbook that introduced or canonically formalized the concept. Follow-ups are the closest antecedents or extensions.

## Frontmatter

Validates against `conceptFrontmatterSchema` in `src/lib/content/schema.ts`.

```yaml
# Required
title: "..."             # Display title
date: YYYY-MM-DD
summary: "..."           # One sentence, index-card length
tags: [...]              # At least one
author: "Vitaly Vorobyev"
category: ...            # image-formation | geometry | feature-theory | calibration-theory

# Optional relationship fields
prerequisites: []        # concept slugs this concept depends on (often empty for primitives)
related: [...]           # algorithm/model slugs that genuinely use this concept
comparedWith: []         # rare for concepts; used when two formulations are directly contrasted
failureModes: []         # always empty in MVP; required as placeholder

# Optional sources
sources:
  primary: <paper-id>    # id from docs/papers/index.yaml — omit if no canonical paper
  references: [<paper-id>]
  notes: |
    Freeform grounding notes.
```

`category` is required. `related` is strongly recommended — a concept page with no `related` entries is not yet doing its job in the graph. `prerequisites` is often empty for primitive concepts (`image-gradient`, `homography`) but populated for derived ones.

**Do not write `usedBy:` or any reverse field.** Reverse edges are derived by the build.

## Workflow

### Step 1 — Page-creation criterion check

Evaluate the criterion before doing anything else. Count how many existing `content/algorithms/` and `content/models/` pages list the concept slug in their `prerequisites` field. Count planned pages from any open research notes. If the count is below 3, reject. If the planned content is too narrow for 500 words, reject.

### Step 2 — Read relevant research notes

Discover via three paths:

1. Explicit paper IDs given in the invocation (`Use concept-page on homography with papers hartley1997-homography, ma2003-invitation`).
2. `grep -rl "<concept-slug>" docs/research/notes/` — notes that mention the concept.
3. Paper IDs already in the existing concept page's `sources.references` (if updating an existing page).

Read each discovered note. The note's `# Core idea`, `# Assumptions`, `# Failure regime`, and `# Numerical sensitivity` sections are reasoning context. The `## UPDATE: <slug>` or `## NEW: <slug>` bullets in the note's `# Atlas update plan` are authoritative content guidance for the sections named.

### Step 3 — Cache papers

`bun papers:fetch <paper-id>` for each source. Read the primary source from `docs/papers/.cache/<paper-id>.html` (ar5iv) or `.txt` (pdftotext). Extract defining equations, named quantities, and section/equation numbers — you will cite these in Provenance of working notes.

### Step 4 — Synthesize across sources

Concept pages cite multiple papers; each claim must be attributable. Guard against single-source bias: **at least 3 of the 5 sections must draw from 2 or more distinct sources or textbook references**. If only one paper covers the topic, the concept belongs in a section inside that paper's algorithm page, not as a standalone concept page.

Do not copy bullets from research notes verbatim — synthesize. The note's bullets are content guidance; the page skill owns the page's format, prose, and structure.

### Step 5 — Draft

Use the 5-section template (Definition, Mathematical Description, Numerical Concerns, Where it appears, References) and the typography blocks from `algo-page/SKILL.md`. Apply voice rules (impersonal, declarative, minimal glue prose, no narrative arc).

Use `:::definition[Name]` blocks for central named quantities. Use `:::algorithm[...]` blocks only when the concept has a procedural aspect (e.g. the scale-space construction has discrete steps). Do not use `:::algorithm[...]` for purely mathematical definitions.

Study the existing 5 MVP concept pages for style reference:
- `/Users/vitalyvorobyev/vitavision/content/concepts/structure-tensor.md` — canonical example of the reference-entry voice and five-section structure.

### Step 6 — Validate

```bash
bun run build && bun run scripts/validate-content.ts
```

The build validates slug references, prerequisite cycles, missing source IDs, and quality-gate violations. Fix any errors before handing off the draft.

## Voice rules

Voice rules are inherited from `.claude/skills/algo-page/SKILL.md §"Voice rules"`. The shortlist:

- Impersonal. No first person.
- Declarative. Statements of fact or definition.
- Minimal glue prose. One sentence between math blocks, usually.
- No narrative arc.
- No attribution in prose; authors live in `# References`.
- Sentences short; passive voice acceptable.
- No softeners, no marketing words, no hedges.

## Forbidden patterns

Inherit the full `algo-page` forbidden-patterns list. The following are concept-page-specific additions:

- **No single-source concept pages.** If the entire page draws from one paper, the topic belongs as a section inside that paper's algorithm page, not as a standalone concept.
- **No "fundamental to all of computer vision" openers.** The `# Definition` section begins with a precise statement of what the concept is, not with a claim about its importance.
- **No paraphrase of the `# Definition` as the opening sentence of `# Mathematical Description`.** The definition is already stated; `# Mathematical Description` develops it.
- **No Wikipedia-style "history of" paragraphs** — attribution lives in `# References`.
- **No pairwise concept comparisons as standalone pages.** Use `comparedWith:` field + inline `## When X vs Y` subsection.

## Checklist

Run before handing off a draft.

- [ ] Page-creation criterion met (3+ references, ≥500 words). Documented in working notes.
- [ ] Exactly five top-level sections, in order: Definition, Mathematical Description, Numerical Concerns, Where it appears, References. No numbered heading prefixes.
- [ ] `# Definition` contains the defining formula. No narrative opener.
- [ ] `# Mathematical Description` develops the formalism with named quantities in `:::definition[...]` blocks.
- [ ] `# Numerical Concerns` covers at least floating-point behavior and scale sensitivity (when applicable).
- [ ] `# Where it appears` names specific registered page slugs.
- [ ] `# References` is a numbered list, 1–5 entries.
- [ ] Frontmatter: `category` present and valid. `related` populated.
- [ ] At least 3 of the 5 sections draw from ≥2 distinct sources.
- [ ] No first-person pronouns anywhere on the page.
- [ ] No `usedBy:` or any reverse field in frontmatter.
- [ ] Every paper id in `sources:` exists in `docs/papers/index.yaml`.
- [ ] `bun run scripts/validate-content.ts` passes.

## Resources

- `docs/research/templates/source-note.md` — template for private notes that feed into this skill.
- `content/concepts/structure-tensor.md` — canonical exemplar of concept-page structure and voice.
- `src/lib/content/schema.ts` — `conceptFrontmatterSchema` defines the exact frontmatter schema.
- `docs/papers/index.yaml` — registry of authoritative sources.
- `bun papers:fetch [id]` / `bun papers:fetch-meta <arg>` — metadata and PDF caching.
