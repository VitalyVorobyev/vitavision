---
name: paper-ingest
description: Convert a paper, PDF, arxiv ID, DOI, or URL into a private research note at docs/research/notes/<paper-id>.md. Maps the paper to existing Atlas pages and writes an Atlas update plan as bullets. Never touches public Atlas pages.
---

# Paper Ingestion

Paper ingestion turns a paper input into a private research note — a structured reasoning substrate for future page authoring. Public Atlas pages are not modified. The note is the only output.

## Input forms

Accept exactly one of:
- `arxiv:<id>` — bare arxiv identifier (e.g. `arxiv:1301.5491`).
- `doi:<doi>` — bare DOI string (e.g. `doi:10.1007/s00138-009-0202-2`).
- A full URL — publisher page, arxiv abstract, or direct PDF link.
- A local PDF path (absolute or workspace-relative).

**Reject pure free-form descriptions** (e.g. "the Harris corner paper"). Free-form descriptions lead to hallucinated metadata. Ask the user for a specific identifier.

## Workflow

### Step 1 — Identify the paper

Parse the input to canonical form (`arxiv:<id>` or `doi:<doi>`). For URLs, extract the arxiv id or DOI first. For local PDFs, extract what metadata is available from the PDF header; if the title or DOI is visible, resolve it.

### Step 2 — Add to `docs/papers/index.yaml` if missing

Check whether the paper's id already exists in `docs/papers/index.yaml`. If not, use the same metadata-fetching pattern as `algo-page`: run `bun papers:fetch-meta <arg>` and capture the stdout YAML. Review two fields:

- **`id`**: The script emits `firstauthor<year>-keyword` from the title. If the keyword is awkward, rename it now. The id is a hard identifier — rename before writing, not after.
- **`url`**: OpenAlex's best open-access link. If it looks fragile, run `curl -fLsI <url> | head -3` to confirm 200; replace with a stabler mirror if it 404s.

Append the stanza to the end of `docs/papers/index.yaml`. Preserve inline `# <title>` comments on existing `<name><year>-???` lines. Show the user the diff.

### Step 3 — Choose the `paper-id`

Use the `id` from Step 2 (or the existing id if the paper was already registered). The convention is `firstauthor<year>-shortname`. The file will be written to `docs/research/notes/<paper-id>.md`.

### Step 4 — Discover affected Atlas pages

Scan all frontmatter in `content/algorithms/`, `content/models/`, and `content/concepts/` for:

1. `sources.primary == paper-id` — this paper is the primary source of an existing page.
2. `paper-id` in `sources.references[]` — this paper is supplementary in one or more existing pages.
3. Heuristic title-match: scan page summaries and titles for words from the paper's title. Approximate; present the match candidates to the user and ask for confirmation before writing the update plan.

Report the full list to the user: "I found these Atlas pages that reference this paper: [list]. I plan to write update-plan bullets for: [list]. Does this look right?"

### Step 5 — Determine the paper's role

**Primary update** — `sources.primary` of an existing page → the paper primarily deepens or corrects that page. Write bullets under `## UPDATE: <existing-slug>`.

**Supplementary update** — `sources.references[]` of one or more existing pages → the paper enriches multiple pages. Write bullets under `## UPDATE: <slug>` for each affected page.

**New page candidate** — neither of the above applies. Evaluate against the page-creation criterion:
- Algorithm page: clear novel method with at least one substantive technical contribution not already described on an existing page.
- Concept page: would be referenced by 3+ existing or planned public pages AND can support ≥500 words of substantive standalone content.

If the criterion is met, write bullets under `## NEW: <suggested-slug>`. If not, still create the research note (preserves provenance), but leave the Atlas update plan section empty with a one-sentence explanation of why no page is warranted.

**Unanchored** — the paper is not directly relevant to any existing or planned Atlas page. Still create the note; leave Atlas update plan empty with a note explaining why.

### Step 6 — Extract content into the template fields

Read the paper. For arxiv papers, prefer `docs/papers/.cache/<paper-id>.html` (ar5iv rendering — LaTeX preserved, section structure clean); fall back to `<paper-id>.txt` (pdftotext) or the local PDF. For non-arxiv papers, use `.txt` or the PDF directly.

