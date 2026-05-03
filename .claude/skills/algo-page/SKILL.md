---
name: algo-page
description: Write reference entries for the Vitavision algorithms register under content/algorithms/*.md. Accepts a bare `arxiv:<id>`, `doi:<doi>`, or paper URL and drives the full pipeline — fetches metadata, appends to docs/papers/index.yaml, chases direct antecedents, caches PDFs, synthesizes frontmatter, drafts the page. Each entry is a compact, textbook-style card — goal, minimal algorithm declaration, core implementation snippet, remarks, references. This is NOT a blog-post voice and NOT the tech-writer skill.
---

# Vitavision Algorithm Reference

An algorithm page is a **reference entry in a register**, not an essay. It is read for fact lookup: what the algorithm is, the math that defines it, and how to implement it. Prose is minimal and impersonal; math and pseudocode carry the content.

The closest analogues are Wikipedia algorithm articles, *Numerical Recipes* chapters, and algorithm boxes in Cormen. The voice is that of a textbook or reference manual — not a blog post.

## Structure

Five top-level sections, in this order, with these exact titles:

```
# Goal
# Algorithm
# Implementation
# Remarks
# References
```

No numbering prefix on the headings. No other top-level sections.

### `# Goal`

One paragraph. State the input, the output, and what distinguishes this algorithm from nearby ones. Define terms precisely. No narrative opening, no rhetorical question, no acknowledgment of alternative tools, no attribution — all of that goes in References.

**Do not**: open with personal context, name existing tools, quote authors, or editorialize.
**Do**: state what the algorithm computes, for what input, and what property makes it specific.

### `# Algorithm`

The heart of the page. Define symbols, state the formulas, give the procedure. Prose is glue between math and code; each sentence either defines a symbol, names a quantity, or sequences a step. No narrative transitions ("This leads to", "In my view"), no intuition paragraphs, no asides.

Structure this section as:

1. **Symbol list.** Define every symbol used. One line per symbol. Use LaTeX math delimiters: inline `$...$`, display `$$...$$`.
2. **Definitions.** Display formulas for every named quantity. Give each quantity a short lowercase name the reader can search for.
3. **Procedure.** A numbered list of steps, pseudocode-precise. When the procedure has branches (threshold, NMS, refinement), use numbered substeps. Sequential bullets, no prose filler.

Use `## <Subsection>` sparingly — only when the algorithm has multiple distinct terms (e.g. ChESS has SR, DR, MR) or multiple procedural stages (e.g. response → threshold → NMS). Otherwise keep Section 2 flat.

### `# Implementation`

**Core computation, not library usage.** Show the algorithm itself translated to code — the loop that implements the math in `# Algorithm`, not an API call to a published crate. One Rust snippet is required when the algorithm is codeable; a Python snippet is optional.

Rules:

- Snippet size: ≤ 40 lines. If the algorithm is longer, show the hot function (the per-pixel or per-iteration kernel), not the full pipeline.
- The snippet must correspond line-by-line to the math in `# Algorithm`. A reader should be able to point from each line of code to the formula it implements.
- Do **not** show install commands (`cargo add`, `pip install`).
- Do **not** show library calls like `find_chess_corners_image(&img, &cfg)`. That is library documentation, not algorithm reference.
- Do **not** show `main()` wrappers, file I/O, or CLI plumbing.
- Standalone snippet: imports only if essential; prefer `std` and `core` types so the snippet is self-contained.
- Language tag on every code fence (`rust`, `python`).
- One-sentence lead-in before each snippet, of the form "The per-pixel response in Rust:" or "Procedure in Python:". No tutorial framing.

If the algorithm is not codeable in isolation (e.g. it depends heavily on a graph data structure defined elsewhere), omit `# Implementation` and say so in one sentence in `# Remarks`.

### `# Remarks`

Bulleted list. 3–6 bullets. Each bullet is a declarative statement **about the algorithm itself** — not about any particular implementation. Cover as applicable:

- Complexity (time and space).
- Scale / parameter sensitivity.
- Known failure modes.
- Scope: what the algorithm does not do.
- Common extensions (named, not described — a pointer is enough).

Do **not** include in Remarks:

- Measured performance numbers. Benchmarks are tied to a specific implementation, compiler, and hardware. They belong in blog posts or in the codebase README, not in an algorithm reference entry.
- Pointers to specific Rust crates or repositories ("Reference implementation: chess-corners-rs"). The page's own `# Implementation` section **is** the reference implementation; a crate pointer doubles as implicit endorsement of a specific implementation and can mislead readers into treating personal code as standard.

Bullets are declarative. No softeners, no marketing vocabulary, no opinions.

### `# References`

Numbered list. 1–5 entries total. Format:

```
1. Authors. *Title.* Venue, Year. [link-text](url)
```

The first entry is the primary source that defines the algorithm. Follow-ups are the closest antecedents or extensions — at most four.

## Typography blocks

The site renders a set of directive-style blocks via `scripts/remark-vv-blocks.ts`. Use them instead of ad-hoc prose when the content fits.

| Block | Syntax | Use for |
|---|---|---|
| Definition | `:::definition[Name]` ... `:::` | Named quantities (responses, measures, scores) with their defining formula. |
| Algorithm | `:::algorithm[Title]` ... `:::` with `::input[...]` / `::output[...]` leaf directives | The `## Procedure` block under `# Algorithm`. |
| Theorem / Lemma / Proposition | `:::theorem[Name]` ... `:::` | Formal results; rarely needed in a register entry. |
| Note | `:::note` ... `:::` | Short aside the reader can skip without losing the thread. |
| Warning | `:::warning` ... `:::` | Failure modes that a careless reader would hit in practice. |
| Example | `:::example[Name]` ... `:::` | Concrete worked instance, sparingly. |

Rules of use:

- **Definitions of named quantities** (e.g. the SR, DR, MR, and composite responses in ChESS) **must** be wrapped in `:::definition[...]` blocks. The label is the quantity's short name. The body is a one-sentence gloss plus the display formula.
- **The `## Procedure` subsection under `# Algorithm` must be an `:::algorithm[...]` block** with `::input[...]` and `::output[...]` directives. The body is a numbered procedure — one imperative sentence per step.
- Inline color directives are available (`:blue[...]`, `:amber[...]`, `:green[...]`, `:violet[...]`, `:muted[...]`). Reserve them for semantic roles; do not decorate.
- Do not nest blocks. Do not use blocks for narrative transitions.
- **Long display-math formulas must wrap.** A `$$...$$` line longer than the content column (a dozen tokens or a long offset list) produces a horizontal scroll bar. Wrap it in `\begin{aligned}...\end{aligned}` with explicit `\\` breaks. Example — the 16-offset table in `chess-corners.md` and `fast-corner-detector.md`.

Example fragment:

```markdown
:::definition[Sum response (SR)]
Large when the ring shows the two-cycle alternation of a true X-junction.

$$
\mathrm{SR} = \sum_{n=0}^{3} \bigl|\,(I_n + I_{n+8}) - (I_{n+4} + I_{n+12})\,\bigr|.
$$
:::

:::algorithm[ChESS corner detection]
::input[Grayscale image $I$; offset table $\Delta$; border margin $m$.]
::output[Set of integer pixel locations $\{(x_i, y_i)\}$.]

1. For every pixel at distance $\geq m$ from the border, compute $R(x, y)$.
2. Discard pixels with $R \leq 0$.
3. Apply non-maximum suppression in a $3 \times 3$ neighborhood.
:::
```

## Illustrations

See `.claude/skills/_shared/illustrations.md` — covers the primitive choice (KaTeX / Mermaid / hand-authored SVG / generated SVG), authoring rules, generator-script requirements, palette, typography floor, and Mermaid notes.

## Frontmatter

Validates against `algorithmFrontmatterSchema` in `src/lib/content/schema.ts`.

```yaml
# Required
title: "..."          # Display title
date: YYYY-MM-DD
summary: "..."        # One sentence, index-card length
tags: [...]           # At least one
category: ...         # corner-detection | calibration-targets | subpixel-refinement | calibration
author: "..."

# Optional
difficulty: ...               # beginner | intermediate | advanced
draft: false
relatedPosts: [...]           # Blog post slugs
relatedAlgorithms: [...]      # Other algorithm page slugs
relatedDemos: [...]           # Demo page slugs
editorAlgorithmId: ...        # chess-corners | chessboard | charuco | markerboard | ringgrid | radsym
sources:                      # Authoritative sources for this page (see Workflow section)
  primary: <paper-id>         # id from docs/papers/index.yaml
  references: [<paper-id>]    # additional cited papers
  impl:
    repo: https://github.com/<owner>/<repo>
    commit: <sha>             # 7–40 hex chars; pins the impl version
    files: [<path>, ...]      # files to fetch via raw.githubusercontent.com
  notes: |
    Freeform clarifications grounding the page (e.g. "RING5 = FAST-16 scaled to r=5").
coverImage: "..."
repoLinks: [...]
demoLinks: [...]

# Atlas relationship fields (optional)
prerequisites: []   # concept slugs this algorithm depends on (e.g. [image-gradient, structure-tensor])
failureModes: []    # failure-mode page slugs (always empty in MVP; required as placeholder)

# Quality + typed relations (optional)
quality: stub | canonical | historical    # see CLAUDE.md → "Quality field"
relations:                                # see CLAUDE.md → "Relations field". The single field for all
                                          # inter-page links beyond prerequisites/failureModes.
  - type: generalized_by | alternative_formulation_of | parallel_foundation_with | extended_by | compared_with | feeds_into | learned_alternative_of
    target: <slug>
    confidence: high | medium | low
    caution: <one-line note, optional>
```

**Source kinds.** `sources.primary` and `sources.references[]` accept `<bare-id>` (defaults to `paper`), `paper:<id>`, `repo:<url>@<sha>`, or `doc:<repo-relative-path>`. The validator dispatches on prefix and resolves against `docs/papers/index.yaml` (papers and repos) or the filesystem (docs).

**`repo:` references vs `sources.impl`.** Use `repo:` in `sources.references[]` when a repo is cited as background, comparison, or upstream — analogous to citing a paper. Use the dedicated `sources.impl` field when the repo IS the page's reference implementation (the one the `# Implementation` snippet was modeled on); `sources.impl` is richer-typed (commit-pinned files, fetched via `bun impls:fetch`) and license-verified.

`relatedDemos` and `editorAlgorithmId` should be considered for every page. `sources` is required for every new page — see the Workflow section below.

### `editorAlgorithmId` — deep-link must be one-click runnable

Setting `editorAlgorithmId` renders a "Try in the editor →" button on the page, linking to `/editor?algo=<id>&sample=<sample-id>`. The sample id is mapped from the algorithm id by a lookup in `src/pages/AlgorithmPost.tsx` (currently: `chess-corners → chessboard`, `chessboard → chessboard`, `charuco → charuco`, `markerboard → markerboard`, `ringgrid → ringgrid`, `radsym → ringgrid`). The landing experience must be: editor mode, sample image preloaded, algorithm preselected, one click on Run.

When introducing a new `editorAlgorithmId` value:

1. Confirm the adapter is registered in `src/components/editor/algorithms/registry.ts` and its id appears in the sample-id mapping in `AlgorithmPost.tsx`. If missing, add the entry so the CTA preloads an image.
2. If the algorithm needs a new sample image not yet in `galleryImages` (`src/store/editor/useEditorStore.ts`), add it there with a `sampleId` and add the `sampleId` to `VALID_SAMPLE_IDS` in `src/hooks/useEditorDeepLink.ts`.
3. Smoke-test: visit `/algorithms/<slug>`, click "Try in the editor", confirm the image loads and the algorithm is preselected before touching anything.

A deep-link that leaves the user in gallery mode with no image is worse than no link — they don't know what to do next.

## Research-note awareness

Research notes at `docs/research/notes/<sources.primary>.md` are the **canonical input** for this skill. The Draft contract reads them, not the paper cache. Before any draft pass, verify the note exists for the primary source AND for every reference in `sources.references`. If any required note is missing, the skill stops and reports: *"Cannot draft — research note `docs/research/notes/<id>.md` does not exist. Run `/paper-ingest <id-or-arxiv-ref>` first."*

The note's `## NEW: <slug>` or `## UPDATE: <slug>` block provides authoritative content guidance for the section being drafted. The note's other sections (Setting, Core idea, Assumptions, Failure regime, Numerical sensitivity, Applicability, Connections) are the reasoning substrate the Draft subagent works from.

**Two invocation paths:**

- **Bootstrap** (new page from scratch): supply `arxiv:<id>`, `doi:<doi>`, or a URL. Runs Bootstrap B1–B9 below. The research note for `sources.primary` **must exist** before continuing to Workflow §7 (Draft contract delegation). If it is absent after Bootstrap completes, stop and instruct the user to run `paper-ingest` first.
- **Apply from research note** (update existing page): invoke as `/algo-page <existing-slug>`. The research note for `sources.primary` **must exist**. If it is missing, stop and instruct the user to run `/paper-ingest <primary-id>` first. The Draft subagent reads the note and applies `## UPDATE: <slug>` bullets per the Draft contract in Workflow §7 — not by copying them verbatim, and not by reading the paper cache.

**Explicit rules:**

- **1:1 page = primary paper.** Every algorithm page has exactly one primary paper in `sources.primary`. Supplementary papers go in `sources.references` only.
- **No pairwise comparison pages.** Use `comparedWith:` field + an inline `## When to choose X over Y` section inside the more authoritative page. Surveys allowed only with ≥3 methods, ≥800 words, and a decision table.
- **Never publish raw LLM summaries.** Always synthesize against the research note's structured fields and your own understanding. Each claim must trace to a paper section, equation, or impl line.
- **Cite source IDs only from `docs/papers/index.yaml`.** Do not invent paper IDs.
- **Never reference unresolved slugs.** Verify every slug in `relatedAlgorithms`, `prerequisites`, `comparedWith` exists on disk before adding it.
- **Do not author reverse edges.** `usedBy:` and similar reverse fields are computed by the build. Never add them manually.
- Use `quality: stub` only for intentional public placeholders; `quality: canonical` only when the canonical gate is satisfied (sources present, prerequisites non-empty, no TODO markers); `quality: historical` only when a same-domain successor on the site supersedes this method (per CLAUDE.md → Comparison authoring discipline → Rule A). Historical pages must include at least one `relations[]` entry with `{ type: generalized_by, confidence: high, target: <successor-slug> }`, drop `editorAlgorithmId`, and omit `comparedWith:` entirely.

## Workflow

This procedure is mandatory for any new or rewritten algorithm page. It codifies the chess-corners process: ground every claim in primary sources, fetched at pinned versions, queried via the citation graph.

### Trigger

- **Bootstrap mode** fires whenever the user supplies an input token — `arxiv:<id>`, `doi:<doi>`, or a PDF / publisher URL — without a pre-filled frontmatter file. Example triggers: "draft arxiv:1301.5491", "draft doi:10.1007/s00138-009-0202-2", "draft https://…/paper.pdf". Run Bootstrap §B1–B9 below, then continue with Workflow §1.
- **Legacy mode** fires when a page file already exists with a filled `sources` frontmatter AND the research note for `sources.primary` exists at `docs/research/notes/<primary-id>.md`. Skip Bootstrap and start at Workflow §1. If the note is missing, stop and instruct the user to run `/paper-ingest <primary-id>` first — do not fall back to reading the cache.

### Bootstrap (Claude-driven, for entirely new pages)

These steps are executed by Claude, not by the user. Narrate key decisions; stop and ask only when the primary's id, url, or scope is ambiguous.

B1. **Resolve the input.** Parse the argument to `arxiv:<id>` or `doi:<doi>`. If the user pasted a URL, extract an arXiv id (e.g. `arxiv.org/abs/<id>` or `arxiv.org/pdf/<id>`) first; otherwise extract the DOI. `bun papers:fetch-meta` accepts both forms and the bare id.

B2. **Fetch metadata.** `bun papers:fetch-meta <arg>`; capture stdout YAML. Review two fields:
  - **`id`**: The script emits `firstauthor<year>-keyword` from the title. If the keyword is awkward (e.g. `shi1994-good` → `shi-tomasi1994-features`), rename now. The id is a hard identifier — rename before paste, not after.
  - **`url`**: OpenAlex's best open-access link. If it looks fragile (preprint mirror, redirect chain, non-institutional host), run `curl -fLsI <url> | head -3` to confirm 200; replace with a stabler mirror if it 404s or 405s.

B3. **Append to `docs/papers/index.yaml`.** Use the `Edit` tool to insert the stanza at the end of the file. Preserve the inline `# <title>` comments on unresolved `<name><year>-???` cite lines — they are the only hint about what each placeholder refers to. Show the user the diff after the write.

B4. **Curate the cites list.** Each `<name><year>-???` entry is a paper the primary cites but the registry doesn't have yet. Decide per line:
  - **Chase** if the placeholder is a direct algorithmic antecedent worth showing in the page's `# References` or as a `relatedAlgorithms` cross-link (the corner detector fed into this algorithm, the numerical method it builds on, the paper that introduced the same idea in a different context). Recurse on steps B2–B3 to fetch and append each one.
  - **Drop** if the placeholder is tangential (cited in passing, a generic textbook, the venue's comparison survey, a self-citation from the authors). Delete the line from the primary's `cites:` block.
  - Report the keep/drop decisions in the turn log. When in doubt between chase and drop, read the primary (after step B5) for context first.

B5. **Cache PDFs + text + ar5iv HTML.** `bun papers:fetch`. The script walks `docs/papers/index.yaml`, downloads any missing PDFs into `docs/papers/.cache/`, runs `pdftotext -layout` into `<id>.txt`, and — for entries with an `arxiv:` field — also curls `https://ar5iv.labs.arxiv.org/html/<arxiv-id>` into `<id>.html`. Second run is all cache hits — no network.

B6. **Ensure the research note exists.** Run `bun ls docs/research/notes/<primary-id>.md`. If absent, stop and tell the user: *"Bootstrap requires the research note. Run `/paper-ingest <input>` first to create `docs/research/notes/<primary-id>.md`, then rerun `algo-page`."* Do NOT load the cache file into orchestrator context — drafting happens in Workflow §7 via the Draft contract.

B7. **Choose the page slug.** Kebab-case, descriptive to a reader browsing the algorithms register — not an id echo. `shu-topological-grid`, not `shu2009`. `harris-corner-detector`, not `harris-combined`.

B8. **Synthesize the frontmatter.** No body yet — just the yaml block.
  - `title` (display name, quoted), `date: <today>`, `summary` (one sentence: what it computes, what it returns), `tags` (at least `computer-vision` + primary topic), `category` (one of `corner-detection | calibration-targets | subpixel-refinement | calibration`), `difficulty: intermediate` unless the content clearly warrants another tier, `author: "Vitaly Vorobyev"`.
  - `sources.primary`: the paper id.
  - `sources.references`: curated — direct antecedents from B4 plus any cross-link candidates from `bun papers:query pages-using <ref-id>`. These are the papers that will appear in `# References`.
  - `sources.notes`: freeform summary of key equations, symbols, and constants grounding the page.
  - `relatedAlgorithms`: union of `bun papers:query pages-using <ref-id>` over `sources.references`, plus judgment-based cross-links from the same algorithmic family.
  - **Omit `sources.impl` and `editorAlgorithmId`.** Neither can be inferred safely. Add them only when the user supplies a repo URL or names an existing adapter id.
  - **Typed relations.** If the research note's `## NEW: <slug>` or `## UPDATE: <slug>` block records a `Relations:` block (one or more `{ type, target, confidence, caution }` entries — recorded by `paper-ingest` Step 4b), copy each entry into the frontmatter `relations:` list verbatim. Verify each `target` slug resolves to an on-disk page before writing.
  - **Historical fork.** If the research note ALSO records `Quality: historical`, set `quality: historical` in the frontmatter; **drop** `editorAlgorithmId` (no Try-in-editor CTA on a historical page); **omit** `comparedWith` entirely (per CLAUDE.md → Comparison authoring discipline → Rule A — supersession is not comparison). The historical fork requires that at least one of the copied `relations[]` entries is `{ type: generalized_by, confidence: high }` and that its target is non-draft, non-historical — the validator (Rule 4b) enforces this.

B9. **Write `content/algorithms/<slug>.md`** with the frontmatter above — no body. Then continue with Workflow §4.

### What Bootstrap writes where

| Artifact | Location | Writer |
|---|---|---|
| Paper metadata stanza | `docs/papers/index.yaml` | Edit tool (B3, B4) |
| Cached PDF + `pdftotext` output | `docs/papers/.cache/<id>.{pdf,txt}` | `bun papers:fetch` (B5) |
| Cached ar5iv HTML (arxiv papers) | `docs/papers/.cache/<id>.html` | `bun papers:fetch` (B5) |
| Research note | `docs/research/notes/<primary-id>.md` | Created by `paper-ingest` — required precondition |
| Page frontmatter (no body) | `content/algorithms/<slug>.md` | Write tool (B9) |
| Page body | `content/algorithms/<slug>.md` | Workflow §7 (Draft contract delegation; Opus assembles + writes once) |

### Workflow steps

1. **Read `sources` from the page frontmatter.** If absent, run Bootstrap above.
2. **Confirm research notes.** Verify `docs/research/notes/<primary-id>.md` exists. For each `<ref-id>` in `sources.references`, verify `docs/research/notes/<ref-id>.md` exists. Any missing note → stop, tell the user to run `/paper-ingest` first. Do NOT fall back to reading the cache.
3. **Cache the impl** (only if `sources.impl` is set). `bun impls:fetch <slug>` writes raw files into `docs/impls/.cache/<owner>/<repo>/<sha>/<file>`. Opus will pass these paths to the Draft subagent in Step 7.
4. **Query the citation graph** (lightweight, in-orchestrator). `bun papers:query cites <primary-id>` and `bun papers:query pages-using <ref-id>` for each reference — used to populate `relatedAlgorithms` candidates. Output is small (slug list).
5. **Read frontmatter of candidate cross-link pages.** For each candidate slug from §4, read only the page's frontmatter (cheap, ~200 tokens each). Do not load page bodies. Use the frontmatter `summary` and `sources.primary` to confirm a cross-link makes sense.
6. **Assemble the Draft contract input.** Collect: primary note path, reference note paths, cached impl file paths, page-template skeleton path, target slug. **Pick the template on `frontmatter.quality`**: when `quality: "historical"`, pass `references/algo-page-template-historical.md` (trimmed: Goal + Historical context + References — no Algorithm/Implementation/Remarks); otherwise pass `references/algo-page-template.md`. **Opus does NOT read the notes themselves at this step** — the Draft subagent will.
7. **Delegate the page draft to Sonnet.** Invoke the Draft contract from `.claude/skills/_shared/subagent-prompts.md` with the inputs from §6. Sonnet returns:
   - The full page body as a markdown string in its reply
   - A `<<<AUDIT>>>{json}<<<END>>>` block listing every constant / equation / symbol used in the body and the source note that supplied each

   Sonnet **does not** write any file. Sonnet **does not** read cache files. If Sonnet returns `blocked: missing <kind> <name> for <source-id>`, the note is incomplete — fix the note (extend it by hand or rerun paper-ingest after deleting the note) and retry the delegation.
7.5. **Illustration pass.** Scan each section against the "good signals" in the Illustrations section above. Choose the primitive by content:
  - Control flow / pipeline stages → Mermaid (inline, no asset).
  - Small fixed geometric scheme (≤ ~15 primitives) → hand-authored SVG under `content/images/<slug>/`.
  - Anything that evaluates a function, plots a region, sweeps a parameter, or embeds page-level constants → **generator script** under `py/generate_<slug>_<name>.py` writing `content/images/<slug>/<name>.svg`, run from `.venv/bin/python`. Commit the script and the SVG. Model it on `py/generate_harris_eigenvalue_regions.py`.
  - Real-image data the generator cannot synthesize → `<!-- TODO figure: ... -->` placeholder and a bullet in working notes.

  At most two figures per page — one pipeline diagram plus one geometric / data-driven scheme is the usual ceiling. Every label and constant in the figure must land on the working-notes list that step 8 audits. Do not commit draft-quality figures; if the production-ready version is not feasible under the current pass, omit the figure and leave a TODO.
8. **Quality gate.** Verify the AUDIT JSON against the cited notes using the verification recipe in `_shared/subagent-prompts.md`:
   ```bash
   # For each entry in AUDIT, grep -F the value in the named source note
   # Zero MISS lines = page faithfully copies from notes
   ```
   Any MISS line means either (a) the note is incomplete and should be extended, or (b) Sonnet hallucinated. In case (a), extend the note and re-delegate. In case (b), reject the draft and re-delegate with a stricter prompt.
9. **Assemble and write.** Opus assembles `--- frontmatter ---\n<body string from Sonnet>` and calls `Write` once. The frontmatter `prerequisites` / `relatedAlgorithms` / `comparedWith` slugs come from the note's `Connections` section + the §4 citation-graph candidates, NOT from the body string. Cross-check every slug against `knownSlugs` (read from `src/generated/content-graph.ts` or by listing `content/{algorithms,models,concepts}/`).
10. **Verify.** `bun run build && bun run lint && npx vitest run`.

## Voice rules

See `.claude/skills/_shared/voice-rules.md` for the canonical rules. They are binding.

## Historical pages — voice rules

Pages with `quality: "historical"` follow a tighter discipline:

- **No editorialising about obsolescence.** Words like "outdated", "obsolete", "primitive", "legacy", "archaic" are forbidden. The reader-visible "Historical" badge already conveys the status. Prose stays factual: state when the paper appeared, what was new, what the successor improved, why the page is preserved.
- **No `# Algorithm` / `# Implementation` / `# Remarks` headings.** The trimmed template is `# Goal` + `# Historical context` + `# References` only. Math lives in the original paper PDF and the research note; do not duplicate it.
- **`# Historical context` covers four points** in 2–4 paragraphs: (a) when and in what landscape the paper appeared; (b) what was new — the contribution sentence; (c) what the successor improved (with a concrete sentence on the lifted limitation, linking the successor's page); (d) why the page is preserved (citation lineage, pedagogical value, period-correct understanding).
- **No "When to choose X over Y" subsections.** Supersession is not comparison; the `successor:` field carries the relationship.
- **References include the successor's primary source** so the reader can follow the lineage forward without leaving the page.

## Forbidden patterns (taken from real failure modes)

- Opening paragraph of the form "Calibration does not need generic interesting points..."
- Paragraph of the form "Classical detectors such as Harris, Shi-Tomasi, and FAST..."
- Parenthetical aside of the form "(OpenCV's X follows a different route...)"
- Attribution in prose: "Bennett and Lasenby proposed..." — belongs in `# References`.
- Library-usage code: `cargo add crate-name`, `use crate::entry_point;`, `entry_point(&img, &cfg)`.
- Any first-person sentence.
- Any sentence ending "...in practice." as a closing flourish.
- Section closings of the form "This is what makes X attractive."
- "In most practical cases, the default settings work well." — delete the whole sentence; this is tutorial filler.
- "Measured performance: X ms on <hardware>..." as a Remarks bullet. Benchmarks belong in blog posts or READMEs, not in the algorithm reference.
- "Reference implementation: [crate](github-url)" as a Remarks bullet. The page's `# Implementation` section IS the reference; a crate pointer doubles as endorsement and misleads readers about what counts as standard.
- Horizontally-overflowing display math: `$$ \Delta = [(0,-3),(1,-3),(2,-2), \ldots ] $$` on one line. Wrap in `\begin{aligned}...\end{aligned}` with `\\` breaks.
- **Loading the paper cache file (`docs/papers/.cache/*.{html,txt}`) into the orchestrator's context.** All paper reads happen in the Sonnet subagent during `paper-ingest`; the orchestrator works from notes only. If you find yourself opening a `.cache/` file in algo-page, stop — run `/paper-ingest` first to materialize the note.

## Checklist

Run before handing off a draft.

- [ ] Exactly five top-level sections, in order: Goal, Algorithm, Implementation, Remarks, References. No numbered heading prefixes.
- [ ] `# Goal` is one paragraph. No narrative, no attribution, no named alternative tools.
- [ ] `# Algorithm` defines every symbol, names every computed quantity, and gives a numbered procedure. Prose between formulas is one sentence per gap at most.
- [ ] `# Implementation` shows the core computation, not library usage. No `cargo add` / `pip install`. No top-level library entry-point calls. Code corresponds directly to the math in `# Algorithm`.
- [ ] `# Remarks` is a bulleted list. 3–6 bullets. Each bullet is declarative.
- [ ] `# References` is a numbered list. 1–5 entries. Primary source is entry 1. Only include references directly relevant to the method described on the page — do not pad with tangential classical citations.
- [ ] Every named quantity in `# Algorithm` is wrapped in a `:::definition[...]` block.
- [ ] The procedure subsection is a `:::algorithm[...]` block with `::input[...]` and `::output[...]` leaf directives.
- [ ] No first-person pronouns anywhere on the page.
- [ ] No rhetorical questions, no framing questions.
- [ ] No softeners, no marketing vocabulary, no hedges.
- [ ] Math uses `$...$` and `$$...$$`. Every code fence has a language tag.
- [ ] Frontmatter: `category` present. `relatedDemos` and `editorAlgorithmId` evaluated (populate if applicable).
- [ ] Frontmatter `sources:` block populated: `primary` set; `impl` set when a sibling Rust crate exists (not when the page's own `# Implementation` is the only Rust); `references` lists every paper cited in `# References`.
- [ ] Every paper id in `sources:` exists as an entry in `docs/papers/index.yaml`.
- [ ] Working notes (ephemeral, not committed) trace every numerical constant on the page to a specific source line — paper §/equation or impl file/line. Anything untraceable was fixed or removed.
- [ ] `# Remarks` contains no measured benchmarks and no "reference implementation: <crate>" pointers. Content is about the algorithm itself.
- [ ] Every display-math formula fits within the content column. Long offset lists, matrix tables, and multi-term derivations use `\begin{aligned}...\end{aligned}` with explicit `\\` line breaks.
- [ ] Illustration pass done: at least one figure is present (Mermaid fence, hand-authored SVG, or generator-produced SVG) or a `<!-- TODO figure: ... -->` placeholder documents what is missing and why. No figure is decorative; every label and constant inside a figure traces to the same source as the page's math.
- [ ] Every generated SVG under `content/images/<slug>/` has a sibling `py/generate_<slug>_<name>.py` committed alongside it. Re-running the script from `.venv/bin/python` produces byte-identical output, the `<svg>` element carries `role="img"` with `<title>` + `<desc>` children, `svg.fonttype="none"` (or the tool's equivalent) keeps text as text, **every rendered label is ≥ 12 pt** (subscripts inside a math symbol excepted — they're part of the glyph), **the figure patch is an opaque light card** (`fig.patch.set_facecolor("#f8fafc")` with `ax.set_facecolor("#ffffff")`) so title and axis labels stay legible in both light and dark themes, and **there is no inside-the-figure caption paragraph** (captions live in the markdown next to the image).
- [ ] If `editorAlgorithmId` is set, the sample-id mapping in `src/pages/AlgorithmPost.tsx` covers it and the "Try in the editor" button lands the user in editor mode with an image preloaded and the algorithm preselected — one click to Run.
- [ ] A research note exists for `sources.primary` AND every entry in `sources.references`. Page draft is the result of the Draft contract on those notes; the orchestrator did not load any `docs/papers/.cache/*` file.
- [ ] AUDIT JSON returned by the Draft subagent has zero MISS entries when grep-checked against the cited notes (verification recipe in `_shared/subagent-prompts.md`).
- [ ] Frontmatter `prerequisites` / `relatedAlgorithms` / `comparedWith` slugs were sourced from the primary note's `Connections` section + §4 citation-graph candidates, NOT taken from the body string Sonnet returned.

## Notes on cache file fidelity

For arxiv papers, `docs/papers/.cache/<id>.html` (ar5iv rendering) preserves LaTeX source in `<annotation encoding="application/x-tex">` blocks and section structure in `<section id="Sx…">` — equations transcribe directly without OCR artefacts. For non-arxiv papers, or when ar5iv returned 404, `<id>.txt` (pdftotext -layout) serves as the fallback. These notes are guidance for whoever is creating the research note via `paper-ingest` — the orchestrator (Opus) does not open cache files during `algo-page`.

## When not to use this skill

Use `tech-writer` for blog posts, engineering notes, and any narrative technical writing under `content/blog/*.md`. This skill is for the algorithms register only — `content/algorithms/*.md`.

If a draft wants to explain the history of an algorithm, contrast it with alternatives, or walk a reader through intuition, that is a blog post. Move the material to `content/blog/` and use `tech-writer`.

## Resources

- [references/algo-page-template.md](references/algo-page-template.md) — copy-pasteable skeleton
- `/Users/vitalyvorobyev/vitavision/content/algorithms/chess-corners.md` — canonical exemplar of the reference-entry voice
- `/Users/vitalyvorobyev/vitavision/py/generate_harris_eigenvalue_regions.py` → `content/images/harris-corner-detector/eigenvalue-classification.svg` — canonical generated-figure pair (deterministic SVG, accessibility post-pass, Tailwind-aligned palette). Copy its scaffold when writing a new generator.
- `/Users/vitalyvorobyev/vitavision/docs/papers/index.yaml` — registry of authoritative sources (papers + citation graph). Query via `bun papers:query`.
- `bun papers:fetch [id]` / `bun papers:fetch-meta <arxiv-id|doi>` / `bun impls:fetch <slug>` / `bun papers:query <relation> <id>` — the four reasoning tools that drive the Workflow above.
- `.venv/bin/python py/generate_<slug>_<name>.py` — repo-root venv (matplotlib, numpy preinstalled) for running and re-running generator scripts.
- `.claude/skills/_shared/subagent-prompts.md` — Draft contract template, AUDIT JSON shape, page-vs-note verification recipe.
