import MiniSearch from "minisearch";
import { searchRecords, type SearchRecord } from "../../generated/content-search.ts";

/** Record types that are actual Atlas catalog pages (`filterEntries` in
 *  atlasFilters.ts matches against these slugs). Author/paper records share
 *  the same MiniSearch index but must never leak into the catalog filter. */
const ATLAS_PAGE_TYPES: ReadonlySet<SearchRecord["type"]> = new Set(["algorithm", "model", "concept", "narrative"]);

export type SearchEntityType = "author" | "paper";
const ENTITY_TYPES: ReadonlySet<SearchRecord["type"]> = new Set(["author", "paper"]);

/** Strips diacritics after lowercasing, so "jegou" matches "Jégou" — mirrors
 *  `normalizeSearchText` in peopleDirectory.ts/papersDirectory.ts, applied
 *  here at the MiniSearch term-processing level (indexing AND querying, since
 *  `processTerm` is shared between both by default) rather than per-caller. */
function foldTerm(term: string): string {
    return term
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

let _instance: MiniSearch<SearchRecord> | null = null;

/**
 * Returns (and lazily builds) the MiniSearch index over all content records.
 *
 * Guard: only runs client-side. During SSR prerender `typeof window` is
 * "undefined", so we never build the index and return null.
 */
function getSearchInstance(): MiniSearch<SearchRecord> | null {
    if (typeof window === "undefined") return null;
    if (_instance) return _instance;
    _instance = new MiniSearch<SearchRecord>({
        idField: "slug",
        fields: ["title", "summary", "tags", "headings", "category", "authors", "venue"],
        storeFields: ["slug", "type", "path", "title", "summary", "authors", "venue"],
        processTerm: foldTerm,
        searchOptions: {
            // Tag/venue/authors boosted above body so a query like "Zaragoza"
            // or "CVPR" lands on the page that cites them, not on every page
            // that mentions the word in passing.
            boost: { title: 3, summary: 1.5, tags: 2, authors: 2.5, venue: 2 },
            prefix: true,
            fuzzy: 0.2,
        },
    });
    _instance.addAll(searchRecords);
    return _instance;
}

/**
 * Search all content and return the set of matching Atlas-catalog slugs.
 *
 * Returns `null` when the query is empty — caller should fall through to
 * the non-search filter path (show everything).
 *
 * Returns an empty `Set` when the query is non-empty but no results match,
 * so the caller can distinguish "no filter" from "filter returned nothing."
 *
 * Author (`/authors/<id>`) and paper (`paper:<id>` slug, `/papers/<id>`)
 * records live in the same MiniSearch index but are never Atlas catalog
 * pages, so a hit on either is filtered out here — the catalog's `slug` set
 * must contain only algorithm/model/concept/narrative slugs. Use
 * `searchEntities` to search those two record types instead.
 */
export function searchSlugs(query: string): Set<string> | null {
    if (!query.trim()) return null;
    const inst = getSearchInstance();
    if (!inst) return null;
    const results = inst.search(query);
    return new Set(
        results.filter((r) => ATLAS_PAGE_TYPES.has(r.type as SearchRecord["type"])).map((r) => r.id as string),
    );
}

/** One ranked person/paper search hit, enough to render a compact match card
 *  without a further lookup (title/summary/authors/venue are stored fields —
 *  see `storeFields` above). */
export interface SearchEntity {
    type: SearchEntityType;
    path: string;
    title: string;
    summary: string;
    authors?: string[];
    venue?: string;
}

export interface SearchEntitiesOptions {
    /** Restrict results to these record types. Defaults to both. */
    types?: SearchEntityType[];
    /** Cap the number of returned results (after ranking). */
    limit?: number;
}

/**
 * Search the author/paper records and return ranked entities — for the
 * "People & papers" catalog matches block and any other UI that needs a
 * person/paper lookup by free-text query. Never returns algorithm/model/
 * concept/narrative hits; use `searchSlugs` for those.
 *
 * Returns `[]` for an empty query or before the index is built (SSR).
 */
export function searchEntities(query: string, opts: SearchEntitiesOptions = {}): SearchEntity[] {
    if (!query.trim()) return [];
    const inst = getSearchInstance();
    if (!inst) return [];
    const wantedTypes = new Set<string>(opts.types && opts.types.length > 0 ? opts.types : ["author", "paper"]);
    const results = inst
        .search(query)
        .filter((r) => ENTITY_TYPES.has(r.type as SearchRecord["type"]) && wantedTypes.has(r.type as string));
    const limited = opts.limit !== undefined ? results.slice(0, opts.limit) : results;
    return limited.map((r) => ({
        type: r.type as SearchEntityType,
        path: r.path as string,
        title: r.title as string,
        summary: r.summary as string,
        ...(Array.isArray(r.authors) && r.authors.length > 0 ? { authors: r.authors as string[] } : {}),
        ...(r.venue ? { venue: r.venue as string } : {}),
    }));
}
