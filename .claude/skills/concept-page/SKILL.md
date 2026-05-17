---
name: concept-page
description: Author or update a concept page in content/concepts/. Concepts span multiple sources; the skill enforces the page-creation criterion (a genuinely fundamental, cross-cutting concept with ≥500 words of substantive content, synthesised from ≥3 sources) and reads research notes for cited papers. Closed-form algorithms use algo-page; deep-learning models use deep-model-page.
---

# Vitavision Concept Reference

A concept page is a **reference entry for a mathematical or algorithmic idea** that underpins multiple algorithms or models — not an essay, not a tutorial. It is read to understand what the concept is, how it is formalized, where it breaks down numerically, and which registered pages use it.

The closest analogues are Wikipedia's mathematics articles, *Numerical Recipes* chapters on foundational topics, and introductory graduate textbook sections. The voice is identical to `algo-page` — impersonal, declarative, minimal glue prose between math. See `.claude/skills/algo-page/SKILL.md §"Voice rules"` for the full voice specification.

Use this skill for cross-cutting mathematical ideas (`homography`, `structure-tensor`, `scale-space`). Use `algo-page` for closed-form algorithms with a specific procedure. Use `deep-model-page` for learned models.

## Page-creation criterion (FIRST gate — evaluate before any other step)

**Create a new concept page only when the topic is a genuinely fundamental, cross-cutting computer-vision concept that can support at least 500 words of substantive standalone content across the five required sections.**

The number of pages that currently reference the concept is **not** a gate — a fundamental concept earns a page even before its dependents are written. (A concept that no current or planned algorithm/model/concept page builds on is probably too peripheral to be "fundamental"; prefer to defer it.)

What still gates: the **≥500-words substance** test above, and the **source-diversity** rule — a concept page must synthesise ≥3 distinct sources (see Step 2 and Step 4). A topic backed by a single paper belongs as a section inside that paper's page, not as a standalone concept.

If the topic cannot support 500 words of substantive content, **reject the request**: it is too narrow for a page. Suggest adding it as a `## <Concept>` subsection inside the most relevant existing algorithm or model page.

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

**Source kinds.** `sources.primary` and `sources.references[]` accept `<bare-id>` (defaults to `paper`), `paper:<id>`, `repo:<url>@<sha>`, or `doc:<repo-relative-path>`. Concepts most often cite `paper:` and occasionally `doc:` (a textbook chapter, a foundational design doc); `repo:` is rare for concepts but accepted when the canonical reference for the concept is a repo (e.g. an algorithm whose only specification is a reference implementation).

`category` is required. `related` is strongly recommended — a concept page with no `related` entries is not yet doing its job in the graph. `prerequisites` is often empty for primitive concepts (`image-gradient`, `homography`) but populated for derived ones.

**Do not write `usedBy:` or any reverse field.** Reverse edges are derived by the build.

## Workflow

### Step 1 — Page-creation criterion check

Evaluate the criterion before doing anything else. Count how many existing `content/algorithms/` and `content/models/` pages list the concept slug in their `prerequisites` field. Count planned pages from any open research notes. If the count is below 3, reject. If the planned content is too narrow for 500 words, reject.

### Step 2 — Confirm required research notes exist

Concept pages cite multiple sources; before drafting, verify `docs/research/notes/<id>.md` exists for every paper that will be cited (from explicit invocation IDs, from `grep -rl "<concept-slug>" docs/research/notes/`, and from any existing `sources.references`). At least 3 distinct notes are required (the source-diversity gate — concepts span sources; synthesis across ≥3 notes guards single-source bias). If any required note is missing, stop and report:

*"Cannot draft — research note `docs/research/notes/<id>.md` does not exist. Concept pages require at least 3 distinct paper notes. Run `/paper-ingest <id-or-arxiv-ref>` for each missing source first."*

Notes are the canonical input; the Draft contract reads them. Do NOT load the paper cache into orchestrator context.

### Step 3 — Cache papers (precondition check)

`bun papers:fetch <paper-id>` for each source. This is a no-op if the cache already exists; required so the citation linking remains stable. Opus does NOT read the cache files; the relevant content already lives in the research notes (Step 2).

### Step 4 — Synthesize across sources

Concept pages cite multiple papers; each claim must be attributable. Guard against single-source bias: **at least 3 of the 5 sections must draw from 2 or more distinct sources or textbook references**. If only one paper covers the topic, the concept belongs in a section inside that paper's algorithm page, not as a standalone concept page.

