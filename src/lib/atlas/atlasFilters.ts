import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../content/schema.ts";
import { taskOrder } from "../content/taskLabels.ts";

// ── Public types ────────────────────────────────────────────────────────────

export type AlgorithmsKind = "all" | "algorithm" | "model" | "concept";
export type AlgorithmsView = "grid" | "list" | "graph" | "narratives" | "people" | "papers";
export type AlgorithmsSort = "az" | "recent";
/** People-view-only sub-mode: the directory table or the co-author network. */
export type PeopleMode = "directory" | "network";

/** localStorage key the view selection is persisted to. */
export const ATLAS_VIEW_STORAGE_KEY = "atlas:view";
/** localStorage key the last catalog layout (grid|list) is persisted to,
 *  independent of ATLAS_VIEW_STORAGE_KEY — so the "Catalog" tab can restore
 *  the last grid/list choice even after visiting People/Papers/Graph/Narratives. */
const ATLAS_CATALOG_LAYOUT_KEY = "atlas:catalogLayout";

const VIEW_VALUES: readonly AlgorithmsView[] = ["grid", "list", "graph", "narratives", "people", "papers"];

function isAlgorithmsView(value: string | null): value is AlgorithmsView {
    return value !== null && (VIEW_VALUES as readonly string[]).includes(value);
}

function isCatalogLayout(value: AlgorithmsView): value is "grid" | "list" {
    return value === "grid" || value === "list";
}

export interface AlgorithmsFilters {
    kind: AlgorithmsKind;
    tags: string[];
    query: string;
    view: AlgorithmsView;
    sort: AlgorithmsSort;
    problem: string;      // "all" | Task slug
    /** People-view-only: directory table vs. network graph. Ignored by every
     *  other view and dropped from the URL when `view` isn't "people". */
    mode: PeopleMode;
    /** People-view-only: the focused author id in network mode. Same
     *  drop-when-not-"people" rule as `mode`. */
    person: string | undefined;
}

export interface FacetCounts {
    kinds:      Record<AlgorithmsKind, number>;
    problems:   Record<string, number>;   // per-task faceted count
    total:      number;                   // count after ALL filters
}

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULTS: AlgorithmsFilters = {
    kind:       "all",
    tags:       [],
    query:      "",
    view:       "grid",
    sort:       "recent",
    problem:    "all",
    mode:       "directory",
    person:     undefined,
};

// ── Pure filter helpers ──────────────────────────────────────────────────────

/** Shape shared by algorithm/model/concept index entries, enough to filter/sort/count generically. */
interface FilterableEntry {
    slug: string;
    frontmatter: {
        title: string;
        date: string;
        summary: string;
        tags: readonly string[];
        tasks?: readonly string[];
    };
}

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
 * Filter a list of entries by tags, search query, and (optionally) problem/task.
 * Caller must pre-filter out drafts if needed.
 *
 * @param opts.hasTasks - false for entry kinds with no `tasks` field (concepts):
 *   a specific problem filter then excludes all of them, matching the old
 *   per-kind `filterConcepts` short-circuit.
 * @param searchMatchedSlugs - Set of slugs matched by MiniSearch, or null if
 *   the query is empty / index not yet built (fall-through to substring match).
 */
