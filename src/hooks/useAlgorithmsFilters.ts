import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../lib/content/schema.ts";
import { domainOrder } from "../components/algorithms/domainLabels.ts";

// ── Public types ────────────────────────────────────────────────────────────

export type AlgorithmsKind = "all" | "algorithm" | "model" | "concept";
export type AlgorithmsView = "grid" | "list" | "map" | "constellation";
export type AlgorithmsSort = "az" | "recent";

/** localStorage key the view selection is persisted to. */
export const ATLAS_VIEW_STORAGE_KEY = "atlas:view";

const VIEW_VALUES: readonly AlgorithmsView[] = ["grid", "list", "map", "constellation"];

function isAlgorithmsView(value: string | null): value is AlgorithmsView {
    return value !== null && (VIEW_VALUES as readonly string[]).includes(value);
}

export interface AlgorithmsFilters {
    kind: AlgorithmsKind;
    categoryId: string;   // "all" | Domain
    tags: string[];
    query: string;
    view: AlgorithmsView;
    sort: AlgorithmsSort;
}

export interface FacetCounts {
    kinds:      Record<AlgorithmsKind, number>;
    categories: Record<string, number>;   // "all" + each domain id
    tags:       Record<string, number>;   // per-tag faceted count
    total:      number;                   // count after ALL filters
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: AlgorithmsFilters = {
    kind:       "all",
    categoryId: "all",
    tags:       [],
    query:      "",
    view:       "grid",
    sort:       "recent",
};

// ── Pure filter helpers ──────────────────────────────────────────────────────

function matchesSearch(
    slug: string,
    title: string,
    summary: string,
    query: string,
    searchMatchedSlugs: Set<string> | null,
): boolean {
    if (!query.trim()) return true;
    // If a search index result set is available, use it for precision.
    if (searchMatchedSlugs !== null) return searchMatchedSlugs.has(slug);
    // Fallback: substring match (used during SSR or before index is ready).
    const q = query.toLowerCase();
    return title.toLowerCase().includes(q) || summary.toLowerCase().includes(q);
}

function matchesTags(itemTags: readonly string[], required: string[]): boolean {
    if (required.length === 0) return true;
    return required.every((t) => itemTags.includes(t));
}

function matchesDomain(domain: string | undefined, categoryId: string): boolean {
    return categoryId === "all" || domain === categoryId;
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
 * Filter algorithms by categoryId, tags, and query (no kind — kind is implicit).
 * Caller must pre-filter out drafts if needed.
 *
 * @param searchMatchedSlugs - Set of slugs matched by MiniSearch, or null if
 *   the query is empty / index not yet built (fall-through to substring match).
 */
export function filterAlgorithms(
    items: AlgorithmIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): AlgorithmIndexEntry[] {
    const { categoryId, tags, query, sort } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter models by categoryId, tags, and query.
 * Caller must pre-filter out drafts if needed.
 */
export function filterModels(
    items: ModelIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ModelIndexEntry[] {
    const { categoryId, tags, query, sort } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter concepts by categoryId, tags, and query.
 * Caller must pre-filter out drafts if needed.
 */
export function filterConcepts(
    items: ConceptIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ConceptIndexEntry[] {
    const { categoryId, tags, query, sort } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    });
    return applySort(result, sort);
}

// ── Faceted count helpers ────────────────────────────────────────────────────

function countAlgorithmsWith(
    items: AlgorithmIndexEntry[],
    partial: { categoryId?: string; tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { categoryId = "all", tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

function countModelsWith(
    items: ModelIndexEntry[],
    partial: { categoryId?: string; tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { categoryId = "all", tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

function countConceptsWith(
    items: ConceptIndexEntry[],
    partial: { categoryId?: string; tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { categoryId = "all", tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesDomain(fm.domain, categoryId) &&
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

/**
 * Compute true faceted counts for the sidebar / filter sheet.
 *
 * - `kinds`: ignores `categoryId`; applies `tags + query` only.
 * - `categories`: ignores `categoryId`; applies `tags + query` for the current kind.
 *   When `kind === "all"`, categories are hidden (disjoint enums); returns only
 *   an "all" entry with the total count.
 * - `tags[tag]`: count if this tag were toggled on, for the current kind+category.
 * - `total`: all filters applied.
 */
export function computeFacets(
    algorithms: AlgorithmIndexEntry[],
    models: ModelIndexEntry[],
    concepts: ConceptIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): FacetCounts {
    const { kind, categoryId, tags, query } = filters;
    const sqParams = { tags, query, searchMatchedSlugs };

    // ── Kind counts (ignore categoryId) ─────────────────────────────────────
    const kindsAll       = countAlgorithmsWith(algorithms, sqParams)
                         + countModelsWith(models, sqParams)
                         + countConceptsWith(concepts, sqParams);
    const kindsAlgorithm = countAlgorithmsWith(algorithms, sqParams);
    const kindsModel     = countModelsWith(models, sqParams);
    const kindsConcept   = countConceptsWith(concepts, sqParams);

    // ── Category counts (ignore categoryId, current kind only) ───────────────
    const categories: Record<string, number> = {};

    if (kind === "all") {
        // Domain sidebar is hidden in "all" mode — just expose the total.
        categories["all"] = kindsAll;
    } else if (kind === "algorithm") {
        categories["all"] = countAlgorithmsWith(algorithms, sqParams);
        // Use domainOrder for stable presentation; only include domains present in data.
        for (const dom of domainOrder) {
            const count = countAlgorithmsWith(algorithms, { categoryId: dom, ...sqParams });
            if (count > 0) categories[dom] = count;
        }
    } else if (kind === "model") {
        categories["all"] = countModelsWith(models, sqParams);
        for (const dom of domainOrder) {
            const count = countModelsWith(models, { categoryId: dom, ...sqParams });
            if (count > 0) categories[dom] = count;
        }
    } else {
        // concept
        categories["all"] = countConceptsWith(concepts, sqParams);
        for (const dom of domainOrder) {
            const count = countConceptsWith(concepts, { categoryId: dom, ...sqParams });
            if (count > 0) categories[dom] = count;
        }
    }

    // ── Tag counts ──────────────────────────────────────────────────────────
    const tagCounts: Record<string, number> = {};

    function addAlgorithmTagCounts() {
        const candidateItems = algorithms.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesDomain(fm.domain, categoryId) &&
                matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
            );
        });
        const allTagsInScope = new Set(candidateItems.flatMap((e) => e.frontmatter.tags));
        for (const tag of allTagsInScope) {
            const effectiveTags = [...tags.filter((t) => t !== tag), tag];
            tagCounts[tag] = (tagCounts[tag] ?? 0) + countAlgorithmsWith(algorithms, { categoryId, tags: effectiveTags, query, searchMatchedSlugs });
        }
    }

    function addModelTagCounts() {
        const candidateItems = models.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesDomain(fm.domain, categoryId) &&
                matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
            );
        });
        const allTagsInScope = new Set(candidateItems.flatMap((e) => e.frontmatter.tags));
        for (const tag of allTagsInScope) {
            const effectiveTags = [...tags.filter((t) => t !== tag), tag];
            tagCounts[tag] = (tagCounts[tag] ?? 0) + countModelsWith(models, { categoryId, tags: effectiveTags, query, searchMatchedSlugs });
        }
    }

    function addConceptTagCounts() {
        const candidateItems = concepts.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesDomain(fm.domain, categoryId) &&
                matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
            );
        });
        const allTagsInScope = new Set(candidateItems.flatMap((e) => e.frontmatter.tags));
        for (const tag of allTagsInScope) {
            const effectiveTags = [...tags.filter((t) => t !== tag), tag];
            tagCounts[tag] = (tagCounts[tag] ?? 0) + countConceptsWith(concepts, { categoryId, tags: effectiveTags, query, searchMatchedSlugs });
        }
    }

    if (kind === "algorithm" || kind === "all") addAlgorithmTagCounts();
    if (kind === "model" || kind === "all") addModelTagCounts();
    if (kind === "concept" || kind === "all") addConceptTagCounts();

    // ── Total (all filters) ──────────────────────────────────────────────────
    const total =
        kind === "all"
            ? countAlgorithmsWith(algorithms, { categoryId, ...sqParams })
              + countModelsWith(models, { categoryId, ...sqParams })
              + countConceptsWith(concepts, { categoryId, ...sqParams })
            : kind === "algorithm"
                ? countAlgorithmsWith(algorithms, { categoryId, ...sqParams })
                : kind === "model"
                    ? countModelsWith(models, { categoryId, ...sqParams })
                    : countConceptsWith(concepts, { categoryId, ...sqParams });

    return {
        kinds: { all: kindsAll, algorithm: kindsAlgorithm, model: kindsModel, concept: kindsConcept },
        categories,
        tags: tagCounts,
        total,
    };
}

// ── URL serialization helpers ────────────────────────────────────────────────

function parseFiltersFromParams(params: URLSearchParams): AlgorithmsFilters {
    const rawKind = params.get("kind");
    // Backwards-compat: "classical" → "algorithm", "models" (plural) → "model"
    const kind: AlgorithmsKind =
        rawKind === "model" || rawKind === "models" ? "model" :
        rawKind === "concept" ? "concept" :
        rawKind === "algorithm" || rawKind === "classical" ? "algorithm" :
        "all";
    const categoryId = params.get("cat") ?? "all";
    const tagsRaw = params.get("tags");
    const tags = tagsRaw ? tagsRaw.split(",").filter(Boolean) : [];
    const query = params.get("q") ?? "";
    // URL takes precedence over storage so /atlas?view=map works as a deep link.
    const rawView = params.get("view");
    const urlView = isAlgorithmsView(rawView) ? rawView : null;
    const storedView = readStoredView();
    const view: AlgorithmsView = urlView ?? storedView ?? DEFAULTS.view;
    const sort: AlgorithmsSort = params.get("sort") === "az" ? "az" : "recent";
    return { kind, categoryId, tags, query, view, sort };
}

function readStoredView(): AlgorithmsView | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ATLAS_VIEW_STORAGE_KEY);
        return isAlgorithmsView(raw) ? raw : null;
    } catch {
        return null;
    }
}

function writeStoredView(view: AlgorithmsView): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(ATLAS_VIEW_STORAGE_KEY, view);
    } catch {
        // quota / private mode — silently ignore
    }
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
