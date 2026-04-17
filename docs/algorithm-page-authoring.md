# Adding a new algorithm page

The fast path is a single sentence to Claude. The manual fallback exists for cases where you want to inspect or drive each step yourself.

## Fast path — one sentence

Tell Claude:

> draft `arxiv:<id>`
> draft `doi:<doi>`
> draft `<pdf-url>`

Claude runs the `algo-page` skill in Bootstrap mode (see `.claude/skills/algo-page/SKILL.md`). It will:

1. Fetch metadata via OpenAlex (`bun papers:fetch-meta`), review the candidate id and url, and **append the stanza to `docs/papers/index.yaml`** directly. It shows the diff.
2. Curate the citation graph: chase direct algorithmic antecedents (recurse on step 1 for each), drop tangential placeholders. Report keep/drop decisions.
3. Cache PDFs + `pdftotext` output (`bun papers:fetch`) into `docs/papers/.cache/`.
4. Read the cached primary text; synthesize frontmatter for `content/algorithms/<slug>.md` (title, summary, tags, category, `sources`, `relatedAlgorithms`).
5. Draft the five sections (Goal, Algorithm, Implementation, Remarks, References) using `:::definition[...]` and `:::algorithm[...]` typography blocks.
6. Run the quality gate and `bun run build && bun run lint && npx vitest run`.

Interrupt at any point to redirect. Claude omits `sources.impl` and `editorAlgorithmId` unless you supply them — they depend on state outside the paper (a sibling Rust crate, a registered editor adapter) that Claude can't infer.

## Prerequisites

- `poppler` (provides `pdftotext`) and `curl` on `$PATH`. Install once: `brew install poppler`.
- Optional: `export OPENALEX_EMAIL=you@example.com` to join OpenAlex's polite pool for higher rate limits.

## Manual fallback

Use this when you want to drive the pipeline step-by-step instead of handing it to Claude. For voice, structure, and per-section rules, see `.claude/skills/algo-page/SKILL.md`. For exemplars of the finished shape, see `content/algorithms/chess-corners.md` or `harris-corner-detector.md`.

### Step 1 — bootstrap the primary paper

```bash
bun papers:fetch-meta arxiv:<id>          # e.g. arxiv:1301.5491
# or for a non-arXiv paper
bun papers:fetch-meta doi:<doi>           # e.g. doi:10.5244/c.2.23
```

The script prints a candidate yaml entry to stdout. Review it:

- The auto-generated `id` uses the `firstauthor<year>-<keyword>` convention. If the keyword is awkward (e.g. `shi1994-good` for "Good Features to Track"), rename to something more searchable (`shi-tomasi1994-features`).
- The `url` is OpenAlex's best open-access link. Verify it actually resolves to a PDF — `curl -fLsI <url>` should return 200. If it 404s or 405s, find a working mirror and replace.

Paste the reviewed entry into `docs/papers/index.yaml`.

#### If OpenAlex can't find the paper

Search manually:

```bash
curl -fsS "https://api.openalex.org/works?filter=title.search:%22<title-words>%22,publication_year:<year>&select=id,doi,title" \
  -H "User-Agent: vitavision/0.1 (mailto:$OPENALEX_EMAIL)"
```

Pick the DOI from the result and run `bun papers:fetch-meta doi:<doi>`. If still nothing (pre-DOI paper, obscure venue), hand-enter a stanza using existing `index.yaml` entries as a template — at minimum `id`, `title`, `authors`, `year`, `venue`, `url`, `pdf: <id>.pdf`, `cites: []`.

### Step 2 — close the citation graph

The candidate yaml's `cites:` list contains placeholders like `<name><year>-???` for papers not yet in the registry. Decide which matter:

- If a cited paper is a direct antecedent worth showing in your page's `# References` or as a `relatedAlgorithms` cross-link — recurse on step 1 to add it.
- If it's tangential (the primary paper cites it in passing) — delete the placeholder line before pasting.

A paper's `cites:` should reflect what actually appears in its bibliography. An algorithm page's `sources.references` is curated separately — it can include papers the primary doesn't cite (e.g. the Shi-Tomasi page's `sources.references: [harris1988-corner]` even though Shi-Tomasi doesn't cite Harris directly).

### Step 3 — cache the PDFs