Populate the following sections of `docs/research/templates/source-note.md`:

- **Setting**: problem class, input preconditions (image type, resolution, noise model, calibration assumptions), output guarantees and units.
- **Core idea**: the mechanism in 3–6 sentences. Equations next to the prose that uses them. Write as if explaining to a future you — not restating the paper's abstract.
- **Assumptions**: numbered list, one precondition per line. Distinguish soft (degrades gracefully) from hard (fails silently).
- **Failure regime**: when and why this breaks. Specific: "repeated texture causes RANSAC degeneracy when inliers < 50%" beats "doesn't work on textures."
- **Numerical sensitivity**: conditioning, scale dependence, normalization requirements, precision needs.
- **Applicability**: use-when / don't-use-when bullets, alternatives.
- **Connections**: upstream (builds on), downstream (enables), refutes/supersedes.
- **Atlas update plan**: see Step 5.
- **Provenance**: citations to specific page/section/equation numbers. Short quotes ONLY when paraphrasing would change technical meaning.

Mark uncertain claims with `?` inline. Do not invent or hallucinate content — if a field is unclear from the paper, write a `?` placeholder.

### Step 7 — Write `docs/research/notes/<paper-id>.md`

Write the note using the frontmatter-plus-sections template from `docs/research/templates/source-note.md`. The frontmatter block at the top is populated:

```yaml
---
paper_id: <from Step 3>
title: <from metadata>
authors: [<from metadata>]
year: <from metadata>
url: <from metadata>
created: <today>
relevant_atlas_pages: [<slugs from Step 4>]
---
```

Never modify any file under `content/**`. The note is the only output.

### Step 8 — Report

Report to the user:

1. `paper-id` chosen.
2. Files touched: the note path + `docs/papers/index.yaml` if modified.
3. Atlas role: primary update / supplementary update / new page candidate / unanchored.
4. Affected page slugs (if any).
5. Suggested next step — typically: `Use algo-page on <slug>. Apply the bullets from docs/research/notes/<paper-id>.md.`

## Determining the paper's role

| Condition | Role | Update plan section |
|---|---|---|
| `sources.primary` of existing page | Primary update | `## UPDATE: <slug>` |
| In `sources.references[]` of existing page(s) | Supplementary update | `## UPDATE: <slug>` per page |
| No existing reference; new page criterion met | New page candidate | `## NEW: <suggested-slug>` |
| No existing reference; criterion not met | Unanchored | Empty (with reason) |

The distinction matters because primary-update notes are applied to a single page by `/algo-page <slug>` or `/deep-model-page <slug>`. Supplementary-update notes fan out across multiple pages and may require multiple skill invocations. New-page-candidate notes are applied to create a new page from scratch.

## Don'ts

- **Never modify `content/**`.** The note is the only output of this skill.
- **Never publish raw LLM summaries.** The note's sections are structured reasoning, not summarised output. Each claim must be traceable to a specific paper section, equation, or table.
- **Never invent paper IDs not in `docs/papers/index.yaml`.** If the ID is unknown, run `bun papers:fetch-meta` first.
- **Never reference unresolved Atlas slugs in the update plan.** Verify a slug exists in `content/algorithms/`, `content/models/`, or `content/concepts/` before writing it under `## NEW:` or `## UPDATE:`.
- **Never write `usedBy:` (or any reverse edge) anywhere.** Reverse edges are computed by the build from `src/generated/content-graph.ts`.

## References

- `docs/research/templates/source-note.md` — canonical template for note structure.
- `docs/papers/index.yaml` — single source of truth for paper IDs and metadata.
- `scripts/papers-fetch-meta.ts` / `bun papers:fetch-meta <arg>` — fetches arxiv/DOI metadata; reuse this; do not reimplement.
- `bun papers:fetch [id]` — downloads PDFs, runs pdftotext, fetches ar5iv HTML.
- `.claude/skills/algo-page/SKILL.md` — the skill invoked to apply `## UPDATE:` or `## NEW:` bullets to algorithm pages.
- `.claude/skills/deep-model-page/SKILL.md` — same for model pages.
- `.claude/skills/concept-page/SKILL.md` — same for concept pages.
