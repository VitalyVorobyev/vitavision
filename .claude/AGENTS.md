# AGENTS.md — Atlas authoring operating guide

This file is consumed by Claude instances working on vitavision. It covers the atlas content rules. For broader project context see CLAUDE.md.

## Private research workflow

1. **New sources become private notes first.** Use `paper-ingest` to turn an arxiv ID, DOI, URL, or local PDF into `docs/research/notes/<paper-id>.md`. Public pages are not modified by `paper-ingest`.
2. **Public pages updated only after note review.** After `paper-ingest`, read the note's `# Atlas update plan` section. Then invoke `algo-page`, `deep-model-page`, or `concept-page` against the affected slug. Never update public pages directly from a raw LLM summary.
3. **Prefer updating existing pages over creating new ones.** When a new paper supplements an existing page, fan the note's bullets into that page's relevant sections rather than creating a new page.
4. **Map new sources to existing graph nodes.** Before proposing a new page slug, scan `content/algorithms/`, `content/models/`, and `content/concepts/` for an existing page that covers the method. If one exists, it is supplementary content — not a new page.
5. **Never publish raw LLM summaries.** Every claim on a public page must be traceable to a specific paper section, equation, table, or implementation file/line.
6. **Preserve source provenance via `docs/papers/index.yaml`.** Every `sources.primary` and `sources.references` entry must be a key in that file. Do not invent IDs.
7. **No pairwise comparison pages.** Use a `relations[]` entry with `type: compared_with` + an inline `## When to choose X over Y` section in the more authoritative page. Surveys allowed with ≥3 methods, ≥800 words, and a decision table only.
8. **No authored reverse edges.** `usedBy`, `affects`, and the typed reverse buckets (`generalises`, `extending`, `fedBy`, `hasLearnedAlternative`) are computed by the build (`src/generated/content-graph.ts`). Never add them manually.
9. **No unresolved slugs.** Verify every slug in relationship fields exists on disk before adding it. Unknown slugs are hard build errors.
10. **Concept-page criterion.** A concept page is warranted when the topic is a genuinely fundamental, cross-cutting CV concept that can support ≥500 words of substantive standalone content, synthesised from ≥3 distinct sources. The number of pages that will reference it is **not** a gate — a fundamental concept earns a page even before its dependents exist. If the substance or source-diversity bar fails, the topic belongs as a section inside an existing page.

## Slug namespace

All relationship fields (`prerequisites`, `failureModes`, `relations[].target`) share a single namespace:
- `content/algorithms/<slug>.md`
- `content/models/<slug>.md`
- `content/concepts/<slug>.md`
- `content/failure-modes/<slug>.md` (empty in MVP)

`relatedAlgorithms` is a separate, untyped field valid only on blog and demo frontmatter (a post or demo mentioning atlas pages) — it does not participate in this shared namespace's validation as a relationship field on atlas pages themselves. `related` and `comparedWith` no longer exist in the schema; do not write them anywhere.

Unknown slugs are hard build errors (`bun run build` fails). Always verify a slug exists on disk before adding it to any field.

## Forward edges only

Authors write forward edges (`prerequisites`, `failureModes`, `relations[]`). Reverse edges (`usedBy`, `affects`, and the typed reverse buckets `generalises`, `extending`, `fedBy`, `hasLearnedAlternative`) are computed by the build and emitted to `src/generated/content-graph.ts`. Never add reverse fields manually.

For symmetric relation types (`compared_with`, `alternative_formulation_of`, `parallel_foundation_with`), author on one side only — the build mirrors the entry onto the target's forward edges.

## Relations field

`relations: <TypedRelation>[]` replaces the legacy generic catch-alls `related`, `relatedAlgorithms`, and `comparedWith` on algorithm/model/concept pages. Each entry is `{ type, target, confidence, caution? }`.

`type` is a small fixed vocabulary in three categories — pick the one that matches the actual relationship, don't default to `compared_with`:

