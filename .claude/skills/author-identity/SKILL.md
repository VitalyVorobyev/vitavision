---
name: author-identity
description: Maintain the Atlas authors registry — link new papers to OpenAlex author ids, detect and merge split identities, fix misattributions. Never hand-invents ids; touches only docs/papers/authors.yaml and the authorIds field in docs/papers/index.yaml.
---

# Author Identity

The authors registry (`docs/papers/authors.yaml` + `authorIds:` in `docs/papers/index.yaml`)
drives `/authors` and `/authors/:id`. Every id is an OpenAlex `A…` author id, resolved from
OpenAlex data — never guessed from a name. This skill covers linking new papers, detecting split
identities (the same person registered under two ids), merging them, fixing misattributions
(a paper linked to the wrong person), and expanding initials-only display names.

## When to use

- **After `paper-ingest`** registers a new paper in `docs/papers/index.yaml` — link its authors
  before the page-authoring skill runs, so the new page's author bylines resolve.
- **Periodically** — run `bun run authors:dupes` to surface candidate identity splits before they
  compound (each new paper backfill can introduce a fresh duplicate for a returning author).
- **When a user reports** a wrong author page, a duplicate author page, or a paper attributed to
  the wrong person.

## Invariants

- Ids are OpenAlex `A…` ids only. Never invent one, never reuse a `docs/papers/index.yaml` paper
  id or a display-name slug as an author id.
- Never delete a row to fix a split identity — add `mergedInto: <canonical-id>` on the row being
  retired instead. Deleting a row breaks every paper's `authorIds` that still points at it.
- Canonical row when merging: the one with an ORCID wins; if both or neither have one, the one
  with more linked papers wins; if still tied, the lower `A…` id wins (deterministic tiebreak).
- `authors[]` (display strings in `docs/papers/index.yaml`, e.g. `"K. He"`) and `authorIds[]` on
  the same paper entry are **not** position-aligned — OpenAlex occasionally drops an author, so
  the arrays can differ in length. Alignment happens by surname matching at render time in
  `src/lib/atlas/authorLinks.ts` (`resolveAuthorIds`). Never "fix" perceived misordering by
  hand-shuffling one array to line up with the other.
- Hand edits to `name` or `orcid` in `authors.yaml` survive a re-run of the backfill — the merge
  is existing-row-wins, so correcting a mangled display name or adding a missing ORCID sticks.

## Workflow A — link a newly ingested paper

1. `bun run papers:backfill-authors --dry-run --only <paper-id>`
2. Review the printed diff: the `authorIds:` line proposed for the paper, and any new
   `authors.yaml` stanzas. Confirm every new id resolves to a real, distinct person (spot-check
   an unfamiliar name via `references/openalex-lookups.md` if unsure).
3. `bun run papers:backfill-authors --write --only <paper-id>`
4. `bun run authors:dupes` — check whether any id just added collides with an existing identity
   (same surname + initial, same ORCID, or an initials-only match against a full name already on
   file). If it does, stop and go to **Workflow B** before continuing.
5. `bun run authors:build`
6. `bun run dev` and open `/authors/<id>` for each new author — confirm the paper appears and the
   name renders correctly.

## Workflow B — merge a split identity

Two `authors.yaml` rows are actually the same person.

1. Confirm same-person via `references/openalex-lookups.md` — works-list overlap, ORCID match,
   affiliation continuity, shared co-authors. **Never merge on name similarity alone**; a
   surname + initial match is a candidate, not proof.
2. Pick the canonical id per the Invariants tiebreak (ORCID > more papers > lower id).
3. On the non-canonical row, add `mergedInto: <canonical-id>`. Do not delete the row.
4. `bun run authors:build` — this resolves the alias for every paper's `authorIds`, drops the
   merged row from the emitted `authors` map, and records the mapping in `aliases`.
5. Verify: `/authors/<old-id>` redirects to `/authors/<canonical-id>`, and the canonical page
   lists the union of both identities' papers.
6. Record a dated one-liner in `docs/atlas/roadmap.md` → Decisions log (who was merged, into
   which id, and the evidence kind — ORCID / works overlap / affiliation).

## Workflow C — fix a misattribution

A paper's `authorIds` entry points at the wrong person entirely (not a split — a different
person who happens to share a name or was mis-resolved by title-matching).

