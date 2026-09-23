import { describe, it, expect, afterEach } from "vitest";
import {
    filterAlgorithms,
    filterModels,
    filterConcepts,
    computeFacets,
    parseFiltersFromParams,
    buildParams,
    readStoredView,
    writeStoredView,
    ATLAS_VIEW_STORAGE_KEY,
    DEFAULTS,
    type AlgorithmsFilters,
} from "./atlasFilters.ts";
import type { AlgorithmIndexEntry, ModelIndexEntry, ConceptIndexEntry } from "../content/schema.ts";

// ── Synthetic fixtures ───────────────────────────────────────────────────────
// Cast through `unknown` — these fixtures only exercise the fields the pure
// filter/count/facet logic reads (slug, title, date, summary, tags, tasks,
// domain); the rest of the zod-derived frontmatter shape is irrelevant here.

function algo(
    slug: string,
    title: string,
    opts: { date?: string; summary?: string; tags?: string[]; tasks?: string[] } = {},
): AlgorithmIndexEntry {
    return {
        slug,
        frontmatter: {
            title,
            date: opts.date ?? "2026-01-01",
            summary: opts.summary ?? `${title} summary`,
            access: "public",
            tags: opts.tags ?? ["classical"],
            tasks: opts.tasks,
        },
    } as unknown as AlgorithmIndexEntry;
}

function model(
    slug: string,
    title: string,
    opts: { date?: string; summary?: string; tags?: string[]; tasks?: string[] } = {},
): ModelIndexEntry {
    return {
        slug,
        frontmatter: {
            title,
            date: opts.date ?? "2026-01-01",
            summary: opts.summary ?? `${title} summary`,
            access: "public",
            tags: opts.tags ?? ["deep-learning"],
            tasks: opts.tasks,
        },
    } as unknown as ModelIndexEntry;
}

function concept(
    slug: string,
    title: string,
    opts: { date?: string; summary?: string; tags?: string[] } = {},
): ConceptIndexEntry {
    return {
        slug,
        frontmatter: {
            title,
            date: opts.date ?? "2026-01-01",
            summary: opts.summary ?? `${title} summary`,
            access: "public",
            tags: opts.tags ?? ["classical"],
        },
    } as unknown as ConceptIndexEntry;
}

function baseFilters(overrides: Partial<AlgorithmsFilters> = {}): AlgorithmsFilters {
    return { ...DEFAULTS, ...overrides };
}

afterEach(() => {
    window.localStorage.clear();
});

// ── parseFiltersFromParams / buildParams round-trip ─────────────────────────

describe("buildParams / parseFiltersFromParams round-trip", () => {
    it("round-trips a fully non-default filter set", () => {
        const filters = baseFilters({
            kind: "model",
            tags: ["deep-learning", "real-time"],
            query: "corner",
            view: "list",
            sort: "az",
            problem: "corner-detection",
        });
        const params = buildParams(filters);
        expect(parseFiltersFromParams(params)).toEqual(filters);
    });

    it("round-trips the all-defaults filter set to an empty param string", () => {
        const params = buildParams(DEFAULTS);
        expect(params.toString()).toBe("");
        expect(parseFiltersFromParams(params)).toEqual(DEFAULTS);
    });

    it("maps legacy kind aliases: classical -> algorithm, models -> model", () => {
        expect(parseFiltersFromParams(new URLSearchParams("kind=classical")).kind).toBe("algorithm");
        expect(parseFiltersFromParams(new URLSearchParams("kind=models")).kind).toBe("model");
        expect(parseFiltersFromParams(new URLSearchParams("kind=model")).kind).toBe("model");
        expect(parseFiltersFromParams(new URLSearchParams("kind=concept")).kind).toBe("concept");
        expect(parseFiltersFromParams(new URLSearchParams("kind=bogus")).kind).toBe("all");
    });

    it("falls back to the default problem for an unknown task slug", () => {
        const filters = parseFiltersFromParams(new URLSearchParams("problem=not-a-real-task"));
        expect(filters.problem).toBe("all");
    });

    it("accepts a known task slug for problem", () => {
        const filters = parseFiltersFromParams(new URLSearchParams("problem=corner-detection"));
        expect(filters.problem).toBe("corner-detection");
    });

    it("defaults sort to recent for anything other than 'az'", () => {
        expect(parseFiltersFromParams(new URLSearchParams("sort=az")).sort).toBe("az");
        expect(parseFiltersFromParams(new URLSearchParams("sort=bogus")).sort).toBe("recent");
        expect(parseFiltersFromParams(new URLSearchParams("")).sort).toBe("recent");
    });
});

describe("view resolution: URL beats stored view beats default", () => {
    it("uses the URL view when present, ignoring any stored view", () => {
        writeStoredView("list");
        const filters = parseFiltersFromParams(new URLSearchParams("view=graph"));
        expect(filters.view).toBe("graph");
    });

    it("falls back to the stored view when the URL has none", () => {
        writeStoredView("narratives");
        const filters = parseFiltersFromParams(new URLSearchParams(""));
        expect(filters.view).toBe("narratives");
    });

    it("falls back to the default view when neither URL nor storage has one", () => {
        expect(readStoredView()).toBeNull();
        const filters = parseFiltersFromParams(new URLSearchParams(""));
        expect(filters.view).toBe(DEFAULTS.view);
    });

    it("ignores a garbage value in storage", () => {
        window.localStorage.setItem(ATLAS_VIEW_STORAGE_KEY, "not-a-view");
        expect(readStoredView()).toBeNull();
        const filters = parseFiltersFromParams(new URLSearchParams(""));
        expect(filters.view).toBe(DEFAULTS.view);
    });
});

