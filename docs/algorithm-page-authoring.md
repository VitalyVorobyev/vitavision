# Adding a new algorithm page

> The canonical authoring rules now live in [`.claude/skills/algo-page/SKILL.md`](../.claude/skills/algo-page/SKILL.md). For the broader workflow that ties algorithm pages to research notes and the relationship graph, read [`docs/README.md`](README.md).

## Fast path — one sentence

Tell Claude one of:

```
draft arxiv:<id>
draft doi:<doi>
draft <pdf-url>
```

Claude runs the `algo-page` skill in bootstrap mode and produces `content/algorithms/<slug>.md`. The skill handles metadata fetch, paper-index appending, PDF caching, and the five-section page draft.

If a research note exists at `docs/research/notes/<paper-id>.md`, the skill reads its `## NEW: <slug>` or `## UPDATE: <slug>` block and uses those bullets as authoritative content guidance — see [Path A in `docs/README.md`](README.md#path-a--paper-driven-the-common-case).

## Prerequisites

- `poppler` (provides `pdftotext`) and `curl` on `$PATH`. Install once: `brew install poppler`.
- Optional: `export OPENALEX_EMAIL=you@example.com` for OpenAlex's polite pool.

## When the skill needs help

You provide these — the skill cannot infer them:

- `sources.impl` — repository, commit, and files when an existing implementation backs the page.
- `editorAlgorithmId` — when a registered `/editor` adapter exists for the algorithm.

## Validation

```bash
bun run build && bun run scripts/validate-content.ts
```

Both must pass before commit. The build runs validation automatically; the standalone script is for fast iteration during authoring.
