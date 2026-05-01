# Research Notes

Private reasoning substrate for paper ingestion. One file per paper, never published.

```text
docs/research/
  notes/        # one file per paper, named <paper-id>.md
  templates/    # source-note.md
  README.md     # this file
```

## 1. What this folder is

`docs/research/notes/` holds private reasoning notes — one per ingested paper. They are the working material Claude and the repo owner use when reasoning about an algorithm, model, or concept before updating any public Atlas page. Notes are never published, never indexed, and never imported from `src/**`. The build's postbuild guard throws an error if any `docs/research/` path leaks into `dist/`.

## 2. Where to put a new paper

Hand Claude an arxiv ID, DOI, URL, or local PDF path. The `paper-ingest` skill does the rest. You do not need to create a file manually or add anything to `docs/papers/index.yaml` yourself — the skill handles both.

## 3. How to ingest

```
Use paper-ingest with arxiv:1234.5678. Don't modify public pages yet.
```

Or with a DOI:

```
Use paper-ingest with doi:10.1109/CVPR.2020.00001. Stop at the research note.
```

Or with a local PDF:

```
Use paper-ingest with /path/to/paper.pdf. Stop after creating the note.
```

The skill writes `docs/research/notes/<paper-id>.md` and, if the paper is not yet registered, adds a stanza to `docs/papers/index.yaml`.

## 4. What gets created

- `docs/research/notes/<paper-id>.md` — the research note, following the template in `docs/research/templates/source-note.md`.
- A new entry in `docs/papers/index.yaml` if the paper was not already registered.

Nothing in `content/**` is touched.

## 5. Reviewing a note

Read the note after ingestion. The most important section is `# Atlas update plan` at the bottom — it contains `## NEW: <slug>` or `## UPDATE: <slug>` blocks with bullets describing what to add or revise on each affected public page. These bullets are the decisions. The earlier sections (Setting, Core idea, Assumptions, Failure regime, etc.) are the reasoning material that justifies them.

## 6. Applying a note

Once you have reviewed the note and want to update a public page, invoke the relevant page skill against the target slug:

```
Use algo-page on harris-corner-detector. Apply the bullets from docs/research/notes/harris1988-corner.md.
```

Or for a concept page:

```
Use concept-page on homography. Apply the update bullets from docs/research/notes/hartley2003-mvg.md.
```

The page skills read the research note's `## UPDATE: <slug>` or `## NEW: <slug>` block and synthesize the actual page content — they do not copy bullets verbatim.

## 7. Source IDs

Every note is named `<paper-id>.md` where `<paper-id>` is the canonical identifier in `docs/papers/index.yaml`. The convention is `firstauthor<year>-shortname` (e.g. `harris1988-corner`, `shi1994-features`). Public pages reference the same IDs in their `sources.primary` and `sources.references` frontmatter fields — this is how the atlas links public citations to private notes.

## 8. What never gets published

The entire `docs/research/` tree is private. Specifically, these things never appear in `dist/`:

- Research notes.
- Full quotes from papers.
- Raw LLM extraction of paper content.
- Anything under `docs/research/`.

The postbuild guard (`scripts/postbuild.ts`) enforces this mechanically — any `docs/research/` string found in `dist/` is a hard build failure.

## 9. When to create a concept page

A new concept page is warranted only when the concept is referenced by 3+ existing or planned public pages AND can support at least 500 words of substantive standalone content (definition, math, numerical concerns, implementation implications). If unsure, ask:

```
Use concept-page to evaluate whether "scale-space" meets the page-creation criterion.
```

If the criterion is not met, the concept belongs as a section inside an existing algorithm or model page — not as a standalone page.

## 10. How to validate before commit

```bash
bun run build && bun run scripts/validate-content.ts
```

The build runs content validation automatically. The postbuild guard checks that no research-note paths leaked into `dist/`. Both must pass before committing.

---

## Example prompts

**Ingest a paper:**
```
Use paper-ingest with arxiv:2304.02643. Don't modify public pages yet.
```

**Apply an atlas update from a note:**
```
Use algo-page on chess-corners. Apply the bullets from docs/research/notes/bennett2014-chess.md for the Remarks section.
```

**Check if a concept meets the creation criterion:**
```
Use concept-page to evaluate whether "epipolar geometry" meets the page-creation criterion given current atlas pages.
```
