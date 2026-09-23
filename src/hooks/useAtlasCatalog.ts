import { useMemo } from "react";
import { algorithmPages, modelPages, conceptPages } from "../generated/content-index.ts";
import {
    filterAlgorithms,
    filterModels,
    filterConcepts,
    computeFacets,
    type AlgorithmsFilters,
    type FacetCounts,
} from "../lib/atlas/atlasFilters.ts";
import { computeUnifiedGroups, type CatalogGroup, type UnifiedEntry } from "../lib/atlas/unifiedGroups.ts";
import { searchSlugs } from "../lib/atlas/searchClient.ts";
import { selectRecentlyAdded } from "../lib/atlas/recency.ts";

export interface UseAtlasCatalogReturn {
    facets: FacetCounts;
    unifiedGroups: CatalogGroup[];
    recentEntries: UnifiedEntry[];
    /** True when no filter is active (kind=all, empty query/tags/problem) and there's something recent to show. */
    showRecentlyAdded: boolean;
}

/**
 * Derived catalog data for the Atlas grid/list views: draft-gated visible
 * entries, MiniSearch-matched slugs, faceted counts, filtered+grouped
 * results, and the "recently added" strip. Pure derivation over
 * `algorithmPages`/`modelPages`/`conceptPages` (generated content index) plus
 * the current filter state — no view-specific (desktop/mobile) branching.
 */
export default function useAtlasCatalog(filters: AlgorithmsFilters, isAdmin: boolean): UseAtlasCatalogReturn {
    // ── MiniSearch: derive slug set from query (client-side only) ───────────
    const searchMatchedSlugs = useMemo<Set<string> | null>(
        () => searchSlugs(filters.query),
        [filters.query],
    );

    // ── Visible items (draft-gated) ──────────────────────────────────────────
    const visibleAlgorithms = useMemo(
        () => algorithmPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleModels = useMemo(
        () => modelPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleConcepts = useMemo(
        () => conceptPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const recentEntries = useMemo<UnifiedEntry[]>(
        () =>
            selectRecentlyAdded<UnifiedEntry>([
                ...visibleAlgorithms.map((e) => ({ kind: "algorithm" as const, slug: e.slug, frontmatter: e.frontmatter })),
                ...visibleModels.map((e) => ({ kind: "model" as const, slug: e.slug, frontmatter: e.frontmatter })),
                ...visibleConcepts.map((e) => ({ kind: "concept" as const, slug: e.slug, frontmatter: e.frontmatter })),
            ]),
        [visibleAlgorithms, visibleModels, visibleConcepts],
    );

    const showRecentlyAdded =
        filters.kind === "all" &&
        filters.query.trim() === "" &&
        filters.tags.length === 0 &&
        filters.problem === "all" &&
        recentEntries.length > 0;

    const facets = useMemo(
        () => computeFacets(visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs),
        [visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs],
    );

    const filteredAlgorithms = useMemo(
        () => filterAlgorithms(visibleAlgorithms, filters, searchMatchedSlugs),
        [visibleAlgorithms, filters, searchMatchedSlugs],
    );
    const filteredModels = useMemo(
        () => filterModels(visibleModels, filters, searchMatchedSlugs),
        [visibleModels, filters, searchMatchedSlugs],
    );
    const filteredConcepts = useMemo(
        () => filterConcepts(visibleConcepts, filters, searchMatchedSlugs),
        [visibleConcepts, filters, searchMatchedSlugs],
    );

    // ── Unified grouped results ──────────────────────────────────────────────
    const unifiedGroups = useMemo(
        () => computeUnifiedGroups(filteredAlgorithms, filteredModels, filteredConcepts, filters.kind),
        [filteredAlgorithms, filteredModels, filteredConcepts, filters.kind],
    );

    return { facets, unifiedGroups, recentEntries, showRecentlyAdded };
}
