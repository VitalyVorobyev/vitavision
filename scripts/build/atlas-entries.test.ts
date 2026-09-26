import { describe, it, expect } from "vitest";
import {
    buildAtlasBySlug,
    buildAtlasGraphEntries,
    buildAtlasAuthorPages,
    buildAtlasSearchEntries,
    toAtlasPageLookup,
} from "./atlas-entries.ts";
import type { AlgorithmEntry, ModelEntry, ConceptEntry } from "../../src/lib/content/schema.ts";

// Minimal fixtures: only the fields the mappers under test actually read.
// Cast through `unknown` rather than constructing full zod-shaped frontmatter
// (title/date/summary/access/tags/... required by the real schemas) since
// these are pure-function unit tests, not schema round-trips.
function algo(overrides: Record<string, unknown> = {}): AlgorithmEntry {
    return {
        slug: overrides.slug ?? "chess-corners",
        frontmatter: { title: "Chess Corners", summary: "A corner detector.", tags: ["classical"], ...overrides },
        html: "<p>algo</p>",
    } as unknown as AlgorithmEntry;
}

function model(overrides: Record<string, unknown> = {}): ModelEntry {
    return {
        slug: overrides.slug ?? "alexnet",
        frontmatter: { title: "AlexNet", summary: "A CNN.", tags: ["deep-learning"], ...overrides },
        html: "<p>model</p>",
    } as unknown as ModelEntry;
}

function concept(overrides: Record<string, unknown> = {}): ConceptEntry {
    return {
        slug: overrides.slug ?? "homography",
        frontmatter: { title: "Homography", summary: "A projective map.", tags: ["geometry"], ...overrides },
        html: "<p>concept</p>",
    } as unknown as ConceptEntry;
}

describe("toAtlasPageLookup", () => {
    it("projects slug/title/kind/year/quality", () => {
        const e = algo({ year: 1988, quality: "canonical" });
        expect(toAtlasPageLookup(e, "algorithm")).toEqual({
            slug: "chess-corners",
            title: "Chess Corners",
            pageKind: "algorithm",
            year: 1988,
            quality: "canonical",
        });
    });
});

describe("buildAtlasBySlug", () => {
    it("keys every algorithm/model/concept entry by slug with its own kind", () => {
        const map = buildAtlasBySlug([algo()], [model()], [concept()]);
        expect(map.get("chess-corners")?.pageKind).toBe("algorithm");
        expect(map.get("alexnet")?.pageKind).toBe("model");
        expect(map.get("homography")?.pageKind).toBe("concept");
        expect(map.size).toBe(3);
    });
});

describe("buildAtlasGraphEntries", () => {
    it("carries prerequisites/failureModes/relations through per kind, in algorithm/model/concept order", () => {
        const entries = buildAtlasGraphEntries(
            [algo({ prerequisites: ["ransac"], draft: true })],
            [model({ failureModes: ["overfitting"] })],
            [concept({ relations: [{ type: "compared_with", target: "x", confidence: "high" }] })],
        );
        expect(entries.map((e) => e.type)).toEqual(["algorithm", "model", "concept"]);
        expect(entries[0]).toMatchObject({ slug: "chess-corners", draft: true, prerequisites: ["ransac"] });
        expect(entries[1]).toMatchObject({ slug: "alexnet", failureModes: ["overfitting"] });
        expect(entries[2].relations).toEqual([{ type: "compared_with", target: "x", confidence: "high" }]);
    });

    it("defaults draft to false when frontmatter.draft is not exactly true", () => {
        const [entry] = buildAtlasGraphEntries([algo()], [], []);
        expect(entry.draft).toBe(false);
    });
});

describe("buildAtlasAuthorPages", () => {
    it("projects {slug, sources} across all three kinds", () => {
        const pages = buildAtlasAuthorPages(
            [algo({ sources: { primary: "paper:duda1972" } })],
            [model({ sources: { primary: "paper:krizhevsky2012" } })],
            [concept({ sources: undefined })],
        );
        expect(pages).toEqual([
            { slug: "chess-corners", sources: { primary: "paper:duda1972" } },
            { slug: "alexnet", sources: { primary: "paper:krizhevsky2012" } },
            { slug: "homography", sources: undefined },
        ]);
    });
});

describe("buildAtlasSearchEntries", () => {
    it("resolves `primary` per entry and carries tags/domain/html", () => {
        const resolvePrimary = (fm: { sources?: { primary?: string } }) =>
            fm.sources?.primary === "paper:duda1972" ? { authors: ["Duda", "Hart"], venue: "CACM" } : undefined;

        const entries = buildAtlasSearchEntries(
            [algo({ sources: { primary: "paper:duda1972" }, domain: "features" })],
            [model()],
            [],
            resolvePrimary,
        );

        expect(entries[0]).toMatchObject({
            slug: "chess-corners",
            type: "algorithm",
            domain: "features",
            html: "<p>algo</p>",
            primary: { authors: ["Duda", "Hart"], venue: "CACM" },
        });
        expect(entries[1].primary).toBeUndefined();
    });
});
