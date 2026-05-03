import MiniSearch from "minisearch";
import { searchRecords, type SearchRecord } from "../../generated/content-search.ts";

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
        storeFields: ["slug", "type"],
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
 * Search all content and return the set of matching slugs.
 *
 * Returns `null` when the query is empty — caller should fall through to
 * the non-search filter path (show everything).
 *
 * Returns an empty `Set` when the query is non-empty but no results match,
 * so the caller can distinguish "no filter" from "filter returned nothing."
 */
export function searchSlugs(query: string): Set<string> | null {
    if (!query.trim()) return null;
    const inst = getSearchInstance();
    if (!inst) return null;
    const results = inst.search(query);
    return new Set(results.map((r) => r.id as string));
}
