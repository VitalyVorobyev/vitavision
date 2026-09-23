import { describe, it, expect } from "vitest";
import { buildScholarlyIndex, layoutNetwork } from "./scholarly.ts";
import type {
    ScholarlyPageInput,
    ScholarlyPaperInput,
    ScholarlyAuthorsInput,
    ScholarlyNarrativeInput,
    BuildScholarlyIndexInput,
} from "./scholarly.ts";

// Minimal fixture factories — only the fields the builder actually reads.

function paper(overrides: Partial<ScholarlyPaperInput> & { id: string }): ScholarlyPaperInput {
    return { year: 2000, cites: [], ...overrides };
}

function page(overrides: Partial<ScholarlyPageInput> & { slug: string; title: string }): ScholarlyPageInput {
    return { kind: "algorithm", ...overrides };
}

function narrative(overrides: Partial<ScholarlyNarrativeInput> & { slug: string; title: string }): ScholarlyNarrativeInput {
    return { pageSlugs: [], paperIds: [], ...overrides };
}

function emptyAuthorsIndex(): ScholarlyAuthorsInput {
    return { authors: {}, paperAuthors: {} };
}

function build(overrides: Partial<BuildScholarlyIndexInput>): ReturnType<typeof buildScholarlyIndex> {
    return buildScholarlyIndex({
        pages: [],
        papers: [],
        authorsIndex: emptyAuthorsIndex(),
        narratives: [],
        ...overrides,
    });
}

describe("buildScholarlyIndex — pages", () => {
    it("splits primary vs citing pages, sorted by title (not slug); drops repo/doc/unknown refs", () => {
        const result = build({
            papers: [paper({ id: "p1", year: 1970 }), paper({ id: "p2", year: 1980 })],
            pages: [
                page({ slug: "z-page", title: "Zeta", sources: { primary: "paper:p1" } }),
                page({ slug: "a-page", title: "Alpha", sources: { primary: "paper:p1" } }),
                page({
                    slug: "c-page",
                    title: "Citer",
                    sources: {
                        references: ["paper:p2", "repo:https://example.com/x@1234567", "doc:docs/readme.md", "p3-unregistered"],
                    },
                }),
                page({ slug: "empty-page", title: "Empty", sources: undefined }),
            ],
        });

        // Pages citing no registry paper are excluded entirely.
        expect(Object.keys(result.pages).sort()).toEqual(["a-page", "c-page", "z-page"]);

        expect(result.papers.p1.primaryPages).toEqual(["a-page", "z-page"]); // Alpha < Zeta by title
        expect(result.papers.p1.citingPages).toEqual([]);
        expect(result.papers.p2.primaryPages).toEqual([]);
        expect(result.papers.p2.citingPages).toEqual(["c-page"]); // repo:/doc:/unregistered refs dropped
    });

    it("does not double-count a paper referenced as both primary and (redundantly) in references", () => {
        const result = build({
            papers: [paper({ id: "p1" })],
            pages: [page({ slug: "pg", title: "Page", sources: { primary: "paper:p1", references: ["paper:p1"] } })],
        });
        expect(result.papers.p1.primaryPages).toEqual(["pg"]);
        expect(result.papers.p1.citingPages).toEqual([]);
    });
});

describe("buildScholarlyIndex — cites/citedBy", () => {
    it("filters cites to registry ids, dedupes, sorts oldest-first; citedBy is the reverse, same sort", () => {
        const result = build({
            papers: [
                paper({ id: "p1970", year: 1970, cites: [] }),
                paper({ id: "p1980", year: 1980, cites: ["p1970", "ghost-paper"] }),
                paper({ id: "p1990", year: 1990, cites: ["p1970", "p1980", "p1970"] }),
            ],
        });

        expect(result.papers.p1980.cites).toEqual(["p1970"]);
        expect(result.papers.p1990.cites).toEqual(["p1970", "p1980"]); // year-sorted, deduped
        expect(result.papers.p1970.cites).toEqual([]);

        expect(result.papers.p1970.citedBy).toEqual(["p1980", "p1990"]); // oldest citing paper first
        expect(result.papers.p1980.citedBy).toEqual(["p1990"]);
        expect(result.papers.p1990.citedBy).toEqual([]);
    });

    it("never lists a paper as citing itself", () => {
        const result = build({ papers: [paper({ id: "p1", cites: ["p1"] })] });
        expect(result.papers.p1.cites).toEqual([]);
        expect(result.papers.p1.citedBy).toEqual([]);
    });
});