1. Confirm via OpenAlex `works/<work-id>` authorships (or the paper's own byline / PDF) that the
   id currently on the paper is wrong and identify the correct id.
2. Edit that paper's `authorIds` entry in `docs/papers/index.yaml` to the correct id. If the
   correct id has no `authors.yaml` row yet, add one from OpenAlex `authors/<id>` (display_name,
   orcid if present).
3. If the wrong id now has zero papers across `docs/papers/index.yaml`, either leave the row
   (harmless dead entry) or delete it — but only if that row was created by this misattribution
   in the first place (i.e., it has no independent provenance).
4. `bun run authors:build`; record the correction in the roadmap Decisions log with the evidence.

## Workflow D — expand an initials-only name

A row like `"R. Tsai"` should carry the person's full name.

1. Fetch `GET /authors/<id>` from OpenAlex; read `display_name`.
2. Set `authors.yaml`'s `name:` field to the full display name.
3. Leave `docs/papers/index.yaml`'s `authors[]` display strings (e.g. `"R. Tsai"`) as-is — those
   are historical citation-style strings, independent of the registry's `name` field, and are not
   position-aligned with `authorIds` (see Invariants).

## Verification checklist

- `bun run authors:build` — rebuilds `public/authors-index.json` / `src/generated/authors-index.ts`
  without errors.
- `bunx vitest run` — `scripts/authors-build.test.ts` and `scripts/papers-backfill-authors.test.ts`
  stay green.
- `bun run build` — type-check + production build.
- Open the affected `/authors/<id>` page(s) in `bun run dev` and confirm papers, name, and (for a
  merge) the redirect render as expected.

## Don'ts

- Never invent an author id. Every id comes from an OpenAlex API response.
- Never merge two identities on name similarity alone — require ORCID, works overlap, or
  affiliation/co-author evidence from `references/openalex-lookups.md`.
- Never hand-edit `public/authors-index.json` or `src/generated/authors-index.ts` — both are
  build outputs of `bun run authors:build`.
- Never run `--write` without first reviewing a `--dry-run` diff.
- Never touch `content/**` — this skill's writes are limited to `docs/papers/authors.yaml` and
  the `authorIds` field in `docs/papers/index.yaml`.
- Never hand-align `authors[]` display strings to `authorIds[]` by position — they use surname
  matching at render time, not array position.

## Worked cases (resolved 2026-09-15)

Each case below was decided from OpenAlex `authors/<id>` evidence (affiliations, topics,
works_count) — the kind of check Workflow B/C requires. Keep them as calibration examples: the
name-similarity heuristic alone would have got two of them wrong.

- **Alexander Kirillov — misattribution, not a split.** `A5008626158` "Alexander M. Kirillov"
  is a crystallographer (Tambov State University, 732 works, X-ray diffraction topics). SAM's
  authorship was re-pointed to `A5101930471` (the vision researcher on DETR/MaskFormer/
  Mask2Former); the crystallographer's row was deleted because only the misattribution had
  created it. Workflow C.
- **Zilong Huang — misattribution, not a split.** `A5101358906` is a microbiology researcher
  (South China Agricultural University, antibiotics topics). `yang2024-depth-anything` was
  re-pointed to `A5099137433` (Advanced Vision topics, the Depth Anything V2 id); the
  microbiologist's row was deleted. Workflow C.
- **Carlo Tomasi — split.** `A5088492440` ("Tomasi", Duke/Stanford, 3 works, no ORCID) is the
  same person as `A5079878449` (Carlo Tomasi, Duke, ORCID). `mergedInto: A5079878449`.
  Workflow B.
- **Michael S. Brown — split.** `A5075135613` and `A5106406020` are both the stitching
  researcher (senior author on `gao2011-dual-homography` and `zaragoza2013-apap`, matching
  vision topics, ~200 works each, different ORCIDs — OpenAlex split records). Canonical
  `A5106406020` (more works); `A5075135613` carries `mergedInto`. Workflow B.
- **Jian Sun — split.** `A5100785015` (ResNet) and `A5101425421` (Faster R-CNN, Microsoft
  affiliation) are the same Microsoft Research Asia author. Canonical `A5101425421` (the
  Microsoft affiliation is the discriminating evidence); `A5100785015` carries `mergedInto`.
  Workflow B.
- **`zhang2000-flexible` — misattribution.** `A5056480447` "Zheng Zhang" (Shanghai University)
  is not Zhengyou Zhang. Re-pointed to `A5113678278` (Microsoft / INRIA); the wrong row was
  deleted (no other paper referenced it). Workflow C.

## Resources

- `docs/papers/authors.yaml` — the identity registry (id, name, optional orcid, optional
  `mergedInto`).
- `docs/papers/index.yaml` — paper entries; `authorIds:` links each paper to registry rows.
- `scripts/authors-build.ts` / `bun run authors:build` — rebuilds the public authors index,
  resolves `mergedInto` aliases, emits `aliases` and `coauthors`.
- `scripts/papers-backfill-authors.ts` — resolves OpenAlex identities for papers lacking
  `authorIds` and merges into the existing `authors.yaml` (existing rows win on name/orcid).
  Supports `--dry-run` / `--write`; `--only <paper-id>` scopes to one paper.
- `scripts/authors-dupes.ts` / `bun run authors:dupes` — prints a markdown table of candidate
  identity splits (same ORCID across ids, same normalised surname + first initial across ids,
  initials-only names), skipping rows already carrying `mergedInto`.
- `src/lib/atlas/authorLinks.ts` — `resolveAuthorIds`, the surname-based alignment between a
  paper's display `authors[]` and its `authorIds[]`; read this before ever touching either array
  by hand.
- `references/openalex-lookups.md` — concrete `curl` recipes for disambiguating an id.
- `docs/atlas/roadmap.md` → Decisions log — record every merge/misattribution fix here, dated.
