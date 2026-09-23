/**
 * Small text-normalization helpers shared across build/content scripts.
 *
 * Only behaviourally-identical duplicates were unified. Two normalizers
 * named `normalizeDoi*` existed under the same name in different files with
 * different behaviour (one strips trailing prose punctuation, the other
 * strips a `doi.org` URL prefix) — kept here as two distinctly-named
 * functions rather than merged, per the "never guess" policy: merging them
 * would change observable behaviour at one of the two call sites.
 */

/** Strip common trailing punctuation picked up when a URL/id is embedded in prose. */
export function stripTrailingPunctuation(s: string): string {
    return s.replace(/[)\]"'>,.;:]+$/g, "");
}

/** Normalize an arXiv id: drop "arxiv:" prefix, ".pdf" suffix, and version suffix (v\d+).
 *  Used by validate-content.ts's prose-reference scanner. */
export function normalizeArxivId(id: string): string {
    return stripTrailingPunctuation(id.trim())
        .replace(/^arxiv:/i, "")
        .replace(/\.pdf$/i, "")
        .replace(/v\d+$/i, "")
        .toLowerCase();
}

/** Normalize a DOI found in prose (link or bare text): strip trailing
 *  punctuation and lowercase. Used by validate-content.ts's prose-reference
 *  scanner. Distinct from `normalizeDoiUrl` — see file header. */
export function normalizeDoiText(doi: string): string {
    return stripTrailingPunctuation(doi.trim()).toLowerCase();
}

/** Normalize a DOI that may carry a `https://doi.org/` URL prefix (as returned
 *  by OpenAlex, or hand-entered in docs/papers/index.yaml): strip that prefix
 *  and lowercase. Used by papers-backfill-authors.ts for DOI-based matching.
 *  Distinct from `normalizeDoiText` — see file header. */
export function normalizeDoiUrl(doi: string): string {
    return doi.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase();
}

/** Normalize a paper title for loose equality comparisons: lowercase and
 *  strip everything but a-z/0-9. Identical implementation was duplicated in
 *  papers-fetch-meta.ts and papers-backfill-authors.ts. */
export function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Strip combining diacritical marks (NFD-decompose, drop the combining-mark
 *  range). Used by authors-dupes.ts to compare names ignoring accents. */
export function deaccent(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
