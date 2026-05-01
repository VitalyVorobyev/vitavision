# AGENTS.md — Atlas authoring operating guide

This file is consumed by Claude instances working on vitavision. It covers the atlas content rules. For broader project context see CLAUDE.md.

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

There is no `/content/atlas/` directory, no Obsidian vault, no export pipeline. The atlas is a navigation and relationship layer over `content/algorithms/`, `content/models/`, and `content/concepts/`. Do not create parallel namespaces.