Do not copy bullets from research notes verbatim — synthesize. The Draft contract (Step 5) handles synthesis; the page skill owns the page's format, prose, and structure.

### Step 5 — Delegate the page draft to Sonnet

Invoke the Draft contract from `.claude/skills/_shared/subagent-prompts.md` with:
- The list of research note paths (from Step 2)
- The page-template skeleton path (`references/concept-page-template.md` if it exists; otherwise the 5-section convention defined in `## Structure` above)
- The target concept slug

Sonnet returns:
- The full page body as a markdown string in its reply (5 sections: Definition, Mathematical Description, Numerical Concerns, Where it appears, References)
- A `<<<AUDIT>>>{json}<<<END>>>` block listing every constant / equation / named quantity used in the body, each pointing to the source note that supplied it.

Sonnet **does not** write any file. Sonnet **does not** read cache files. If Sonnet returns `blocked: missing <kind> <name> for <source-id>`, the note is incomplete — extend the note and retry.

Use `:::definition[Name]` blocks for central named quantities. Use `:::algorithm[...]` only when the concept has a procedural aspect (e.g. scale-space construction). Sonnet should follow the typography blocks from `algo-page/SKILL.md`.

### Step 5.5 — Quality gate

Verify the AUDIT JSON via the recipe in `_shared/subagent-prompts.md` (page-vs-note grep). Zero MISS lines = pass. Any MISS = (a) note is incomplete, extend and retry, or (b) Sonnet hallucinated, reject and re-delegate.

Additionally check the multi-source rule: at least 3 of the 5 sections must draw from ≥2 distinct source notes (read the AUDIT JSON's `source_note` distribution per body section).

### Step 5.6 — Assemble and write

Opus assembles `--- frontmatter --- \n <body string from Sonnet>` and calls `Write` once. Frontmatter `related` slugs come from the notes' `Connections` sections + the candidate page slugs that listed this concept in their `prerequisites` (from Step 1's count), NOT from the body string.

### Step 6 — Verify

```bash
bun run build && bun run scripts/content-validate.ts
```

## Voice rules

See `.claude/skills/_shared/voice-rules.md`. Binding.

## Forbidden patterns

Inherit the full `algo-page` forbidden-patterns list. The following are concept-page-specific additions:

- **No single-source concept pages.** If the entire page draws from one paper, the topic belongs as a section inside that paper's algorithm page, not as a standalone concept.
- **No "fundamental to all of computer vision" openers.** The `# Definition` section begins with a precise statement of what the concept is, not with a claim about its importance.
- **No paraphrase of the `# Definition` as the opening sentence of `# Mathematical Description`.** The definition is already stated; `# Mathematical Description` develops it.
- **No Wikipedia-style "history of" paragraphs** — attribution lives in `# References`.
- **No pairwise concept comparisons as standalone pages.** Use `comparedWith:` field + inline `## When X vs Y` subsection.
- **Loading the paper cache file (`docs/papers/.cache/*.{html,txt}`) into the orchestrator's context.** All paper reads happen in the Sonnet Extract contract during paper-ingest; the orchestrator works from notes only.

## Checklist

Run before handing off a draft.

- [ ] Page-creation criterion met (fundamental cross-cutting concept, ≥500 words substance, ≥3 sources). Documented in working notes.
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
- [ ] At least 3 distinct research notes exist for cited papers; page draft is the result of the Draft contract on those notes; the orchestrator did not load any `docs/papers/.cache/*` file.
- [ ] AUDIT JSON returned by the Draft subagent has zero MISS entries when grep-checked against the cited notes.
- [ ] At least 3 of the 5 page sections draw from ≥2 distinct source notes (verified from the AUDIT JSON's `source_note` distribution).

## Resources

- `docs/research/templates/source-note.md` — template for private notes that feed into this skill.
- `content/concepts/structure-tensor.md` — canonical exemplar of concept-page structure and voice.
- `src/lib/content/schema.ts` — `conceptFrontmatterSchema` defines the exact frontmatter schema.
- `docs/papers/index.yaml` — registry of authoritative sources.
- `bun papers:fetch [id]` / `bun papers:fetch-meta <arg>` — metadata and PDF caching.
- `.claude/skills/_shared/subagent-prompts.md` — Draft contract template, AUDIT JSON shape, page-vs-note verification recipe. Inherited from `algo-page`.
