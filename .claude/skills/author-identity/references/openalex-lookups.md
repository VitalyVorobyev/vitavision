# OpenAlex lookups for author disambiguation

Concrete `curl` recipes for resolving, merging, and correcting author identities. Mirrors the
auth pattern already used by `scripts/papers-fetch-meta.ts` (`userAgent()` / `withAuth()`): a
polite-pool `mailto` query param plus an optional `api_key` param, both sourced from
`.env.local` (`OPENALEX_EMAIL`, `OPENALEX_API_KEY`). Bun auto-loads `.env.local`, so in a `bun
run` script these come from `process.env`; from a shell, export them first or substitute the
values inline.

```bash
export OPENALEX_EMAIL="$(grep '^OPENALEX_EMAIL=' .env.local | cut -d= -f2)"
export OPENALEX_API_KEY="$(grep '^OPENALEX_API_KEY=' .env.local | cut -d= -f2)"
```

Every recipe below appends `?mailto=$OPENALEX_EMAIL` (polite pool — required etiquette, not
optional) and, if `OPENALEX_API_KEY` is non-empty, `&api_key=$OPENALEX_API_KEY` (premium tier;
omit entirely on the free tier — an empty `api_key=` param is harmless but unnecessary).

## Fetch an author by id

Display name, ORCID, affiliations, total works count — the first stop for confirming or
expanding an identity (Workflow D) and for checking canonical-row eligibility (Workflow B).

```bash
curl -s "https://api.openalex.org/authors/A5101930471?mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
  | jq '{id, display_name, orcid, works_count, last_known_institutions: [.affiliations[].institution.display_name]}'
```

## List an author's works

Titles, years, DOIs — the input to a works-list-overlap check between two candidate ids (does
this person's bibliography look like one continuous career, or two different people?).

```bash
curl -s "https://api.openalex.org/works?filter=author.id:A5101930471&select=id,title,publication_year,doi&per-page=50&mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
  | jq '.results[] | {title, publication_year, doi}'
```

Paginate with `&page=2` etc. if `works_count` (from the author fetch above) exceeds 50.

## Fetch a work's authorships by DOI

Confirms exactly who OpenAlex credits on a specific paper — the ground truth for Workflow C
(misattribution) and for cross-checking Workflow A's backfill output.

```bash
curl -s "https://api.openalex.org/works/doi:10.1109/34.888718?select=authorships&mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
  | jq '.authorships[] | {id: .author.id, name: .author.display_name, orcid: .author.orcid}'
```

(That DOI is Zhang's *A Flexible New Technique for Camera Calibration*, TPAMI 2000 — the
`zhang2000-flexible` misattribution worked case.)

## Search authors by name

Candidate list when starting a lookup from a bare name (e.g. resolving `A5056480447` "Zheng
Zhang" against the intended "Zhengyou Zhang" — search surfaces both as distinct records with
different ids).

```bash
curl -s "https://api.openalex.org/authors?search=Zhengyou%20Zhang&mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
  | jq '.results[] | {id, display_name, orcid, works_count}'
```

Name search is fuzzy and returns near-matches — always cross-check the candidate's works list or
ORCID before treating a search hit as confirmation.

## Intersect two authors' work titles

The core works-list-overlap check for Workflow B (split-identity merge). Two id sets that share
several titles almost certainly belong to the same person; two id sets with zero overlap and
different institutions almost certainly do not.

```bash
comm -12 \
  <(curl -s "https://api.openalex.org/works?filter=author.id:A5079878449&select=title&per-page=200&mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
      | jq -r '.results[].title' | tr 'A-Z' 'a-z' | sort) \
  <(curl -s "https://api.openalex.org/works?filter=author.id:A5088492440&select=title&per-page=200&mailto=$OPENALEX_EMAIL&api_key=$OPENALEX_API_KEY" \
      | jq -r '.results[].title' | tr 'A-Z' 'a-z' | sort)
```

Empty output means no title overlap in the fetched page (raise `per-page`, or fetch a specific
known-shared paper's authorships directly instead, if a candidate pair is expected to share only
one or two papers).

## A note on co-author overlap

There is no single-call "shared co-authors" endpoint; approximate it by fetching each candidate's
authorships-expanded works (add `authorships` to `select` in the works-list query above) and
diffing the set of co-author ids across both candidates' bibliographies. A large shared co-author
set alongside zero direct title overlap (e.g. two people who each published once with the same
lab) is weaker evidence than direct title overlap — weigh it accordingly, and prefer ORCID or a
direct works-list match when either is available.

## Rate-limit etiquette

- Always send `mailto=$OPENALEX_EMAIL` (the polite pool raises the shared rate limit substantially
  over anonymous requests). Never omit it to "keep the command short."
- `api_key` is only relevant on the premium tier; append it when `OPENALEX_API_KEY` is set,
  otherwise omit the parameter entirely (an empty value is accepted but adds nothing).
- Batch `works?filter=author.id:...` queries with `per-page` up to 200 rather than paging one
  result at a time.
- Space out bursts of individual author/work lookups (a few hundred ms between calls) when
  resolving more than a handful of candidates in one sitting, mirroring the `SLEEP_MS` pacing in
  `scripts/papers-backfill-authors.ts`.