// ── filterAlgorithms / filterModels / filterConcepts ─────────────────────────

describe("filterAlgorithms / filterModels / filterConcepts", () => {
    const algorithms = [
        algo("harris", "Harris corner detector", { date: "2026-01-01", tags: ["classical", "keypoint-detection"], tasks: ["corner-detection"] }),
        algo("shi-tomasi", "Shi-Tomasi", { date: "2026-02-01", tags: ["classical"], tasks: ["corner-detection"] }),
        algo("ransac", "RANSAC", { date: "2026-03-01", tags: ["robust-estimation"] }),
    ];
    const models = [
        model("superpoint", "SuperPoint", { date: "2026-01-15", tags: ["deep-learning"], tasks: ["corner-detection"] }),
    ];
    const concepts = [
        concept("epipolar-geometry", "Epipolar geometry", { date: "2026-01-10", tags: ["classical"] }),
    ];

    it("filters algorithms by tag", () => {
        const result = filterAlgorithms(algorithms, baseFilters({ tags: ["keypoint-detection"] }));
        expect(result.map((e) => e.slug)).toEqual(["harris"]);
    });

    it("filters algorithms by problem", () => {
        const result = filterAlgorithms(algorithms, baseFilters({ problem: "corner-detection" }));
        expect(result.map((e) => e.slug).sort()).toEqual(["harris", "shi-tomasi"]);
    });

    it("filters by search-matched slugs when a query is present", () => {
        const result = filterAlgorithms(
            algorithms,
            baseFilters({ query: "corner" }),
            new Set(["harris"]),
        );
        expect(result.map((e) => e.slug)).toEqual(["harris"]);
    });

    it("falls back to substring match when searchMatchedSlugs is null", () => {
        const result = filterAlgorithms(algorithms, baseFilters({ query: "ransac" }), null);
        expect(result.map((e) => e.slug)).toEqual(["ransac"]);
    });

    it("sorts 'recent' newest-first", () => {
        const result = filterAlgorithms(algorithms, baseFilters({ sort: "recent" }));
        expect(result.map((e) => e.slug)).toEqual(["ransac", "shi-tomasi", "harris"]);
    });

    it("sorts 'az' by title", () => {
        const result = filterAlgorithms(algorithms, baseFilters({ sort: "az" }));
        expect(result.map((e) => e.slug)).toEqual(["harris", "ransac", "shi-tomasi"]);
    });

    it("filters models the same way as algorithms", () => {
        const result = filterModels(models, baseFilters({ problem: "corner-detection" }));
        expect(result.map((e) => e.slug)).toEqual(["superpoint"]);
    });

    it("excludes all concepts when a specific problem filter is active", () => {
        const result = filterConcepts(concepts, baseFilters({ problem: "corner-detection" }));
        expect(result).toEqual([]);
    });

    it("includes concepts when problem is 'all'", () => {
        const result = filterConcepts(concepts, baseFilters());
        expect(result.map((e) => e.slug)).toEqual(["epipolar-geometry"]);
    });
});

// ── computeFacets ─────────────────────────────────────────────────────────────

describe("computeFacets", () => {
    const algorithms = [
        algo("harris", "Harris", { tags: ["classical"], tasks: ["corner-detection"] }),
        algo("ransac", "RANSAC", { tags: ["robust-estimation"] }),
    ];
    const models = [
        model("superpoint", "SuperPoint", { tags: ["deep-learning"], tasks: ["corner-detection"] }),
    ];
    const concepts = [
        concept("epipolar-geometry", "Epipolar geometry", { tags: ["classical"] }),
    ];

    it("computes kind counts applying only tags + query (not the active kind/problem)", () => {
        const facets = computeFacets(algorithms, models, concepts, baseFilters({ kind: "model" }));
        expect(facets.kinds).toEqual({ all: 4, algorithm: 2, model: 1, concept: 1 });
    });

    it("computes problem counts ignoring the active problem filter", () => {
        const facets = computeFacets(
            algorithms,
            models,
            concepts,
            baseFilters({ kind: "all", problem: "corner-detection" }),
        );
        expect(facets.problems["corner-detection"]).toBe(2);
    });

    it("computes total respecting the active kind", () => {
        const facetsAll = computeFacets(algorithms, models, concepts, baseFilters({ kind: "all" }));
        expect(facetsAll.total).toBe(4);

        const facetsAlgo = computeFacets(algorithms, models, concepts, baseFilters({ kind: "algorithm" }));
        expect(facetsAlgo.total).toBe(2);

        const facetsConcept = computeFacets(algorithms, models, concepts, baseFilters({ kind: "concept" }));
        expect(facetsConcept.total).toBe(1);
    });

    it("restricts problem counts to algorithms/models only when kind is scoped to one", () => {
        const facets = computeFacets(algorithms, models, concepts, baseFilters({ kind: "model" }));
        // Only SuperPoint (a model) contributes; Harris (an algorithm) does not.
        expect(facets.problems["corner-detection"]).toBe(1);
    });
});
