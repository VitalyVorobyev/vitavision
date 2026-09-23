# AGENTS.md — Atlas authoring operating guide

This file is consumed by any agent runtime working on vitavision (Claude Code and Codex both). It covers the atlas content rules. For broader project context see `.claude/CLAUDE.md`.

## Skills

Reusable task skills live at `.claude/skills/<name>/SKILL.md`. This is the single canonical location regardless of which agent runtime is reading. Available skills: `algo-page`, `atlas-audit`, `author-identity`, `authorial-technical-editor`, `concept-page`, `deep-model-page`, `impl`, `narrative-page`, `paper-ingest`, `tech-writer`.

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

## Narratives

`content/narratives/*.md` — a curated argument told by moving through the atlas graph. Nodes are
an atlas slug XOR a registered paper XOR a `question` (no year, no link); paper-only nodes are
tracked debt (`bun run narratives:debt` lists them). Edges use their own story vocabulary —
`prerequisite | evolution | bridge | contrast` — distinct from `relations[]`, and must not
contradict the pages' authored Atlas relations (validator warns on contradiction). Author or
update via the `narrative-page` skill.

## Authors registry

Author identities are keyed by OpenAlex ids in `docs/papers/authors.yaml`; papers carry
`authorIds` in `docs/papers/index.yaml`. Never hand-invent an id. Duplicate identities are merged
via `mergedInto` (build-resolved; old ids redirect; use the `author-identity` skill) — never delete an author row to fix a split identity.

## Source IDs

Every `sources.primary` and entry in `sources.references` must exist as a key in `docs/papers/index.yaml`. Do not invent IDs. Concept pages may omit `sources:` entirely if no canonical paper exists.

## Validation

```bash
bun run content:validate             # non-draft pages
INCLUDE_DRAFTS=true bun run content:validate  # all pages
```

There is one validator (`scripts/validate-content.ts`, aliased as `content:validate`). Run it before opening a PR. It checks slug resolution (including `relations[].target`), prerequisite cycles, source-id existence, canonical-quality gates, image references, internal links, and cross-content references (`relatedPosts`/`relatedDemos`/legacy `relatedAlgorithms`), across every content kind — see `.claude/CLAUDE.md` → "Validation" for the full list.

`bun run build` (`INCLUDE_DRAFTS=true bun run content:build && tsc -b && vite build`) already runs this validator with drafts included, via `scripts/content-build.ts`, and fails the build on any validation error — so, consistent with unknown slugs failing `bun run build` above, a local build succeeding is proof the graph validates against the include-drafts set.

CI's `validate-content` job runs `bun run content:validate` on published pages only (no `INCLUDE_DRAFTS`) — the one case `bun run build` doesn't cover.

## No parallel atlas tree

There is no `content/atlas/` directory and no export pipeline. The atlas is a navigation and
relationship layer over `content/algorithms/`, `content/models/`, `content/concepts/`, and
`content/narratives/`, served at `/atlas` (tabs for grid, list, graph, and narratives). There is
a generated Obsidian vault at `docs/atlas-vault/` (`bun run vault:build`) — it is a derived,
never-authored projection for exploring the graph in Obsidian, not a parallel content tree; never
edit it by hand or author from it. Do not create other parallel namespaces.
