# AGENTS.md — Atlas authoring operating guide

This file is consumed by Claude instances working on vitavision. It covers the atlas content rules. For broader project context see CLAUDE.md.

## Private research workflow

1. **New sources become private notes first.** Use `paper-ingest` to turn an arxiv ID, DOI, URL, or local PDF into `docs/research/notes/<paper-id>.md`. Public pages are not modified by `paper-ingest`.
2. **Public pages updated only after note review.** After `paper-ingest`, read the note's `# Atlas update plan` section. Then invoke `algo-page`, `deep-model-page`, or `concept-page` against the affected slug. Never update public pages directly from a raw LLM summary.
3. **Prefer updating existing pages over creating new ones.** When a new paper supplements an existing page, fan the note's bullets into that page's relevant sections rather than creating a new page.
4. **Map new sources to existing graph nodes.** Before proposing a new page slug, scan `content/algorithms/`, `content/models/`, and `content/concepts/` for an existing page that covers the method. If one exists, it is supplementary content — not a new page.
5. **Never publish raw LLM summaries.** Every claim on a public page must be traceable to a specific paper section, equation, table, or implementation file/line.
6. **Preserve source provenance via `docs/papers/index.yaml`.** Every `sources.primary` and `sources.references` entry must be a key in that file. Do not invent IDs.
7. **No pairwise comparison pages.** Use `comparedWith:` field + an inline `## When to choose X over Y` section in the more authoritative page. Surveys allowed with ≥3 methods, ≥800 words, and a decision table only.
8. **No authored reverse edges.** `usedBy:` and similar reverse fields are computed by the build (`src/generated/content-graph.ts`). Never add them manually.
9. **No unresolved slugs.** Verify every slug in relationship fields exists on disk before adding it. Unknown slugs are hard build errors.
10. **Concept-page criterion.** A concept page is warranted only when the concept is referenced as `prerequisites` in 3+ existing or planned public pages AND can support ≥500 words of substantive standalone content. If either criterion fails, the topic belongs as a section inside an existing page.

## Slug namespace

All relationship fields (`prerequisites`, `related`, `comparedWith`, `failureModes`, `relatedAlgorithms`) share a single namespace:
- `content/algorithms/<slug>.md`
- `content/models/<slug>.md`
- `content/concepts/<slug>.md`
- `content/failure-modes/<slug>.md` (empty in MVP)

Unknown slugs are hard build errors (`bun run build` fails). Always verify a slug exists on disk before adding it to any field.

## Forward edges only

Authors write forward edges. Reverse edges (`usedBy`, `comparedFrom`, `relatedFrom`, `affects`) are computed by the build and emitted to `src/generated/content-graph.ts`. Never add reverse fields manually.

For symmetric relations (`comparedWith`, `related`), author on one side only — the build mirrors to the other side.

## New page criteria

**Concept page** — only when:
1. Referenced by 3+ algorithm/model pages as a `prerequisites` entry, AND
2. Can support ≥500 words of substantive standalone content (definition, math, numerical concerns, implementation implications).

Do not create concept pages speculatively. The 5 MVP concepts are: `image-gradient`, `structure-tensor`, `homography`, `epipolar-geometry`, `scale-space`.

**Failure-mode page** — same criterion (3+ references, ≥500 words). Deferred until candidates accumulate. Set `failureModes: []` on all algorithm/model pages as a placeholder.

**Comparison page** — prohibited as a standalone pairwise page. Use the `comparedWith:` field plus an inline `## When to choose X over Y` section inside the more authoritative page. A survey page is allowed only when ≥3 methods are contrasted with ≥800 words and a decision table.

## Quality field

- Omitted = normal published page (default behavior, no badge).
- `quality: "stub"` = public placeholder, reader-visible warning badge.
- `quality: "canonical"` = flagship reviewed page, stricter validation gate (sources required, prerequisites non-empty, no TODO markers in rendered HTML).

Do not add `status:` or `review:` fields — these are not in the schema.

`draft: true` is the publication gate. A draft page is excluded from the atlas index and validation (unless `INCLUDE_DRAFTS=true`).

## Source IDs

Every `sources.primary` and entry in `sources.references` must exist as a key in `docs/papers/index.yaml`. Do not invent IDs. Concept pages may omit `sources:` entirely if no canonical paper exists.

## Validation

```bash
bun run scripts/validate-content.ts             # non-draft pages
INCLUDE_DRAFTS=true bun run scripts/validate-content.ts  # all pages
```

The build (`bun run build`) runs the same validation and fails on: broken slugs, prerequisite cycles, missing source IDs, canonical-quality violations.

## No parallel atlas tree

There is no `/content/atlas/` directory, no Obsidian vault, no export pipeline. The atlas is a navigation and relationship layer over `content/algorithms/`, `content/models/`, and `content/concepts/`. The atlas is served at `/algorithms` (with tabs for algorithms, models, concepts). Do not create parallel namespaces.