describe("buildScholarlyIndex — narratives", () => {
    it("direct paper-node hits win over page-reachable hits (dedupe), then sorts by title within each via-bucket", () => {
        const result = build({
            papers: [paper({ id: "p1" })],
            pages: [page({ slug: "pg1", title: "Page One", sources: { primary: "paper:p1" } })],
            narratives: [
                // Reaches p1 both directly (paper node) AND via its primary page —
                // must appear exactly once, as "paper".
                narrative({ slug: "n-direct", title: "Direct Hit", paperIds: ["p1"], pageSlugs: ["pg1"] }),
                narrative({ slug: "n-page-b", title: "Bravo Page", pageSlugs: ["pg1"] }),
                narrative({ slug: "n-page-a", title: "Alpha Page", pageSlugs: ["pg1"] }),
            ],
        });

        expect(result.papers.p1.narratives).toEqual([
            { slug: "n-direct", title: "Direct Hit", via: "paper" },
            { slug: "n-page-a", title: "Alpha Page", via: "page" },
            { slug: "n-page-b", title: "Bravo Page", via: "page" },
        ]);
    });

    it("a paper with no reaching narrative gets an empty list", () => {
        const result = build({ papers: [paper({ id: "p1" })] });
        expect(result.papers.p1.narratives).toEqual([]);
    });
});

describe("buildScholarlyIndex — authors", () => {
    it("computes year span, pageCount, domain ordering and group; 'other' when no cited pages", () => {
        const result = build({
            papers: [paper({ id: "p2015", year: 2015 }), paper({ id: "p2020", year: 2020 })],
            pages: [
                page({ slug: "pa", title: "A", domain: "features", sources: { primary: "paper:p2015" } }),
                page({ slug: "pb", title: "B", domain: "features", sources: { primary: "paper:p2020" } }),
                page({ slug: "pc", title: "C", domain: "geometry", sources: { references: ["paper:p2020"] } }),
            ],
            authorsIndex: {
                authors: {
                    auth1: { name: "Author One", papers: ["p2015", "p2020"] },
                    "auth-other": { name: "No Pages", papers: [] },
                },
                paperAuthors: {},
            },
        });

        const auth1 = result.authors.auth1;
        expect(auth1.firstYear).toBe(2015);
        expect(auth1.lastYear).toBe(2020);
        expect(auth1.pageCount).toBe(3); // pa (primary p2015), pb (primary p2020), pc (citing p2020)
        expect(auth1.primaryPages).toEqual(["pa", "pb"]);
        expect(auth1.domains).toEqual([
            { domain: "features", count: 2 },
            { domain: "geometry", count: 1 },
        ]);
        expect(auth1.group).toBe("features");

        expect(result.authors["auth-other"]).toEqual({
            firstYear: 0,
            lastYear: 0,
            pageCount: 0,
            primaryPages: [],
            domains: [],
            group: "other",
        });
    });

    it("breaks a domain-count tie by domain name ascending", () => {
        const result = build({
            papers: [paper({ id: "p1" })],
            pages: [
                page({ slug: "pa", title: "A", domain: "geometry", sources: { primary: "paper:p1" } }),
                page({ slug: "pb", title: "B", domain: "calibration", sources: { references: ["paper:p1"] } }),
            ],
            authorsIndex: {
                authors: { auth1: { name: "Author", papers: ["p1"] } },
                paperAuthors: {},
            },
        });
        expect(result.authors.auth1.domains).toEqual([
            { domain: "calibration", count: 1 },
            { domain: "geometry", count: 1 },
        ]);
    });
});