```bash
bun papers:fetch
```

Downloads any PDFs missing from `docs/papers/.cache/` and runs `pdftotext -layout` on each. Second run is all cache hits — no network.

Expected output:

```
[fetch] <new-paper-id>
[cache] <already-cached>
OK n/n
```

If a fetch fails, `curl` returned a non-200. Fix the `url` in `index.yaml` and re-run.

### Step 4 — create the page file with frontmatter only

Create `content/algorithms/<slug>.md` with only the frontmatter block. No body — that's step 5.

```yaml
---
title: "<Algorithm name>"
date: YYYY-MM-DD
summary: "<one sentence — what the algorithm computes, what it returns>"
tags: ["computer-vision", "<primary-topic>"]
category: corner-detection | calibration-targets | subpixel-refinement | explainers
author: "Vitaly Vorobyev"
difficulty: beginner | intermediate | advanced

# Optional — populate when applicable
relatedAlgorithms: [<slug>, ...]       # see below for how to derive
relatedDemos: [<demo-slug>, ...]
editorAlgorithmId: <adapter-id>        # chess-corners | chessboard | charuco | markerboard | ringgrid | radsym

# Required for new pages
sources:
  primary: <paper-id>
  references: [<paper-id>, ...]        # papers to appear in # References
  impl:                                # optional — only if a sibling Rust crate exists
    repo: https://github.com/<owner>/<repo>
    commit: <sha>                      # full SHA from `git ls-remote <repo> HEAD`
    files:
      - <path-in-repo>
  notes: |
    Freeform — key constants, symbol conventions, anything that grounds the page.
---
```

#### Populating `relatedAlgorithms`

For each paper id in `sources.references`:

```bash
bun papers:query pages-using <cite-id>
```

Every returned path is a candidate sibling. Also add algorithmically-adjacent pages by hand if the citation graph misses them (e.g. Shi-Tomasi and Harris cross-link even though Shi-Tomasi doesn't actually cite Harris).

#### Pinning the impl — only if you have one

If a sibling Rust crate already implements the algorithm (`chess-rs` for ChESS), pin it:

```bash
git ls-remote https://github.com/<owner>/<repo> HEAD
```

Copy the full SHA into `sources.impl.commit`. List only the canonical algorithm files (the hot kernel; skip glue, tests, wrappers).

If no external crate exists yet, omit `sources.impl` entirely. The Rust kernel in the page's `# Implementation` section IS the canonical implementation.

### Step 5 — hand it to Claude

Say "draft `<slug>`" (or similar). Claude follows the `algo-page` skill Workflow:

1. Caches the impl if `sources.impl` is set (`bun impls:fetch <slug>`).
2. Reads `docs/papers/.cache/<primary-id>.txt` to locate defining equations, named quantities, and procedure.
3. Reads the cached impl files for canonical constants.
4. Queries the citation graph for `# References` candidates.
5. Drafts the 5 sections (Goal, Algorithm, Implementation, Remarks, References) using `:::definition[...]` and `:::algorithm[...]` typography blocks.
6. Runs the quality gate: every numerical constant and symbol on the page is traced to a source line in working notes.
7. Verifies `bun run build && bun run lint && npx vitest run`.

## Sanity checks after drafting

```bash
bun papers:query pages-using <primary-id>    # your new page should appear
bun papers:query cited-by <cite-id>          # should list the primary if cites edge is set
bun run build && bun run lint && npx vitest run
bun run dev                                  # eyeball /algorithms/<slug>
```

## Reference tools

| Command | What it does |
|---|---|
| `bun papers:fetch [id]` | Download PDFs + run pdftotext. `[id]` optional; omit to fetch all. |
| `bun papers:fetch-meta <arxiv:id\|doi:id>` | Lookup via OpenAlex; emits candidate yaml entry. |
| `bun impls:fetch <slug>` | Fetch pinned impl files from GitHub raw URLs, cache by SHA. |
| `bun papers:query cites <id>` | Papers this one references. |
| `bun papers:query cited-by <id>` | Papers that reference this one. |
| `bun papers:query pages-using <id>` | Algorithm pages whose `sources` reference this paper. |

All scripts live in `scripts/`; cached files live under `docs/papers/.cache/` and `docs/impls/.cache/` (both gitignored).
