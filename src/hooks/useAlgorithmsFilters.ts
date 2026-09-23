import { useCallback, useMemo, useState } from "react";
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

    // Bumped by setView: when the URL carries no `view`, the view comes from
    // localStorage, and switching back to the default view writes storage
    // without changing the URL — the memo must still recompute.
    const [storedViewNonce, setStoredViewNonce] = useState(0);

    // Memoised so `filters` (and every callback / downstream memo depending on
    // it) keeps its identity until the URL or the stored view actually changes.
    const filters = useMemo(
        () => parseFiltersFromParams(searchParams),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- storedViewNonce is a recompute trigger
        [searchParams, storedViewNonce],
    );

    const update = useCallback(
        (next: AlgorithmsFilters) => {
            setSearchParams((prev) => buildParams(next, prev), { replace: true });
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
            setStoredViewNonce((n) => n + 1);
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
