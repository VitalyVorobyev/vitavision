import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
} from "../lib/content/schema.ts";

// ── Public types ────────────────────────────────────────────────────────────

export type AlgorithmsKind = "classical" | "models";
export type AlgorithmsView = "grid" | "list";
export type AlgorithmsSort = "az" | "recent";

export interface AlgorithmsFilters {
    kind: AlgorithmsKind;
    categoryId: string;   // "all" | AlgorithmCategory | ModelCategory
    tags: string[];
    query: string;
    view: AlgorithmsView;
    sort: AlgorithmsSort;
}

export interface FacetCounts {
    kinds:      Record<AlgorithmsKind, number>;
    categories: Record<string, number>;   // "all" + each category id
    tags:       Record<string, number>;   // per-tag faceted count
    total:      number;                   // count after ALL filters
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: AlgorithmsFilters = {
    kind:       "classical",
    categoryId: "all",
    tags:       [],
    query:      "",
    view:       "grid",
    sort:       "recent",
};

// ── Pure filter helpers ──────────────────────────────────────────────────────

function matchesQuery(
    title: string,
    summary: string,
    query: string,
): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return title.toLowerCase().includes(q) || summary.toLowerCase().includes(q);
}

function matchesTags(itemTags: readonly string[], required: string[]): boolean {
    if (required.length === 0) return true;
    return required.every((t) => itemTags.includes(t));
}

function matchesCategory(category: string, categoryId: string): boolean {
    return categoryId === "all" || category === categoryId;
}

/** Sort a mutable copy of an array. */
function applySort<T extends { frontmatter: { title: string; date: string } }>(
    items: T[],
    sort: AlgorithmsSort,
): T[] {
    return [...items].sort((a, b) => {
        if (sort === "az") {
            return a.frontmatter.title.localeCompare(b.frontmatter.title, undefined, { sensitivity: "base" });
        }
        // "recent" — newest first, tie-break by title asc
        const da = new Date(a.frontmatter.date).getTime();
        const db = new Date(b.frontmatter.date).getTime();
        if (db !== da) return db - da;
        return a.frontmatter.title.localeCompare(b.frontmatter.title, undefined, { sensitivity: "base" });
    });
}

/**
 * Filter algorithms by categoryId, tags and query (no kind — kind is implicit).
 * Caller must pre-filter out drafts if needed.
 */
export function filterAlgorithms(
    items: AlgorithmIndexEntry[],
    filters: AlgorithmsFilters,
): AlgorithmIndexEntry[] {
    const { categoryId, tags, query, sort } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesCategory(fm.category, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesQuery(fm.title, fm.summary, query)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter models by categoryId, tags and query.
 * Caller must pre-filter out drafts if needed.
 */
export function filterModels(
    items: ModelIndexEntry[],
    filters: AlgorithmsFilters,
): ModelIndexEntry[] {
    const { categoryId, tags, query, sort } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesCategory(fm.category, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesQuery(fm.title, fm.summary, query)
        );
    });
    return applySort(result, sort);
}

// ── Faceted count helpers ────────────────────────────────────────────────────

function countAlgorithmsWith(
    items: AlgorithmIndexEntry[],
    partial: { categoryId?: string; tags?: string[]; query?: string },
): number {
    const { categoryId = "all", tags = [], query = "" } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesCategory(fm.category, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesQuery(fm.title, fm.summary, query)
        );
    }).length;
}

function countModelsWith(
    items: ModelIndexEntry[],
    partial: { categoryId?: string; tags?: string[]; query?: string },
): number {
    const { categoryId = "all", tags = [], query = "" } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesCategory(fm.category, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesQuery(fm.title, fm.summary, query)
        );
    }).length;
}

/**
 * Compute true faceted counts for the sidebar / filter sheet.
 *
 * - `kinds`: ignores `categoryId` (it's kind-scoped); applies `tags + query` only.
 * - `categories`: ignores `categoryId`; applies `tags + query` for the current kind.
 * - `tags[tag]`: applies `kind + categoryId + query + (selectedTags ∪ {tag} \ {tag})`
 *   i.e. how many items match if this specific tag is toggled on (or stays on).
 * - `total`: all filters applied.
 */
