import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    type AlgorithmsKind,
    type AlgorithmsView,
    type AlgorithmsSort,
    type AlgorithmsFilters,
    type FacetCounts,
    ATLAS_VIEW_STORAGE_KEY,
    DEFAULTS,
    filterAlgorithms,
    filterModels,
    filterConcepts,
    computeFacets,
    parseFiltersFromParams,
    buildParams,
    writeStoredView,
} from "../lib/atlas/atlasFilters.ts";

// Re-exported for existing importers (AlgorithmIndex.tsx, AlgorithmsSidebar,
// AlgorithmsFilterSheet, AlgorithmsViewToggle) — the pure filter/URL logic
// itself lives in ../lib/atlas/atlasFilters.ts.
export type { AlgorithmsKind, AlgorithmsView, AlgorithmsSort, AlgorithmsFilters, FacetCounts };
export { ATLAS_VIEW_STORAGE_KEY, filterAlgorithms, filterModels, filterConcepts, computeFacets };

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAlgorithmsFiltersReturn {
    filters: AlgorithmsFilters;
    setKind:       (kind: AlgorithmsKind) => void;
    toggleTag:     (tag: string) => void;
    setTags:       (tags: string[]) => void;
    setQuery:      (q: string) => void;
    setView:       (view: AlgorithmsView) => void;
    setSort:       (sort: AlgorithmsSort) => void;
    setProblem:    (problem: string) => void;
    /** Resets tags, query, sort, problem — keeps kind and view. */
    reset:         () => void;
}

export default function useAlgorithmsFilters(): UseAlgorithmsFiltersReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = parseFiltersFromParams(searchParams);

    const update = useCallback(
        (next: AlgorithmsFilters) => {
            setSearchParams(buildParams(next), { replace: true });
        },
        [setSearchParams],
    );

    const setKind = useCallback(
        (kind: AlgorithmsKind) => {
            // When kind flips, reset problem (problem is kind-scoped).
            update({ ...filters, kind, problem: "all" });
        },
        [filters, update],
    );

    const toggleTag = useCallback(
        (tag: string) => {
            const next = filters.tags.includes(tag)
                ? filters.tags.filter((t) => t !== tag)
                : [...filters.tags, tag];
            update({ ...filters, tags: next });
        },
        [filters, update],
    );

    const setTags = useCallback(
        (tags: string[]) => update({ ...filters, tags }),
        [filters, update],
    );

    const setQuery = useCallback(
        (q: string) => update({ ...filters, query: q }),
        [filters, update],
    );

    const setView = useCallback(
        (view: AlgorithmsView) => {
            writeStoredView(view);
            update({ ...filters, view });
        },
        [filters, update],
    );

    const setSort = useCallback(
        (sort: AlgorithmsSort) => update({ ...filters, sort }),
        [filters, update],
    );

    const setProblem = useCallback(
        (problem: string) => update({ ...filters, problem }),
        [filters, update],
    );

    const reset = useCallback(
        () =>
            update({
                ...DEFAULTS,
                kind: filters.kind,
                view: filters.view,
            }),
        [filters, update],
    );

    return {
        filters,
        setKind,
        toggleTag,
        setTags,
        setQuery,
        setView,
        setSort,
        setProblem,
        reset,
    };
}