describe("buildScholarlyIndex — coauthorPapers", () => {
    it("is symmetric and sorted oldest-first, one entry per shared paper", () => {
        const result = build({
            papers: [paper({ id: "pOld", year: 1990 }), paper({ id: "pNew", year: 2000 })],
            authorsIndex: {
                authors: {
                    a: { name: "A", papers: ["pOld", "pNew"] },
                    b: { name: "B", papers: ["pOld", "pNew"] },
                    c: { name: "C", papers: ["pOld"] },
                },
                paperAuthors: { pOld: ["a", "b", "c"], pNew: ["a", "b"] },
            },
        });

        expect(result.coauthorPapers.a.b).toEqual(["pOld", "pNew"]);
        expect(result.coauthorPapers.b.a).toEqual(["pOld", "pNew"]);
        expect(result.coauthorPapers.a.c).toEqual(["pOld"]);
        expect(result.coauthorPapers.c.a).toEqual(["pOld"]);
        expect(result.coauthorPapers.b.c).toEqual(["pOld"]);
        expect(result.coauthorPapers.c.b).toEqual(["pOld"]);
    });

    it("has no entry for a pair sharing zero papers", () => {
        const result = build({
            authorsIndex: {
                authors: { a: { name: "A", papers: [] }, b: { name: "B", papers: [] } },
                paperAuthors: {},
            },
        });
        expect(result.coauthorPapers.a?.b).toBeUndefined();
    });
});

describe("buildScholarlyIndex — network", () => {
    function fourAuthorInput(): BuildScholarlyIndexInput {
        return {
            pages: [],
            papers: [paper({ id: "pOld", year: 1990 }), paper({ id: "pNew", year: 2000 }), paper({ id: "pSolo", year: 2010 })],
            authorsIndex: {
                authors: {
                    a: { name: "A", papers: ["pOld", "pNew"] },
                    b: { name: "B", papers: ["pOld", "pNew"] },
                    c: { name: "C", papers: ["pOld"] },
                    d: { name: "D", papers: ["pSolo"] }, // no coauthors, isolated node
                },
                paperAuthors: { pOld: ["a", "b", "c"], pNew: ["a", "b"] },
            },
            narratives: [],
        };
    }

    it("is deterministic across repeated builds on the same input", () => {
        const r1 = buildScholarlyIndex(fourAuthorInput());
        const r2 = buildScholarlyIndex(fourAuthorInput());
        expect(r2.network).toEqual(r1.network);
    });

    it("emits every edge with a < b (string compare) and count equal to shared-paper count", () => {
        const result = buildScholarlyIndex(fourAuthorInput());
        for (const [a, b] of result.network.edges) {
            expect(a < b).toBe(true);
        }
        const edgeMap = new Map(result.network.edges.map(([a, b, count]) => [`${a}-${b}`, count]));
        expect(edgeMap.get("a-b")).toBe(2);
        expect(edgeMap.get("a-c")).toBe(1);
        expect(edgeMap.get("b-c")).toBe(1);
        expect(edgeMap.has("d-a")).toBe(false); // d shares nothing with anyone
    });

    it("includes every author as a network node, and bounds match the node coordinates", () => {
        const result = buildScholarlyIndex(fourAuthorInput());
        expect(result.network.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c", "d"]);

        const xs = result.network.nodes.map((n) => n.x);
        const ys = result.network.nodes.map((n) => n.y);
        expect(result.network.bounds).toEqual({
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        });
    });

    it("rounds every coordinate to one decimal place", () => {
        const result = buildScholarlyIndex(fourAuthorInput());
        for (const n of result.network.nodes) {
            expect(Math.round(n.x * 10)).toBeCloseTo(n.x * 10, 6);
            expect(Math.round(n.y * 10)).toBeCloseTo(n.y * 10, 6);
        }
    });

    it("produces an empty-but-valid network for an empty author set", () => {
        const result = build({});
        expect(result.network).toEqual({
            nodes: [],
            edges: [],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        });
    });
});

describe("layoutNetwork (exported directly)", () => {
    it("is deterministic and sorts its own node order regardless of input order", () => {
        const meta = {
            a: { group: "features" as const, pageCount: 4 },
            b: { group: "geometry" as const, pageCount: 1 },
        };
        const edges: [string, string, number][] = [["a", "b", 1]];

        const r1 = layoutNetwork(["b", "a"], edges, meta);
        const r2 = layoutNetwork(["a", "b"], edges, meta);
        expect(r1).toEqual(r2);
        expect(r1.nodes.map((n) => n.id)).toEqual(["a", "b"]);
        expect(r1.edges).toBe(edges); // passed through unchanged
    });

    it("returns zeroed bounds for zero nodes", () => {
        expect(layoutNetwork([], [], {})).toEqual({
            nodes: [],
            edges: [],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        });
    });
});
