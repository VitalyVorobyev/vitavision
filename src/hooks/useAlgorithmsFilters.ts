import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../lib/content/schema.ts";
import { taskOrder } from "../lib/content/taskLabels.ts";

// ── Public types ────────────────────────────────────────────────────────────

export type AlgorithmsKind = "all" | "algorithm" | "model" | "concept";
export type AlgorithmsView = "grid" | "list" | "graph";
export type AlgorithmsSort = "az" | "recent";

/** localStorage key the view selection is persisted to. */
export const ATLAS_VIEW_STORAGE_KEY = "atlas:view";

const VIEW_VALUES: readonly AlgorithmsView[] = ["grid", "list", "graph"];

function isAlgorithmsView(value: string | null): value is AlgorithmsView {
    return value !== null && (VIEW_VALUES as readonly string[]).includes(value);
}

export interface AlgorithmsFilters {
    kind: AlgorithmsKind;
    tags: string[];
    query: string;
    view: AlgorithmsView;
    sort: AlgorithmsSort;
    problem: string;      // "all" | Task slug
}

export interface FacetCounts {
    kinds:      Record<AlgorithmsKind, number>;
    problems:   Record<string, number>;   // per-task faceted count
    total:      number;                   // count after ALL filters
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: AlgorithmsFilters = {
    kind:       "all",
    tags:       [],
    query:      "",
    view:       "grid",
    sort:       "recent",
    problem:    "all",
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

function matchesProblem(tasks: readonly string[] | undefined, problem: string): boolean {
    if (problem === "all") return true;
    return tasks?.includes(problem) ?? false;
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
 * Filter algorithms by tags and query (no kind — kind is implicit).
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
    const { tags, query, sort, problem } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs) &&
            matchesProblem(fm.tasks, problem)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter models by tags and query.
 * Caller must pre-filter out drafts if needed.
 */
export function filterModels(
    items: ModelIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ModelIndexEntry[] {
    const { tags, query, sort, problem } = filters;
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs) &&
            matchesProblem(fm.tasks, problem)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter concepts by tags and query.
 * Caller must pre-filter out drafts if needed.
 */
export function filterConcepts(
    items: ConceptIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ConceptIndexEntry[] {
    const { tags, query, sort, problem } = filters;
    // Concepts have no `tasks` field; a specific problem filter excludes all concepts.
    if (problem !== "all") return [];
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    });
    return applySort(result, sort);
}

// ── Faceted count helpers ────────────────────────────────────────────────────

function countAlgorithmsWith(
    items: AlgorithmIndexEntry[],
    partial: { tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

function countModelsWith(
    items: ModelIndexEntry[],
    partial: { tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

function countConceptsWith(
    items: ConceptIndexEntry[],
    partial: { tags?: string[]; query?: string; searchMatchedSlugs?: Set<string> | null },
): number {
    const { tags = [], query = "", searchMatchedSlugs = null } = partial;
    return items.filter((e) => {
        const fm = e.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
        );
    }).length;
}

/**
 * Compute true faceted counts for the sidebar / filter sheet.
 *
 * - `kinds`: applies `tags + query` only.
 * - `problems`: counts reflect kind/tag/search filters but ignore the active problem.
 * - `total`: all filters applied.
 */
export function computeFacets(
    algorithms: AlgorithmIndexEntry[],
    models: ModelIndexEntry[],
    concepts: ConceptIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): FacetCounts {
    const { kind, tags, query } = filters;
    const sqParams = { tags, query, searchMatchedSlugs };

    // ── Kind counts (apply tags + query only) ────────────────────────────────
    const kindsAll       = countAlgorithmsWith(algorithms, sqParams)
                         + countModelsWith(models, sqParams)
                         + countConceptsWith(concepts, sqParams);
    const kindsAlgorithm = countAlgorithmsWith(algorithms, sqParams);
    const kindsModel     = countModelsWith(models, sqParams);
    const kindsConcept   = countConceptsWith(concepts, sqParams);

    // ── Problem counts ───────────────────────────────────────────────────────
    // Counts reflect kind/tag/search filters but ignore the active problem.
    const problemCounts: Record<string, number> = {};

    function addAlgorithmProblemCounts() {
        const candidateItems = algorithms.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesTags(fm.tags, tags) &&
                matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
            );
        });
        for (const task of taskOrder) {
            const n = candidateItems.filter((e) => e.frontmatter.tasks?.includes(task)).length;
            if (n > 0) problemCounts[task] = (problemCounts[task] ?? 0) + n;
        }
    }

    function addModelProblemCounts() {
        const candidateItems = models.filter((e) => {
            const fm = e.frontmatter;
            return (
                matchesTags(fm.tags, tags) &&
                matchesSearch(e.slug, fm.title, fm.summary, query, searchMatchedSlugs)
            );
        });
        for (const task of taskOrder) {
            const n = candidateItems.filter((e) => e.frontmatter.tasks?.includes(task)).length;
            if (n > 0) problemCounts[task] = (problemCounts[task] ?? 0) + n;
        }
    }

    if (kind === "algorithm" || kind === "all") addAlgorithmProblemCounts();
    if (kind === "model" || kind === "all") addModelProblemCounts();
    // Concepts have no tasks, so they contribute nothing to problem counts.

    // ── Total (all filters) ──────────────────────────────────────────────────
    const total =
        kind === "all"
            ? countAlgorithmsWith(algorithms, sqParams)
              + countModelsWith(models, sqParams)
              + countConceptsWith(concepts, sqParams)
            : kind === "algorithm"
                ? countAlgorithmsWith(algorithms, sqParams)
                : kind === "model"
                    ? countModelsWith(models, sqParams)
                    : countConceptsWith(concepts, sqParams);

    return {
        kinds: { all: kindsAll, algorithm: kindsAlgorithm, model: kindsModel, concept: kindsConcept },
        problems: problemCounts,
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
    const tagsRaw = params.get("tags");
    const tags = tagsRaw ? tagsRaw.split(",").filter(Boolean) : [];
    const query = params.get("q") ?? "";
    // URL takes precedence over storage so /atlas?view=graph works as a deep link.
    const rawView = params.get("view");
    const urlView = isAlgorithmsView(rawView) ? rawView : null;
    const storedView = readStoredView();
    const view: AlgorithmsView = urlView ?? storedView ?? DEFAULTS.view;
    const sort: AlgorithmsSort = params.get("sort") === "az" ? "az" : "recent";
    const problem = params.get("problem") ?? "all";
    return { kind, tags, query, view, sort, problem };
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
    if (filters.tags.length > 0)                 p.set("tags", filters.tags.join(","));
    if (filters.query   !== DEFAULTS.query)      p.set("q",    filters.query);
    if (filters.view    !== DEFAULTS.view)        p.set("view", filters.view);
    if (filters.sort    !== DEFAULTS.sort)        p.set("sort", filters.sort);
    if (filters.problem !== DEFAULTS.problem)    p.set("problem", filters.problem);
    return p;
}

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