export function computeFacets(
    algorithms: AlgorithmIndexEntry[],
    models: ModelIndexEntry[],
    filters: AlgorithmsFilters,
): FacetCounts {
    const { kind, categoryId, tags, query } = filters;

    // ── Kind counts (ignore categoryId) ─────────────────────────────────────
    const kindsClassical = countAlgorithmsWith(algorithms, { tags, query });
    const kindsModels    = countModelsWith(models,         { tags, query });

    // ── Category counts (ignore categoryId, current kind only) ───────────────
    const categories: Record<string, number> = {};
    if (kind === "classical") {
        // "all" for classical
        categories["all"] = countAlgorithmsWith(algorithms, { tags, query });
        // per-category
        const catSet = new Set(algorithms.map((e) => e.frontmatter.category));
        for (const cat of catSet) {
            categories[cat] = countAlgorithmsWith(algorithms, { categoryId: cat, tags, query });
        }
    } else {
        categories["all"] = countModelsWith(models, { tags, query });
        const catSet = new Set(models.map((e) => e.frontmatter.category));
        for (const cat of catSet) {
            categories[cat] = countModelsWith(models, { categoryId: cat, tags, query });
        }
    }

    // ── Tag counts (for each tag: count with that tag + other selected tags) ──
    // Collect all tags present in the currently-filtered kind+categoryId+query set
    const tagCounts: Record<string, number> = {};

    if (kind === "classical") {
        // Collect candidate tags from items matching categoryId + query (ignoring tags)
        const candidateItems = algorithms.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesCategory(fm.category, categoryId) &&
                matchesQuery(fm.title, fm.summary, query)
            );
        });
        const allTagsInScope = new Set(candidateItems.flatMap((e) => e.frontmatter.tags));
        for (const tag of allTagsInScope) {
            // tags-without-this ∪ {tag}
            const effectiveTags = [...tags.filter((t) => t !== tag), tag];
            tagCounts[tag] = countAlgorithmsWith(algorithms, {
                categoryId,
                tags: effectiveTags,
                query,
            });
        }
    } else {
        const candidateItems = models.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesCategory(fm.category, categoryId) &&
                matchesQuery(fm.title, fm.summary, query)
            );
        });
        const allTagsInScope = new Set(candidateItems.flatMap((e) => e.frontmatter.tags));
        for (const tag of allTagsInScope) {
            const effectiveTags = [...tags.filter((t) => t !== tag), tag];
            tagCounts[tag] = countModelsWith(models, {
                categoryId,
                tags: effectiveTags,
                query,
            });
        }
    }

    // ── Total (all filters) ──────────────────────────────────────────────────
    const total =
        kind === "classical"
            ? countAlgorithmsWith(algorithms, { categoryId, tags, query })
            : countModelsWith(models, { categoryId, tags, query });

    return {
        kinds:      { classical: kindsClassical, models: kindsModels },
        categories,
        tags:       tagCounts,
        total,
    };
}

// ── URL serialization helpers ────────────────────────────────────────────────

function parseFiltersFromParams(params: URLSearchParams): AlgorithmsFilters {
    const kind = params.get("kind") === "models" ? "models" : "classical";
    const categoryId = params.get("cat") ?? "all";
    const tagsRaw = params.get("tags");
    const tags = tagsRaw ? tagsRaw.split(",").filter(Boolean) : [];
    const query = params.get("q") ?? "";
    const view: AlgorithmsView = params.get("view") === "list" ? "list" : "grid";
    const sort: AlgorithmsSort = params.get("sort") === "az" ? "az" : "recent";
    return { kind, categoryId, tags, query, view, sort };
}

function buildParams(filters: AlgorithmsFilters): URLSearchParams {
    const p = new URLSearchParams();
    if (filters.kind    !== DEFAULTS.kind)       p.set("kind",  filters.kind);
    if (filters.categoryId !== DEFAULTS.categoryId) p.set("cat",  filters.categoryId);
    if (filters.tags.length > 0)                 p.set("tags", filters.tags.join(","));
    if (filters.query   !== DEFAULTS.query)      p.set("q",    filters.query);
    if (filters.view    !== DEFAULTS.view)        p.set("view", filters.view);
    if (filters.sort    !== DEFAULTS.sort)        p.set("sort", filters.sort);
    return p;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAlgorithmsFiltersReturn {
    filters: AlgorithmsFilters;
    setKind:       (kind: AlgorithmsKind) => void;
    setCategoryId: (id: string) => void;
    toggleTag:     (tag: string) => void;
    setTags:       (tags: string[]) => void;
    setQuery:      (q: string) => void;
    setView:       (view: AlgorithmsView) => void;
    setSort:       (sort: AlgorithmsSort) => void;
    /** Resets categoryId, tags, query, sort — keeps kind and view. */
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
            // When kind flips, reset categoryId (it's kind-scoped).
            update({ ...filters, kind, categoryId: "all" });
        },
        [filters, update],
    );

    const setCategoryId = useCallback(
        (id: string) => update({ ...filters, categoryId: id }),
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
        (view: AlgorithmsView) => update({ ...filters, view }),
        [filters, update],
    );

    const setSort = useCallback(
        (sort: AlgorithmsSort) => update({ ...filters, sort }),
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
        setCategoryId,
        toggleTag,
        setTags,
        setQuery,
        setView,
        setSort,
        reset,
    };
}
