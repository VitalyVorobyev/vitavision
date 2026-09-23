# Shared Bootstrap pipeline for Atlas page-authoring skills

Used by `algo-page` and `deep-model-page`. Both skills accept a bare
`arxiv:<id>`, `doi:<doi>`, or paper URL and run the same paper-registration
pipeline before any page-kind-specific work starts. This document holds the
text that is identical (or identical in substance) between the two skills;
each skill's own SKILL.md keeps only what differs — slug conventions,
frontmatter fields, and the steps after B6 (B7 onward), which are
page-kind-specific and stay inline.

## §1 — Research-note awareness (canonical input)

Research notes at `docs/research/notes/<sources.primary>.md` are the
**canonical input** for both authoring skills. The Draft contract reads
them, not the paper cache. Before any draft pass, verify the note exists
for the primary source AND for every reference in `sources.references`. If
any required note is missing, the skill stops and reports: *"Cannot draft —
research note `docs/research/notes/<id>.md` does not exist. Run
`/paper-ingest <id-or-arxiv-ref>` first."*

The note's `## NEW: <slug>` or `## UPDATE: <slug>` block provides
authoritative content guidance for the section being drafted. The note's
other sections (Setting, Core idea, Assumptions, Failure regime, Numerical
sensitivity, Applicability, Connections) are the reasoning substrate the
Draft subagent works from.

### Shared explicit rules

Both skills enforce all of the following, verbatim:

- **No pairwise comparison pages.** Use `relations[type=compared_with]` + an
  inline `## When to choose X over Y` section inside the more authoritative
  page. Surveys allowed only with ≥3 methods, ≥800 words, and a decision
  table.
- **Never publish raw LLM summaries.** Always synthesize against the
  research note's structured fields and your own understanding. Each claim
  must trace to a paper section, equation, table, or impl line.
- **Cite source IDs only from `docs/papers/index.yaml`.** Do not invent
  paper IDs.
- **Never reference unresolved slugs.** Verify every slug in
  `relations[].target` and `prerequisites` exists on disk before adding it.
- **Do not author reverse edges.** `usedBy:` and similar reverse fields are
  computed by the build. Never add them manually.

Each skill additionally states its own `1:1 page = primary paper` wording
and its own `quality:` gating text (historical-fork detail for algorithms;
model-family-page guidance for models) — those differ enough to stay inline
in the citing skill.

## §2 — Bootstrap B1–B6 (paper registration + note precondition)

Executed by Claude, not by the user. Narrate key decisions; stop and ask
only when the primary's id, url, or scope is ambiguous.

B1. **Resolve the input.** Parse the argument to `arxiv:<id>` or `doi:<doi>`.
If the user pasted a URL, extract an arXiv id (e.g. `arxiv.org/abs/<id>` or
`arxiv.org/pdf/<id>`) first; otherwise extract the DOI. `bun papers:fetch-meta`
accepts both forms and the bare id.

B2. **Fetch metadata.** `bun papers:fetch-meta <arg>`; capture stdout YAML.
Review two fields:
  - **`id`**: The script emits `firstauthor<year>-keyword` from the title. If
    the keyword is awkward (e.g. `shi1994-good` → `shi-tomasi1994-features`),
    rename now. The id is a hard identifier — rename before paste, not after.
  - **`url`**: OpenAlex's best open-access link. If it looks fragile (preprint
    mirror, redirect chain, non-institutional host), run `curl -fLsI <url> |
    head -3` to confirm 200; replace with a stabler mirror if it 404s or 405s.

B3. **Append to `docs/papers/index.yaml`.** Use the `Edit` tool to insert the
stanza at the end of the file. Preserve the inline `# <title>` comments on
unresolved `<name><year>-???` cite lines — they are the only hint about what
each placeholder refers to. Show the user the diff after the write. Then link
the authors: `bun run papers:backfill-authors --only <id>` (dry-run, review,
`--write`) and `bun run authors:dupes`; hand collisions to `author-identity`.

B4. **Curate the cites list.** Each `<name><year>-???` entry is a paper the
primary cites but the registry doesn't have yet. Decide per line:
  - **Chase** if the placeholder is a direct algorithmic antecedent worth
    showing in the page's references or as a `relations[]` cross-link (the
    corner detector fed into this algorithm, the numerical method it builds
    on, the backbone paper, the training-objective paper, the paper that
    introduced the same idea in a different context). Recurse on steps
    B2–B3 to fetch and append each one.
  - **Drop** if the placeholder is tangential (cited in passing, a generic
    textbook, the venue's comparison survey, a self-citation from the
    authors). Delete the line from the primary's `cites:` block.
  - Report the keep/drop decisions in the turn log. When in doubt between
    chase and drop, read the primary (after step B5) for context first.

B5. **Cache PDFs + text + ar5iv HTML.** `bun papers:fetch`. The script walks
`docs/papers/index.yaml`, downloads any missing PDFs into
`docs/papers/.cache/`, runs `pdftotext -layout` into `<id>.txt`, and — for
entries with an `arxiv:` field — also curls
`https://ar5iv.labs.arxiv.org/html/<arxiv-id>` into `<id>.html`. Second run
is all cache hits — no network.

B6. **Ensure the research note exists.** Run
`test -f docs/research/notes/<primary-id>.md`. If absent, stop and tell the
user: *"Bootstrap requires the research note. Run `/paper-ingest <input>`
first to create `docs/research/notes/<primary-id>.md`, then rerun
`<citing-skill-name>`."* Do NOT load the cache file into orchestrator
context — drafting happens later, via the Draft contract delegation.

## §3 — Cache file fidelity

For arxiv papers, `docs/papers/.cache/<id>.html` (ar5iv rendering) preserves
LaTeX source in `<annotation encoding="application/x-tex">` blocks and
section structure in `<section id="Sx…">` — equations transcribe directly
without OCR artefacts. For non-arxiv papers, or when ar5iv returned 404,
`<id>.txt` (pdftotext -layout) serves as the fallback. These notes are
guidance for whoever is creating the research note via `paper-ingest` — the
orchestrator (Opus) does not open cache files during `algo-page` or
`deep-model-page`.
