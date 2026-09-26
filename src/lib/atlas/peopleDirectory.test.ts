import { describe, it, expect } from "vitest";
import {
    NOT_YET_CITED_DOMAIN,
    buildPeopleRows,
    computeDomainChips,
    sortPeopleRows,
    normalizeSearchText,
    matchesPeopleSearch,
    paperTitlesForAuthor,
    groupPeopleByDomain,
    domainLabel,
    type PeopleRow,
} from "./peopleDirectory.ts";
import type { ScholarlyIndex } from "./scholarlyTypes.ts";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import type { PapersById } from "./paperRefTypes.ts";

function scholarly(authors: ScholarlyIndex["authors"]): ScholarlyIndex {
    return {
        pages: {},
        papers: {},
        authors,
        coauthorPapers: {},
        network: { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    };
}

function authorsIndex(authors: AuthorsIndex["authors"]): AuthorsIndex {
    return { authors, paperAuthors: {}, pagesByPaper: {}, aliases: {}, coauthors: {} };
}

const SCHOLARLY = scholarly({
    kaiming: {
        firstYear: 2015,
        lastYear: 2021,
        pageCount: 22,
        primaryPages: [],
        domains: [
            { domain: "segmentation", count: 9 },
            { domain: "features", count: 2 },
        ],
        group: "recognition",
    },
    ross: {
        firstYear: 2010,
        lastYear: 2024,
        pageCount: 14,
        primaryPages: [],
        domains: [{ domain: "detection", count: 5 }],
        group: "recognition",
    },
    ghost: {
        // Reaches no Atlas page at all — falls into "Not yet cited".
        firstYear: 2020,
        lastYear: 2020,
        pageCount: 0,
        primaryPages: [],
        domains: [],
        group: "other",
    },
});

const AUTHORS = authorsIndex({
    kaiming: { name: "Kaiming He", orcid: "0000-0001", papers: ["p1", "p2"] },
    ross: { name: "Ross Girshick", papers: ["p3"] },
    ghost: { name: "Ghost Author", papers: ["p4"] },
});

const PAPERS: PapersById = {
    p1: { id: "p1", title: "Deep Residual Learning for Image Recognition", authors: ["Kaiming He"], year: 2016, venue: "CVPR", url: "" },
    p2: { id: "p2", title: "Mask R-CNN", authors: ["Kaiming He"], year: 2017, venue: "ICCV", url: "" },
    p3: { id: "p3", title: "Fast R-CNN", authors: ["Ross Girshick"], year: 2015, venue: "ICCV", url: "" },
    p4: { id: "p4", title: "An Unrelated Paper", authors: ["Ghost Author"], year: 2020, venue: "Workshop", url: "" },
};

describe("buildPeopleRows", () => {
    it("joins scholarly domain/page stats with author display fields", () => {
        const rows = buildPeopleRows(SCHOLARLY, AUTHORS);
        const kaiming = rows.find((r) => r.id === "kaiming")!;
        expect(kaiming.name).toBe("Kaiming He");
        expect(kaiming.orcid).toBe("0000-0001");
        expect(kaiming.papers).toBe(2);
        expect(kaiming.pages).toBe(22);
        expect(kaiming.domains).toEqual(["segmentation", "features"]);
        expect(kaiming.mainDomain).toBe("segmentation");
    });

    it("falls back to the sentinel domain for a person with no domains", () => {
        const rows = buildPeopleRows(SCHOLARLY, AUTHORS);
        const ghost = rows.find((r) => r.id === "ghost")!;
        expect(ghost.mainDomain).toBe(NOT_YET_CITED_DOMAIN);
        expect(ghost.orcid).toBeUndefined();
    });
});

describe("computeDomainChips", () => {
    const rows = buildPeopleRows(SCHOLARLY, AUTHORS);

    it("counts people by main domain, ties broken alphabetically by label", () => {
        const chips = computeDomainChips(rows);
        // segmentation and detection each have exactly one person here —
        // "Detection" sorts before "Segmentation".
        expect(chips[0]).toEqual({ domain: "detection", label: "Detection", count: 1 });
        expect(chips[1]).toEqual({ domain: "segmentation", label: "Segmentation", count: 1 });
    });

    it("always sorts the not-yet-cited sentinel last, even if it's the biggest group", () => {
        const bigGhost = scholarly({
            ...SCHOLARLY.authors,
            ghost2: { firstYear: 2021, lastYear: 2021, pageCount: 0, primaryPages: [], domains: [], group: "other" },
        });
        const chips = computeDomainChips(buildPeopleRows(bigGhost, AUTHORS));
        expect(chips.at(-1)!.domain).toBe(NOT_YET_CITED_DOMAIN);
        expect(chips.at(-1)!.label).toBe("Not yet cited");
    });
});

describe("sortPeopleRows", () => {
    const rows = buildPeopleRows(SCHOLARLY, AUTHORS);

    it("sorts by Atlas reach: pageCount desc, then papers desc", () => {
        const sorted = sortPeopleRows(rows, "reach");
        expect(sorted.map((r) => r.id)).toEqual(["kaiming", "ross", "ghost"]);
    });

    it("sorts by name using the surname-first key", () => {
        const sorted = sortPeopleRows(rows, "name");
        // "Author Ghost" < "Girshick Ross" < "He Kaiming" (surname-first keys)
        expect(sorted.map((r) => r.id)).toEqual(["ghost", "ross", "kaiming"]);
    });

    it("sorts by earliest paper year ascending", () => {
        const sorted = sortPeopleRows(rows, "earliest");
        expect(sorted.map((r) => r.id)).toEqual(["ross", "kaiming", "ghost"]);
    });

    it("never mutates the input array", () => {
        const copy = [...rows];
        sortPeopleRows(rows, "name");
        expect(rows).toEqual(copy);
    });
});

describe("normalizeSearchText / matchesPeopleSearch", () => {
    it("is diacritic-insensitive", () => {
        expect(normalizeSearchText("Hervé Jégou")).toBe("herve jegou");
    });

    it("matches on name", () => {
        const row = buildPeopleRows(SCHOLARLY, AUTHORS).find((r) => r.id === "kaiming")!;
        expect(matchesPeopleSearch(row, "kaiming", [])).toBe(true);
        expect(matchesPeopleSearch(row, "nobody", [])).toBe(false);
    });

    it("matches on a paper title", () => {
        const row = buildPeopleRows(SCHOLARLY, AUTHORS).find((r) => r.id === "kaiming")!;
        const titles = paperTitlesForAuthor("kaiming", AUTHORS, PAPERS);
        expect(matchesPeopleSearch(row, "mask r-cnn", titles)).toBe(true);
        expect(matchesPeopleSearch(row, "fast r-cnn", titles)).toBe(false);
    });

    it("an empty needle always matches", () => {
        const row = buildPeopleRows(SCHOLARLY, AUTHORS).find((r) => r.id === "kaiming")!;
        expect(matchesPeopleSearch(row, "", [])).toBe(true);
    });
});

describe("paperTitlesForAuthor", () => {
    it("returns titles for every paper credited to the author", () => {
        expect(paperTitlesForAuthor("ross", AUTHORS, PAPERS)).toEqual(["Fast R-CNN"]);
    });

    it("returns an empty array for an unknown author", () => {
        expect(paperTitlesForAuthor("nobody", AUTHORS, PAPERS)).toEqual([]);
    });
});

describe("groupPeopleByDomain", () => {
    it("groups rows by main domain in chip order, dropping empty domains", () => {
        const rows = sortPeopleRows(buildPeopleRows(SCHOLARLY, AUTHORS), "reach");
        const chips = computeDomainChips(rows);
        const groups = groupPeopleByDomain(rows, chips);
        expect(groups.map((g) => g.domain)).toEqual(["detection", "segmentation", NOT_YET_CITED_DOMAIN]);
        expect(groups.find((g) => g.domain === "segmentation")!.rows.map((r: PeopleRow) => r.id)).toEqual(["kaiming"]);
    });
});

describe("domainLabel", () => {
    it("labels the not-yet-cited sentinel and known domains", () => {
        expect(domainLabel(NOT_YET_CITED_DOMAIN)).toBe("Not yet cited");
        expect(domainLabel("segmentation")).toBe("Segmentation");
    });
});
