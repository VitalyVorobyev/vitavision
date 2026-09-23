import { describe, it, expect } from "vitest";
import {
    buildPaperRows,
    filterPaperRows,
    sortPaperRows,
    normalizeSearchText,
    matchesPaperSearch,
    decadeOf,
    groupPapersByDecade,
} from "./papersDirectory.ts";
import type { PapersById } from "./paperRefTypes.ts";
import type { ScholarlyIndex } from "./scholarlyTypes.ts";

function scholarly(papers: ScholarlyIndex["papers"], pages: ScholarlyIndex["pages"] = {}): ScholarlyIndex {
    return {
        pages,
        papers,
        authors: {},
        coauthorPapers: {},
        network: { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    };
}

const PAPERS: PapersById = {
    resnet: { id: "resnet", title: "Deep Residual Learning for Image Recognition", authors: ["Kaiming He", "Xiangyu Zhang"], year: 2016, venue: "CVPR", url: "" },
    vit: { id: "vit", title: "An Image is Worth 16x16 Words", authors: ["Alexey Dosovitskiy"], year: 2020, venue: "ICLR", url: "" },
    sift: { id: "sift", title: "Distinctive Image Features from Scale-Invariant Keypoints", authors: ["David Lowe"], year: 2004, venue: "IJCV", url: "" },
    fast: { id: "fast", title: "Machine Learning for High-Speed Corner Detection", authors: ["Edward Rosten"], year: 2006, venue: "ECCV", url: "" },
};

const SCHOLARLY = scholarly(
    {
        resnet: { primaryPages: ["resnet-page"], citingPages: ["a", "b"], cites: [], citedBy: Array.from({ length: 15 }, (_, i) => `c${i}`), narratives: [] },
        vit: { primaryPages: ["vit-page"], citingPages: [], cites: [], citedBy: ["c1"], narratives: [] },
        sift: { primaryPages: [], citingPages: ["a"], cites: [], citedBy: ["c1", "c2"], narratives: [] },
        // fast: no scholarly entry at all — never cited/citing.
    },
    {
        "resnet-page": { title: "ResNet", kind: "model" },
        "vit-page": { title: "ViT", kind: "model" },
    },
);

describe("buildPaperRows", () => {
    const rows = buildPaperRows(PAPERS, SCHOLARLY);

    it("marks hasPage true only when a primary page exists", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        const sift = rows.find((r) => r.id === "sift")!;
        expect(resnet.hasPage).toBe(true);
        expect(resnet.primaryPages).toEqual([{ slug: "resnet-page", title: "ResNet", kind: "model" }]);
        expect(sift.hasPage).toBe(false);
        expect(sift.primaryPages).toEqual([]);
    });

    it("defaults citation counts to zero for a paper absent from the scholarly index", () => {
        const fast = rows.find((r) => r.id === "fast")!;
        expect(fast.citedByCount).toBe(0);
        expect(fast.citingPageCount).toBe(0);
        expect(fast.hasPage).toBe(false);
    });

    it("carries citedBy/citing counts through from the scholarly index", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(resnet.citedByCount).toBe(15);
        expect(resnet.citingPageCount).toBe(2);
    });

    it("builds a short author byline", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(resnet.authorsShort).toBe("He, Zhang");
    });

    it("works with no scholarly index at all (undefined)", () => {
        const rows2 = buildPaperRows(PAPERS, undefined);
        expect(rows2.every((r) => r.citedByCount === 0 && !r.hasPage)).toBe(true);
    });
});

describe("filterPaperRows", () => {
    const rows = buildPaperRows(PAPERS, SCHOLARLY);

    it("'all' returns everything", () => {
        expect(filterPaperRows(rows, "all")).toHaveLength(4);
    });

    it("'has-page' keeps only papers with a primary page", () => {
        expect(filterPaperRows(rows, "has-page").map((r) => r.id).sort()).toEqual(["resnet", "vit"]);
    });

    it("'no-page' keeps only papers without one", () => {
        expect(filterPaperRows(rows, "no-page").map((r) => r.id).sort()).toEqual(["fast", "sift"]);
    });
});

describe("sortPaperRows", () => {
    const rows = buildPaperRows(PAPERS, SCHOLARLY);

    it("'citedBy' sorts by registry citedBy count desc", () => {
        expect(sortPaperRows(rows, "citedBy").map((r) => r.id)).toEqual(["resnet", "sift", "vit", "fast"]);
    });

    it("'newest' sorts by year desc", () => {
        expect(sortPaperRows(rows, "newest").map((r) => r.id)).toEqual(["vit", "resnet", "fast", "sift"]);
    });

    it("'oldest' sorts by year asc", () => {
        expect(sortPaperRows(rows, "oldest").map((r) => r.id)).toEqual(["sift", "fast", "resnet", "vit"]);
    });

    it("never mutates the input", () => {
        const copy = [...rows];
        sortPaperRows(rows, "newest");
        expect(rows).toEqual(copy);
    });
});

describe("normalizeSearchText / matchesPaperSearch", () => {
    const rows = buildPaperRows(PAPERS, SCHOLARLY);

    it("matches on title", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(matchesPaperSearch(resnet, normalizeSearchText("residual"))).toBe(true);
    });

    it("matches on venue", () => {
        const vit = rows.find((r) => r.id === "vit")!;
        expect(matchesPaperSearch(vit, normalizeSearchText("iclr"))).toBe(true);
    });

    it("matches on an author name", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(matchesPaperSearch(resnet, normalizeSearchText("zhang"))).toBe(true);
    });

    it("an empty needle always matches", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(matchesPaperSearch(resnet, "")).toBe(true);
    });

    it("no match returns false", () => {
        const resnet = rows.find((r) => r.id === "resnet")!;
        expect(matchesPaperSearch(resnet, normalizeSearchText("nonexistent"))).toBe(false);
    });
});

describe("decadeOf / groupPapersByDecade", () => {
    it("floors a year to its decade", () => {
        expect(decadeOf(2016)).toBe(2010);
        expect(decadeOf(2020)).toBe(2020);
        expect(decadeOf(2004)).toBe(2000);
    });

    it("groups rows by decade, newest decade first", () => {
        const rows = buildPaperRows(PAPERS, SCHOLARLY);
        const groups = groupPapersByDecade(rows);
        expect(groups.map((g) => g.label)).toEqual(["2020s", "2010s", "2000s"]);
        expect(groups[0].rows.map((r) => r.id)).toEqual(["vit"]);
        expect(groups[2].rows.map((r) => r.id).sort()).toEqual(["fast", "sift"]);
    });
});
