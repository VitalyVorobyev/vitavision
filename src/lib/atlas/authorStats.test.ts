import { describe, expect, it } from "vitest";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import {
    atlasSlugsForPapers,
    authorInitial,
    authorSortKey,
    buildAuthorRows,
    coAuthorsOf,
    compareByName,
    compareByPaperCount,
    groupByInitial,
} from "./authorStats.ts";

const index: AuthorsIndex = {
    authors: {
        A1: { name: "Kaiming He", orcid: "0000-0001-0000-0001", papers: ["p1", "p2"] },
        A2: { name: "Jian Sun", papers: ["p1", "p2", "p3"] },
        A3: { name: "Dániel Baráth", papers: ["p3"] },
        A4: { name: "Мария Иванова", papers: ["p2"] },
    },
    paperAuthors: {
        p1: ["A1", "A2"],
        p2: ["A1", "A2", "A4"],
        p3: ["A2", "A3"],
    },
    // p1 and p2 are both cited by `resnet`, so the union must dedupe.
    pagesByPaper: { p1: ["resnet"], p2: ["resnet", "faster-rcnn"], p3: [] },
};

describe("authorSortKey", () => {
    it("puts the surname first and strips diacritics", () => {
        expect(authorSortKey("Kaiming He")).toBe("he kaiming");
        expect(authorSortKey("Dániel Baráth")).toBe("barath daniel");
    });

    it("handles a single-token name without emitting a trailing space", () => {
        expect(authorSortKey("Plato")).toBe("plato");
    });

    it("sorts by surname, not by given name", () => {
        const rows = buildAuthorRows(index).sort(compareByName);
        expect(rows.map((r) => r.name)).toEqual([
            "Dániel Baráth", // barath
            "Kaiming He", // he
            "Jian Sun", // sun
            "Мария Иванова", // non-Latin sorts last
        ]);
    });
});

describe("authorInitial", () => {
    it("uses the surname initial and buckets non-Latin under #", () => {
        expect(authorInitial("Kaiming He")).toBe("H");
        expect(authorInitial("Dániel Baráth")).toBe("B");
        expect(authorInitial("Мария Иванова")).toBe("#");
    });
});

describe("atlasSlugsForPapers", () => {
    it("dedupes and sorts the union of pages across the author's papers", () => {
        expect(atlasSlugsForPapers(["p1", "p2"], index.pagesByPaper)).toEqual(["faster-rcnn", "resnet"]);
    });

    it("ignores papers no page cites", () => {
        expect(atlasSlugsForPapers(["p3", "unknown"], index.pagesByPaper)).toEqual([]);
    });
});

describe("buildAuthorRows", () => {
    it("counts papers and the deduped union of atlas pages", () => {
        const rows = buildAuthorRows(index);
        const he = rows.find((r) => r.id === "A1")!;
        expect(he).toMatchObject({ paperCount: 2, pageCount: 2, orcid: "0000-0001-0000-0001" });
        const barath = rows.find((r) => r.id === "A3")!;
        expect(barath.pageCount).toBe(0);
        expect(barath.orcid).toBeUndefined();
    });
});

describe("compareByPaperCount", () => {
    it("orders by paper count desc, falling back to A–Z", () => {
        const rows = buildAuthorRows(index).sort(compareByPaperCount);
        expect(rows.map((r) => r.name)).toEqual([
            "Jian Sun", // 3
            "Kaiming He", // 2
            "Dániel Baráth", // 1, barath < ивaнова
            "Мария Иванова", // 1
        ]);
    });
});

describe("coAuthorsOf", () => {
    it("aggregates shared-paper counts and excludes the author themselves", () => {
        expect(coAuthorsOf("A1", index)).toEqual([
            { id: "A2", name: "Jian Sun", shared: 2 },
            { id: "A4", name: "Мария Иванова", shared: 1 },
        ]);
    });

    it("returns an empty list for an unknown author", () => {
        expect(coAuthorsOf("nope", index)).toEqual([]);
    });
});

describe("groupByInitial", () => {
    it("splits name-ordered rows into contiguous initial groups", () => {
        const groups = groupByInitial(buildAuthorRows(index).sort(compareByName));
        expect(groups.map((g) => g.letter)).toEqual(["B", "H", "S", "#"]);
        expect(groups[0].rows.map((r) => r.name)).toEqual(["Dániel Baráth"]);
    });
});
