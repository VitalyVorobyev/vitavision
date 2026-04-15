---
name: algo-page
description: Write reference entries for the Vitavision algorithms register under content/algorithms/*.md. Each entry is a compact, textbook-style card — goal, minimal algorithm declaration, core implementation snippet, remarks, references. This is NOT a blog-post voice and NOT the tech-writer skill.
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

## Frontmatter

Validates against `algorithmFrontmatterSchema` in `src/lib/content/schema.ts`.

```yaml
# Required
title: "..."          # Display title
date: YYYY-MM-DD
summary: "..."        # One sentence, index-card length
tags: [...]           # At least one
category: ...         # corner-detection | calibration-targets | subpixel-refinement | explainers
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
```

`relatedDemos` and `editorAlgorithmId` should be considered for every page. `sources` is required for every new page — see the Workflow section below.

### `editorAlgorithmId` — deep-link must be one-click runnable

Setting `editorAlgorithmId` renders a "Try in the editor →" button on the page, linking to `/editor?algo=<id>&sample=<sample-id>`. The sample id is mapped from the algorithm id by a lookup in `src/pages/AlgorithmPost.tsx` (currently: `chess-corners → chessboard`, `chessboard → chessboard`, `charuco → charuco`, `markerboard → markerboard`, `ringgrid → ringgrid`, `radsym → ringgrid`). The landing experience must be: editor mode, sample image preloaded, algorithm preselected, one click on Run.

When introducing a new `editorAlgorithmId` value:

1. Confirm the adapter is registered in `src/components/editor/algorithms/registry.ts` and its id appears in the sample-id mapping in `AlgorithmPost.tsx`. If missing, add the entry so the CTA preloads an image.
2. If the algorithm needs a new sample image not yet in `galleryImages` (`src/store/editor/useEditorStore.ts`), add it there with a `sampleId` and add the `sampleId` to `VALID_SAMPLE_IDS` in `src/hooks/useEditorDeepLink.ts`.
3. Smoke-test: visit `/algorithms/<slug>`, click "Try in the editor", confirm the image loads and the algorithm is preselected before touching anything.

A deep-link that leaves the user in gallery mode with no image is worse than no link — they don't know what to do next.

## Workflow

This procedure is mandatory for any new or rewritten algorithm page. It codifies the chess-corners process: ground every claim in primary sources, fetched at pinned versions, queried via the citation graph.

### Adding a new algorithm

For a brand-new page that does not yet exist, run this bootstrap before Workflow §1.

a. **Add the primary paper to the registry.** `bun papers:fetch-meta arxiv:<id>` (or `doi:<doi>`). The script prints a candidate yaml entry to stdout. Review the suggested `id` (`firstauthorYEAR-keyword`) and adjust if needed. Paste into `docs/papers/index.yaml`.
b. **Close the citation graph.** Each `cites:` entry that emits a `<name>YEAR-???` placeholder is a paper not yet in the registry. Recurse: `bun papers:fetch-meta` on each, paste, repeat. Stop when every cite resolves to an existing id (or when the remaining cites are not relevant to algorithm pages — those can be left as `???` placeholders to drop later by hand).
c. **Decide the impl pointer.** For algorithms backed by a sibling Rust crate (e.g. `chess-rs`), pin via `sources.impl` with the SHA from `git ls-remote <repo> HEAD` and the canonical algorithm files (the algorithm core, not glue or wrappers). For algorithms whose only Rust implementation is the kernel snippet on the page itself, omit `sources.impl` — the page's `# Implementation` section is the canonical reference.
d. **Create `content/algorithms/<slug>.md`** with frontmatter only (no body): `title`, `date`, `summary`, `tags`, `category`, `author`, `difficulty`, `sources`, `editorAlgorithmId` (if applicable), `relatedDemos` (if applicable), and `relatedAlgorithms` derived by running `bun papers:query pages-using <ref-id>` for each cited paper.
e. **Cache.** `bun papers:fetch && bun impls:fetch <slug>` (the latter only if `sources.impl` is set).
f. **Proceed with Workflow §4 onward** (paper reading, drafting, quality gate, verify).

### Workflow steps

1. **Read `sources` from the page frontmatter.** If the page has none, follow the bootstrap above.
2. **Cache the papers.** `bun papers:fetch <primary-id>` and `bun papers:fetch <ref-id>` for each entry in `sources.references`. The script downloads each PDF and runs `pdftotext -layout` into `docs/papers/.cache/<id>.txt`.
3. **Cache the impl.** `bun impls:fetch <slug>` if `sources.impl` is set. The script fetches each file from `raw.githubusercontent.com/<owner>/<repo>/<sha>/<file>` into `docs/impls/.cache/<owner>/<repo>/<sha>/<file>`.
4. **Read the primary paper.** Open `docs/papers/.cache/<primary-id>.txt`. Locate the algorithm's defining equations, named quantities, and the operational procedure. Note section/equation numbers — you will reference them in working notes.
5. **Read the impl.** Open the cached impl files. Locate the canonical constants — offset tables, threshold values, magic numbers — that the page must match exactly.
6. **Query the citation graph.** `bun papers:query cites <primary-id>` returns ids that the primary references — these are candidates for `# References` and for `relatedAlgorithms`. `bun papers:query pages-using <ref-id>` for each cited paper finds existing algorithm pages that share a source — also candidates for `relatedAlgorithms`.
7. **Draft.** Use the 5-section template (Goal, Algorithm, Implementation, Remarks, References) and the typography blocks (`:::definition[...]` for named quantities, `:::algorithm[...]` with `::input[...]`/`::output[...]` for the procedure).
8. **Quality gate.** In working notes (not committed, not in the page), enumerate every numerical constant, symbol, and offset that appears in the drafted page. For each, write the source line: paper section/equation number, or impl file path + line. Anything not traceable to a source is either fabricated or implementation-detail noise — fix or remove. *This gate is what catches the failures: a "bilinear interpolation" claim with no paper citation; an "8-bit" qualifier whose only source is the impl's `u8` pixel type.*
9. **Verify.** `bun run build && bun run lint && npx vitest run`.

## Voice rules (reference-entry voice)

This voice is distinct from `tech-writer`. Do **not** import its moves.

- **Impersonal.** No "I", no "my", no "in my view", no "one notable property".
- **Declarative.** Statements of fact or definition. No rhetorical questions, no framing questions.
- **Minimal glue prose.** Between math/code blocks, one sentence is usually enough. Two is the upper limit.
- **No narrative arc.** No opening move, no section landings, no closing implications. Each section stops when its content is done.
- **No acknowledgment or attribution in prose.** The related-tools discussion and author names live in `# References`, not in `# Goal`. Parenthetical asides about alternatives are banned.
- **No intuition paragraphs around formulas.** The formula defines the quantity; the symbol list explains the symbols. That is sufficient. Do not prepend "A chessboard corner creates an alternating pattern on the ring:" before a formula — just define the quantity.
- **Sentences are short.** Prefer 10–20 words. If a sentence has more than one clause, consider splitting.
- **Passive voice is acceptable** when it keeps the subject nominal ("The response map is computed as...").
- **No softeners, no marketing words, no hedges** — same as tech-writer §18, for the same reasons.

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
- [ ] If `editorAlgorithmId` is set, the sample-id mapping in `src/pages/AlgorithmPost.tsx` covers it and the "Try in the editor" button lands the user in editor mode with an image preloaded and the algorithm preselected — one click to Run.

## When not to use this skill

Use `tech-writer` for blog posts, engineering notes, and any narrative technical writing under `content/blog/*.md`. This skill is for the algorithms register only — `content/algorithms/*.md`.

If a draft wants to explain the history of an algorithm, contrast it with alternatives, or walk a reader through intuition, that is a blog post. Move the material to `content/blog/` and use `tech-writer`.

## Resources

- [references/algo-page-template.md](references/algo-page-template.md) — copy-pasteable skeleton
- `/Users/vitalyvorobyev/vitavision/content/algorithms/chess-corners.md` — canonical exemplar of the reference-entry voice
- `/Users/vitalyvorobyev/vitavision/docs/papers/index.yaml` — registry of authoritative sources (papers + citation graph). Query via `bun papers:query`.
- `bun papers:fetch [id]` / `bun papers:fetch-meta <arxiv-id|doi>` / `bun impls:fetch <slug>` / `bun papers:query <relation> <id>` — the four reasoning tools that drive the Workflow above.