- **Lineage**: `generalized_by` (asymmetric, same problem strictly superseded — pairs with `quality: "historical"` + `confidence: high` for the strong form), `alternative_formulation_of` (symmetric, same problem/different math, both alive), `parallel_foundation_with` (symmetric, concurrent peers), `extended_by` (asymmetric, target builds on this without replacing it).
- **Practice**: `compared_with` (symmetric, peer practitioner choice), `feeds_into` (asymmetric, B was conceived building on A as a named component — intellectual lineage, not "A's output can feed B"; chronology A ≤ B is build-validated).
- **Cross-paradigm**: `learned_alternative_of` (asymmetric, model→algorithm only — a deep-learning replacement for a classical method).

`confidence` is required (`high` | `medium` | `low`, no default — commit to one). `caution` is an optional ≤200-char note for a nuanced relationship. Full worked examples and Rules A/B/C for choosing the right type: `.claude/CLAUDE.md` → "Relations field" / "Comparison authoring discipline", and `docs/README.md` §4.

## New page criteria

**Concept page** — only when:
1. The topic is a genuinely fundamental, cross-cutting CV concept, AND
2. Can support ≥500 words of substantive standalone content (definition, math, numerical concerns, implementation implications), synthesised from ≥3 distinct sources.

The number of pages that will reference the concept via `prerequisites` is **not** a gate — a fundamental concept earns a page even before its dependents exist. Do not create concept pages speculatively on topics that fail either criterion above.

**Failure-mode page** — same word-count bar (referenced by 3+ algorithm/model pages, ≥500 words). Deferred until candidates accumulate. Set `failureModes: []` on all algorithm/model pages as a placeholder.

**Comparison page** — prohibited as a standalone pairwise page. Use a `relations[]` entry with `type: compared_with` plus an inline `## When to choose X over Y` section inside the more authoritative page. A survey page is allowed only when ≥3 methods are contrasted with ≥800 words and a decision table — it is authored as a **concept page**, and every surveyed algorithm/model page lists the survey concept in its own `prerequisites` (not `relations[]` — there is no relation type for survey membership).

## Quality field

- Omitted = normal published page (default behavior, no badge).
- `quality: "stub"` = public placeholder, reader-visible warning badge.
- `quality: "canonical"` = flagship reviewed page, stricter validation gate (sources required, prerequisites non-empty, no TODO markers in rendered HTML).
- `quality: "historical"` = preserved for citation/lineage, superseded for practical use. Renders a "Historical" badge and a "Superseded by" link; requires a `relations[]` entry of type `generalized_by` with `confidence: high`. Body trims to `# Goal` + `# Historical context` + `# References` only; drops `editorAlgorithmId`.

Do not add `status:` or `review:` fields — these are not in the schema.

`draft: true` is the publication gate. A draft page is excluded from the atlas index and validation (unless `INCLUDE_DRAFTS=true`).

## Source IDs

Every `sources.primary` and entry in `sources.references` must exist as a key in `docs/papers/index.yaml`. Do not invent IDs. Concept pages may omit `sources:` entirely if no canonical paper exists.

## Validation

```bash
bun run scripts/validate-content.ts             # non-draft pages
INCLUDE_DRAFTS=true bun run scripts/validate-content.ts  # all pages
```

Run this **by path** before opening a PR. It checks slug resolution (including `relations[].target`), prerequisite cycles, source-id existence, and canonical-quality gates.

CI's `validate-content` job runs it too, as a step named "Validate content (Atlas graph)", alongside `bun run content:validate` → `scripts/content-validate.ts` (narrower — blog/algorithm internal links and `relatedPosts` only). The two script names are confusingly similar but cover different ground; neither supersedes the other. `bun run build` runs neither, so a local build succeeding is not proof content is valid.

## No parallel atlas tree

There is no `/content/atlas/` directory, no Obsidian vault, no export pipeline. The atlas is a navigation and relationship layer over `content/algorithms/`, `content/models/`, and `content/concepts/`. The atlas is served at `/algorithms` (with tabs for algorithms, models, concepts). Do not create parallel namespaces.
