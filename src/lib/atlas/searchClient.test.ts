import { describe, it, expect, vi } from "vitest";
import type { SearchRecord } from "../../generated/content-search.ts";

/**
 * A small, hand-built fixture standing in for src/generated/content-search.ts.
 * Deliberately includes overlapping vocabulary across record types (e.g. both
 * an atlas page and a paper mention "residual"/"harris") so the tests can
 * prove `searchSlugs` never leaks a non-atlas hit into the catalog filter's
 * slug set, independent of whatever the real content graph happens to
 * contain at any given time.
 */
const fixtureRecords: SearchRecord[] = [
    {
        slug: "harris-corner-detector",
        path: "/atlas/harris-corner-detector",
        type: "algorithm",
        title: "Harris Corner Detector",
        summary: "Classic corner response function.",
        tags: ["corners"],
        headings: [],
    },
    {
        slug: "residual-block",
        path: "/atlas/residual-block",
        type: "concept",
        title: "Residual Learning Block",
        summary: "Skip connections for deep networks.",
        tags: ["residual"],
        headings: [],
    },
    {
        slug: "A-girshick",
        path: "/authors/A-girshick",
        type: "author",
        title: "Ross Girshick",
        summary: "5 papers",
        tags: [],
        headings: [],
    },
    {
        slug: "A-harris",
        path: "/authors/A-harris",
        type: "author",
        title: "Chris Harris",
        summary: "1 paper",
        tags: [],
        headings: [],
    },
    {
        slug: "A-jegou",
        path: "/authors/A-jegou",
        type: "author",
        title: "Hervé Jégou",
        summary: "3 papers",
        tags: [],
        headings: [],
    },
    {
        slug: "paper:he2016-resnet",
        path: "/papers/he2016-resnet",
        type: "paper",
        title: "Deep Residual Learning for Image Recognition",
        summary: "CVPR 2016",
        tags: ["resnet"],
        headings: [],
        authors: ["K. He", "X. Zhang", "S. Ren", "J. Sun"],
        venue: "CVPR 2016",
    },
];

vi.mock("../../generated/content-search.ts", () => ({ searchRecords: fixtureRecords }));

// Imported after the mock so the module under test picks up the fixture.
const { searchSlugs, searchEntities } = await import("./searchClient.ts");

describe("searchSlugs", () => {
    it("returns null for an empty/whitespace query", () => {
        expect(searchSlugs("")).toBeNull();
        expect(searchSlugs("   ")).toBeNull();
    });

    it("matches an atlas page by title", () => {
        const slugs = searchSlugs("harris corner");
        expect(slugs).not.toBeNull();
        expect(slugs!.has("harris-corner-detector")).toBe(true);
    });

    it("never includes an author slug, even when the query also matches an author's name", () => {
        // "harris" matches both the algorithm page's title and the author
        // "Chris Harris" — only the atlas page slug may appear.
        const slugs = searchSlugs("harris")!;
        expect(slugs.has("harris-corner-detector")).toBe(true);
        expect([...slugs].some((s) => s === "A-harris")).toBe(false);
    });

    it("never includes a paper:-prefixed slug, even when the query also matches a paper title", () => {
        // "residual" matches both the concept page's tag/title and the
        // paper's title ("Deep Residual Learning...") — only the atlas page
        // slug may appear; no "paper:he2016-resnet" leak.
        const slugs = searchSlugs("residual")!;
        expect(slugs.has("residual-block")).toBe(true);
        expect([...slugs].some((s) => s.startsWith("paper:"))).toBe(false);
    });

    it("returns an empty set (not null) when the query matches nothing", () => {
        const slugs = searchSlugs("zzz-no-such-term-zzz");
        expect(slugs).not.toBeNull();
        expect(slugs!.size).toBe(0);
    });
});

describe("searchEntities", () => {
    it("returns [] for an empty query", () => {
        expect(searchEntities("")).toEqual([]);
    });

    it("ranks a paper nickname query to the matching paper", () => {
        const results = searchEntities("resnet");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toMatchObject({ type: "paper", path: "/papers/he2016-resnet" });
    });

    it("ranks a surname query to the matching person", () => {
        const results = searchEntities("girshick");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toMatchObject({ type: "author", path: "/authors/A-girshick" });
    });

    it("is diacritic-insensitive: an unaccented query matches an accented name", () => {
        const results = searchEntities("jegou");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toMatchObject({ type: "author", path: "/authors/A-jegou" });
    });

    it("never returns an atlas-page hit, even when the query also matches one", () => {
        const results = searchEntities("harris");
        expect(results.every((r) => r.type === "author" || r.type === "paper")).toBe(true);
        expect(results.some((r) => r.path === "/atlas/harris-corner-detector")).toBe(false);
    });

    it("restricts to the requested type", () => {
        const results = searchEntities("harris", { types: ["author"] });
        expect(results.every((r) => r.type === "author")).toBe(true);
    });

    it("respects the limit option", () => {
        const results = searchEntities("harris", { limit: 0 });
        expect(results).toEqual([]);
    });

    it("includes authors/venue on a paper hit for display", () => {
        const [hit] = searchEntities("resnet", { types: ["paper"] });
        expect(hit.authors).toEqual(["K. He", "X. Zhang", "S. Ren", "J. Sun"]);
        expect(hit.venue).toBe("CVPR 2016");
    });
});
