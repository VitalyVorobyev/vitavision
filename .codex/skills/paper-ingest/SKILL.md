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

## Source kinds

Despite the historical name `paper-ingest`, this skill handles three source kinds:

| Kind | Cache via | Stub via | Use case |
|---|---|---|---|
| `paper` | `bun papers:fetch <id>` (PDF + pdftotext + ar5iv HTML) | direct ingest from cache | papers, theses, technical reports |
| `repo` | `bun sources:fetch-repo` (README + LICENSE + GitHub API metadata) | stub note from cached repo materials | competing implementations, upstream libraries cited as background |
| `doc` | `bun sources:fetch-doc` (path validation only — file already on disk) | stub note from doc path | design docs, MODEL_CARD files, internal specs cited from Atlas pages |

Source-ref grammar: `paper:<id>`, `repo:<url>@<sha>` (7–40 hex), `doc:<repo-relative-path>`. These map to index keys `paper:<id>`, `repo:<repo-url>@<commit>`, and `doc:<path>` respectively.

The Workflow steps below use `paper` as the running example; adaptations for `repo` and `doc` differ only in:
- the cache directory (`docs/papers/.cache/<id>.{html,txt}` for papers, `docs/sources/.cache/repo/<owner>/<repo>/<commit>/{README,LICENSE,meta.json}` for repos, `<entry.path>` directly for docs)
- the template (`docs/research/templates/source-note.md` vs `source-note-repo.md` vs `source-note-doc.md`)
- the `kind` field in the resulting note's frontmatter

## Workflow

### Step 0 — Preflight: refuse if note exists

Resolve the canonical `source-id` from the input (same logic as Step 1 — for arxiv/DOI/URL inputs, derive the id). If `docs/research/notes/<source-id>.md` already exists:

1. Stop the workflow.
2. Tell the user: *"This paper is already ingested as `<source-id>`. The existing research note will not be overwritten. To deliberately re-author the note, delete `docs/research/notes/<source-id>.md` first, then rerun."*
3. Do not write any files.

Rationale: notes are hand-curated reasoning substrate. Auto-overwriting destroys human edits.

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

The cross-link scan is delegated to a Sonnet subagent so the main agent's context stays lean. The orchestrator passes:

- `source_id` — the canonical paper id from Step 3.
- Title and abstract from Step 2 metadata — used for heuristic title-matching.
- The three content directories to walk: `content/algorithms/`, `content/models/`, `content/concepts/`.

The subagent returns a JSON list of candidates:

```json
[{"slug": "...", "match_kind": "primary|reference|title-heuristic", "evidence": "..."}, ...]
```

capped at ~30 entries. `match_kind` values: `primary` (`sources.primary == source_id`), `reference` (`source_id` in `sources.references[]`), `title-heuristic` (words from paper title appear in page summary/title).

See `.claude/skills/_shared/subagent-prompts.md` for the contract template and context on why heavy reads are delegated.

The orchestrator confirms the candidate list with the user before proceeding: "I found these Atlas pages that may relate to this paper: [list]. I plan to write update-plan bullets for: [list]. Does this look right?" The user-confirmation step is preserved; it now runs on the JSON returned by the Sonnet subagent.

### Step 5 — Determine the paper's role

**Primary update** — `sources.primary` of an existing page → the paper primarily deepens or corrects that page. Write bullets under `## UPDATE: <existing-slug>`.

**Supplementary update** — `sources.references[]` of one or more existing pages → the paper enriches multiple pages. Write bullets under `## UPDATE: <slug>` for each affected page.

**New page candidate** — neither of the above applies. Evaluate against the page-creation criterion:
- Algorithm page: clear novel method with at least one substantive technical contribution not already described on an existing page.
- Concept page: would be referenced by 3+ existing or planned public pages AND can support ≥500 words of substantive standalone content.

If the criterion is met, write bullets under `## NEW: <suggested-slug>`. If not, still create the research note (preserves provenance), but leave the Atlas update plan section empty with a one-sentence explanation of why no page is warranted.

**Unanchored** — the paper is not directly relevant to any existing or planned Atlas page. Still create the note; leave Atlas update plan empty with a note explaining why.

### Step 6 — Extract content into the template fields

The extraction is delegated to a Sonnet subagent via the Extract contract in `.claude/skills/_shared/subagent-prompts.md`. The orchestrator passes:

- `cache_path` — prefer `docs/papers/.cache/<source-id>.html` (ar5iv rendering, LaTeX preserved) for arxiv papers; fall back to `<source-id>.txt` (pdftotext). For non-arxiv papers, use `.txt` or the local PDF path.
- `source_id` — from Step 3.
- `kind: "paper"`.
- Path to `docs/research/templates/source-note.md` — the template to populate.
- Candidate slug list from Step 4 — for the `relevant_atlas_pages` frontmatter and the Connections / Atlas update plan sections.

The subagent writes `docs/research/notes/<source-id>.md` (only if it does not already exist — Step 0 enforced this; the subagent is a second guard) and returns a short status report (source-id, atlas role, equations count, constants count) for the orchestrator to use in Step 8.

Hard rule: every numerical constant / equation / symbol that appears in the note prose MUST be traceable to a `# Provenance` citation pointing to a specific paper section, equation number, or table. Mark uncertain claims with `?` inline. Do not invent or hallucinate content; if a field is unclear from the paper, write a `?` placeholder.

The orchestrator does NOT read the cache `.txt` / `.html` directly in this step; only the Sonnet subagent does.

### Step 7 — Confirm note is on disk

The Sonnet Extract subagent wrote the note during Step 6. The orchestrator confirms `docs/research/notes/<source-id>.md` exists, and that its frontmatter parses (lightweight sanity check). The expected frontmatter shape is:

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

Never modify any file under `content/**`. The note is the only output of this skill.

### Step 8 — Report

Report to the user:

1. `paper-id` chosen.
2. Files touched: the note path + `docs/papers/index.yaml` if modified.
3. Equations / constants extracted (counts) — sanity check that the note is non-trivial.
4. Atlas role: primary update / supplementary update / new page candidate / unanchored.
5. Affected page slugs (if any).
6. Suggested next step — typically: `Use algo-page on <slug>. Apply the bullets from docs/research/notes/<paper-id>.md.`

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
- **Never overwrite an existing research note.** Step 0 enforces this. To re-author, delete the note first.
- **Never read the cache `.txt` / `.html` directly in the orchestrator.** Cache reads happen inside the delegated Extract contract; the orchestrator only sees Sonnet's reply.

## References

- `docs/research/templates/source-note.md` — canonical template for note structure.
- `docs/papers/index.yaml` — single source of truth for paper IDs and metadata.
- `scripts/papers-fetch-meta.ts` / `bun papers:fetch-meta <arg>` — fetches arxiv/DOI metadata; reuse this; do not reimplement.
- `bun papers:fetch [id]` — downloads PDFs, runs pdftotext, fetches ar5iv HTML.
- `.claude/skills/algo-page/SKILL.md` — the skill invoked to apply `## UPDATE:` or `## NEW:` bullets to algorithm pages.
- `.claude/skills/deep-model-page/SKILL.md` — same for model pages.
- `.claude/skills/concept-page/SKILL.md` — same for concept pages.
- `.claude/skills/_shared/subagent-prompts.md` — Extract contract template (delegation pattern, hard rules).
