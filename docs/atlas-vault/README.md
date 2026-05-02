# Atlas vault

**Generated artifact — do not edit by hand.** Source of truth lives in
`content/algorithms/`, `content/models/`, `content/concepts/`, and
`docs/papers/index.yaml`. Run `bun run vault:build` to regenerate.

## Purpose

An Obsidian-compatible projection of the atlas — every algorithm, model,
concept, and paper is a stub `.md` whose body contains `[[wikilinks]]` for
every forward edge (prerequisites, related, comparedWith, failureModes,
sources, paper→paper citations). Open this folder as a vault in Obsidian
and use the graph view to look for clusters, gaps, and isolated islands.

## Counts

- Algorithms: 17
- Models: 2
- Concepts: 5
- Papers: 35

## Conventions

- Filenames are global slugs / paper IDs; wikilinks resolve by basename.
- Forward edges only. Obsidian's backlinks panel shows the reverse view.
- No author nodes — query authors with `grep` over
  `docs/papers/index.yaml`.
- Edits made in Obsidian do **not** flow back to source. Authoring goes
  through the `algo-page`, `deep-model-page`, `concept-page`, and
  `paper-ingest` skills.

## Not deployed

This folder is committed to the public GitHub repo for reproducibility,
but is **not** part of the deployed site at vitavision.dev. The postbuild
guard in `scripts/postbuild.ts` fails the build if any `docs/atlas-vault/`
or `docs/research/` path leaks into `dist/`.
