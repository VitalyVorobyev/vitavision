import { describe, expect, it } from "vitest";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import { authorSortKey, coAuthorsOf } from "./authorStats.ts";

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
    aliases: {},
    coauthors: {
        A1: { A2: 2, A4: 1 },
        A2: { A1: 2, A3: 1, A4: 1 },
        A3: { A2: 1 },
        A4: { A1: 1, A2: 1 },
    },
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
        const names = Object.values(index.authors).map((a) => a.name);
        names.sort((a, b) => authorSortKey(a).localeCompare(authorSortKey(b)));
        expect(names).toEqual([
            "Dániel Baráth", // barath
            "Kaiming He", // he
            "Jian Sun", // sun
            "Мария Иванова", // non-Latin sorts last
        ]);
    });
});

const coauthorPapers: Record<string, Record<string, string[]>> = {
    A1: { A2: ["p1", "p2"], A4: ["p2"] },
    A2: { A1: ["p1", "p2"], A3: ["p3"], A4: ["p2"] },
    A3: { A2: ["p3"] },
    A4: { A1: ["p2"], A2: ["p2"] },
};

describe("coAuthorsOf", () => {
    it("aggregates shared-paper counts and resolves shared paper ids from coauthorPapers", () => {
        expect(coAuthorsOf("A1", index, coauthorPapers)).toEqual([
            { id: "A2", name: "Jian Sun", shared: 2, sharedPaperIds: ["p1", "p2"] },
            { id: "A4", name: "Мария Иванова", shared: 1, sharedPaperIds: ["p2"] },
        ]);
    });

    it("returns an empty list for an unknown author", () => {
        expect(coAuthorsOf("nope", index, coauthorPapers)).toEqual([]);
    });

    it("defaults to an empty shared-paper list when coauthorPapers has no row for the pair", () => {
        expect(coAuthorsOf("A1", index, {})).toEqual([
            { id: "A2", name: "Jian Sun", shared: 2, sharedPaperIds: [] },
            { id: "A4", name: "Мария Иванова", shared: 1, sharedPaperIds: [] },
        ]);
    });
});