function filterEntries<T extends FilterableEntry>(
    items: T[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null,
    opts: { hasTasks: boolean },
): T[] {
    const { tags, query, sort, problem } = filters;
    if (!opts.hasTasks && problem !== "all") return [];
    const result = items.filter((entry) => {
        const fm = entry.frontmatter;
        return (
            matchesTags(fm.tags, tags) &&
            matchesSearch(entry.slug, fm.title, fm.summary, query, searchMatchedSlugs) &&
            (opts.hasTasks ? matchesProblem(fm.tasks, problem) : true)
        );
    });
    return applySort(result, sort);
}

/**
 * Filter algorithms by tags, query, and problem (no kind — kind is implicit).
 * Caller must pre-filter out drafts if needed.
 */
export function filterAlgorithms(
    items: AlgorithmIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): AlgorithmIndexEntry[] {
    return filterEntries(items, filters, searchMatchedSlugs, { hasTasks: true });
}

/**
 * Filter models by tags, query, and problem.
 * Caller must pre-filter out drafts if needed.
 */
export function filterModels(
    items: ModelIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ModelIndexEntry[] {
    return filterEntries(items, filters, searchMatchedSlugs, { hasTasks: true });
}

/**
 * Filter concepts by tags and query.
 * Concepts have no `tasks` field; a specific problem filter excludes all concepts.
 * Caller must pre-filter out drafts if needed.
 */
export function filterConcepts(
    items: ConceptIndexEntry[],
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null = null,
): ConceptIndexEntry[] {
    return filterEntries(items, filters, searchMatchedSlugs, { hasTasks: false });
}

// ── Faceted count helpers ────────────────────────────────────────────────────

function countWith<T extends FilterableEntry>(
    items: T[],
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

function addProblemCounts<T extends FilterableEntry>(
    items: T[],
    tags: string[],
    query: string,
    searchMatchedSlugs: Set<string> | null,
    problemCounts: Record<string, number>,
): void {
    const candidateItems = items.filter((e) => {
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
    const kindsAlgorithm = countWith(algorithms, sqParams);
    const kindsModel     = countWith(models, sqParams);
    const kindsConcept   = countWith(concepts, sqParams);
    const kindsAll       = kindsAlgorithm + kindsModel + kindsConcept;

    // ── Problem counts ───────────────────────────────────────────────────────
    // Counts reflect kind/tag/search filters but ignore the active problem.
    const problemCounts: Record<string, number> = {};

    if (kind === "algorithm" || kind === "all") {
        addProblemCounts(algorithms, tags, query, searchMatchedSlugs, problemCounts);
    }
    if (kind === "model" || kind === "all") {
        addProblemCounts(models, tags, query, searchMatchedSlugs, problemCounts);
    }
    // Concepts have no tasks, so they contribute nothing to problem counts.

    // ── Total (all filters) ──────────────────────────────────────────────────
    const total =
        kind === "all"
            ? kindsAll
            : kind === "algorithm"
                ? kindsAlgorithm
                : kind === "model"
                    ? kindsModel
                    : kindsConcept;

    return {
        kinds: { all: kindsAll, algorithm: kindsAlgorithm, model: kindsModel, concept: kindsConcept },
        problems: problemCounts,
        total,
    };
}

// ── URL serialization helpers ────────────────────────────────────────────────

export function parseFiltersFromParams(params: URLSearchParams): AlgorithmsFilters {
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
    // Validate `problem` against known task slugs — a stale or mistyped value
    // would otherwise blank the whole catalog (matchesProblem excludes all).
    const rawProblem = params.get("problem");
    const problem =
        rawProblem !== null && (taskOrder as readonly string[]).includes(rawProblem)
            ? rawProblem
            : DEFAULTS.problem;
    // `mode`/`person` are People-view-only, but harmless to parse regardless
    // of `view` — buildParams is what enforces "dropped when not People".
    const rawMode = params.get("mode");
    const mode: PeopleMode = rawMode === "network" ? "network" : DEFAULTS.mode;
    const person = params.get("person") ?? undefined;
    return { kind, tags, query, view, sort, problem, mode, person };
}

export function readStoredView(): AlgorithmsView | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ATLAS_VIEW_STORAGE_KEY);
        return isAlgorithmsView(raw) ? raw : null;
    } catch {
        return null;
    }
}

export function writeStoredView(view: AlgorithmsView): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(ATLAS_VIEW_STORAGE_KEY, view);
        // Also remember grid/list specifically, so the Catalog tab can restore
        // it later even if the overall last view ends up being People/Papers/etc.
        if (isCatalogLayout(view)) {
            window.localStorage.setItem(ATLAS_CATALOG_LAYOUT_KEY, view);
        }
    } catch {
        // quota / private mode — silently ignore
    }
}

/** The catalog layout (grid|list) to return to when the "Catalog" tab is
 *  selected — the last one used, or "grid" if none was ever recorded. */
export function readStoredCatalogLayout(): "grid" | "list" {
    if (typeof window === "undefined") return "grid";
    try {
        const raw = window.localStorage.getItem(ATLAS_CATALOG_LAYOUT_KEY);
        return raw === "grid" || raw === "list" ? raw : "grid";
    } catch {
        return "grid";
    }
}

/** Params this module owns; everything else in the URL (e.g. `focus`) is
 *  carried through untouched by `buildParams`. */
const FILTER_PARAM_KEYS = ["kind", "tags", "q", "view", "sort", "problem", "mode", "person"] as const;

export function buildParams(filters: AlgorithmsFilters, current?: URLSearchParams): URLSearchParams {
    const p = new URLSearchParams(current);
    for (const key of FILTER_PARAM_KEYS) p.delete(key);
    if (filters.kind    !== DEFAULTS.kind)       p.set("kind",  filters.kind);
    if (filters.tags.length > 0)                 p.set("tags", filters.tags.join(","));
    if (filters.query   !== DEFAULTS.query)      p.set("q",    filters.query);
    if (filters.view    !== DEFAULTS.view)        p.set("view", filters.view);
    if (filters.sort    !== DEFAULTS.sort)        p.set("sort", filters.sort);
    if (filters.problem !== DEFAULTS.problem)    p.set("problem", filters.problem);
    // `mode`/`person` are People-only — always dropped when leaving that view,
    // regardless of what the caller passed in `filters`.
    if (filters.view === "people") {
        if (filters.mode   !== DEFAULTS.mode) p.set("mode", filters.mode);
        if (filters.person)                   p.set("person", filters.person);
    }
    return p;
}
