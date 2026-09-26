import { describe, it, expect } from "vitest";
import {
    normalizeSourceId,
    buildPagesByPaper,
    buildAuthorsIndex,
    buildCoauthors,
} from "./authors-build.ts";
import type { PageSourcesEntry, AuthorRecord } from "./authors-build.ts";

describe("normalizeSourceId", () => {
    it("passes a bare id through unchanged", () => {
        expect(normalizeSourceId("zhang2000")).toBe("zhang2000");
    });

    it("strips a paper: prefix", () => {
        expect(normalizeSourceId("paper:zhang2000")).toBe("zhang2000");
    });

    it("ignores repo: refs", () => {
        expect(normalizeSourceId("repo:https://github.com/foo/bar@abc1234")).toBeUndefined();
    });

    it("ignores doc: refs", () => {
        expect(normalizeSourceId("doc:docs/some-note.md")).toBeUndefined();
    });
});

describe("buildPagesByPaper", () => {
    it("maps a paper id referenced by sources.primary to the citing slug", () => {
        const pages: PageSourcesEntry[] = [
            { slug: "chess-corners", sources: { primary: "paper:duda1972" } },
        ];
        expect(buildPagesByPaper(pages)).toEqual({ duda1972: ["chess-corners"] });
    });

    it("maps a paper id referenced by sources.references too", () => {
        const pages: PageSourcesEntry[] = [
            { slug: "zhang-planar-calibration", sources: { primary: "zhang2000", references: ["tsai1987"] } },
        ];
        expect(buildPagesByPaper(pages)).toEqual({
            zhang2000: ["zhang-planar-calibration"],
            tsai1987: ["zhang-planar-calibration"],
        });
    });

    it("collects multiple citing slugs per paper, sorted", () => {
        const pages: PageSourcesEntry[] = [
            { slug: "orb", sources: { primary: "fast-corner-detector" } },
            { slug: "brief", sources: { primary: "fast-corner-detector" } },
        ];
        expect(buildPagesByPaper(pages)).toEqual({
            "fast-corner-detector": ["brief", "orb"],
        });
    });

    it("de-duplicates a slug that references the same paper via primary and references", () => {
        const pages: PageSourcesEntry[] = [
            { slug: "orb", sources: { primary: "fast-corner-detector", references: ["fast-corner-detector"] } },
        ];
        expect(buildPagesByPaper(pages)).toEqual({
            "fast-corner-detector": ["orb"],
        });
    });

    it("ignores repo:/doc: refs and pages with no sources", () => {
        const pages: PageSourcesEntry[] = [
            { slug: "no-sources" },
            { slug: "repo-only", sources: { primary: "repo:https://github.com/foo/bar@abc1234" } },
            { slug: "doc-ref", sources: { primary: "some-paper", references: ["doc:docs/note.md"] } },
        ];
        expect(buildPagesByPaper(pages)).toEqual({ "some-paper": ["doc-ref"] });
    });

    it("returns an empty object for empty input", () => {
        expect(buildPagesByPaper([])).toEqual({});
    });
});

describe("buildAuthorsIndex", () => {
    it("returns an all-empty index when there is no authors.yaml and no authorIds", () => {
        const index = buildAuthorsIndex([], [], {});
        expect(index).toEqual({
            authors: {},
            paperAuthors: {},
            pagesByPaper: {},
            aliases: {},
            coauthors: {},
        });
    });

    it("assembles authors, paperAuthors, and passes pagesByPaper through unchanged", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A1", name: "Zhengyou Zhang", orcid: "0000-0001-2345-6789" },
            { id: "A2", name: "Roger Tsai" },
        ];
        const paperAuthorIds = [
            { paperId: "zhang2000", authorIds: ["A1"] },
            { paperId: "tsai1987", authorIds: ["A2"] },
        ];
        const pagesByPaper = { zhang2000: ["zhang-planar-calibration"] };

        const index = buildAuthorsIndex(authorRecords, paperAuthorIds, pagesByPaper);

        expect(index.pagesByPaper).toBe(pagesByPaper);
        expect(index.paperAuthors).toEqual({
            zhang2000: ["A1"],
            tsai1987: ["A2"],
        });
        expect(index.authors.A1).toEqual({
            name: "Zhengyou Zhang",
            orcid: "0000-0001-2345-6789",
            papers: ["zhang2000"],
        });
        expect(index.authors.A2).toEqual({ name: "Roger Tsai", papers: ["tsai1987"] });
    });

    it("falls back to the raw author id as the name when no authors.yaml record exists", () => {
        const index = buildAuthorsIndex([], [{ paperId: "p1", authorIds: ["A99"] }], {});
        expect(index.authors.A99).toEqual({ name: "A99", papers: ["p1"] });
    });

    it("aggregates multiple papers for the same author, sorted", () => {
        const authorRecords: AuthorRecord[] = [{ id: "A1", name: "Someone" }];
        const paperAuthorIds = [
            { paperId: "p2", authorIds: ["A1"] },
            { paperId: "p1", authorIds: ["A1"] },
        ];
        const index = buildAuthorsIndex(authorRecords, paperAuthorIds, {});
        expect(index.authors.A1.papers).toEqual(["p1", "p2"]);
    });

    it("omits orcid entirely when the author record has none", () => {
        const index = buildAuthorsIndex(
            [{ id: "A1", name: "No Orcid" }],
            [{ paperId: "p1", authorIds: ["A1"] }],
            {},
        );
        expect(index.authors.A1).not.toHaveProperty("orcid");
    });

    it("resolves a mergedInto alias in both paperAuthors and authors", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A-old", name: "Old Name", mergedInto: "A-canon" },
            { id: "A-canon", name: "Canonical Name", orcid: "0000-0001-0000-0002" },
        ];
        const index = buildAuthorsIndex(
            authorRecords,
            [{ paperId: "p1", authorIds: ["A-old"] }],
            {},
        );
        expect(index.paperAuthors.p1).toEqual(["A-canon"]);
        expect(index.authors).not.toHaveProperty("A-old");
        expect(index.authors["A-canon"]).toEqual({
            name: "Canonical Name",
            orcid: "0000-0001-0000-0002",
            papers: ["p1"],
        });
        expect(index.aliases).toEqual({ "A-old": "A-canon" });
    });

    it("dedupes two aliases of the same canonical id within one paper", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A-old1", name: "Old One", mergedInto: "A-canon" },
            { id: "A-old2", name: "Old Two", mergedInto: "A-canon" },
            { id: "A-canon", name: "Canonical" },
        ];
        const index = buildAuthorsIndex(
            authorRecords,
            [{ paperId: "p1", authorIds: ["A-old1", "A-old2", "A-canon"] }],
            {},
        );
        expect(index.paperAuthors.p1).toEqual(["A-canon"]);
        expect(index.authors["A-canon"].papers).toEqual(["p1"]);
        expect(Object.keys(index.authors)).toEqual(["A-canon"]);
    });

    it("uses the canonical record's name/orcid even when the paper only lists the alias id", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A-old", name: "Stale Name", mergedInto: "A-canon" },
            { id: "A-canon", name: "Fresh Name", orcid: "0000-0001-0000-0003" },
        ];
        const index = buildAuthorsIndex(
            authorRecords,
            [{ paperId: "p1", authorIds: ["A-old"] }],
            {},
        );
        expect(index.authors["A-canon"].name).toBe("Fresh Name");
        expect(index.authors["A-canon"].orcid).toBe("0000-0001-0000-0003");
    });

    it("flattens a chain of aliases to the final canonical id", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A-a", name: "A", mergedInto: "A-b" },
            { id: "A-b", name: "B", mergedInto: "A-c" },
            { id: "A-c", name: "C" },
        ];
        const index = buildAuthorsIndex(
            authorRecords,
            [{ paperId: "p1", authorIds: ["A-a"] }],
            {},
        );
        expect(index.aliases).toEqual({ "A-a": "A-c", "A-b": "A-c" });
        expect(index.paperAuthors.p1).toEqual(["A-c"]);
    });

    it("terminates on a cyclic mergedInto chain instead of looping forever", () => {
        const authorRecords: AuthorRecord[] = [
            { id: "A-x", name: "X", mergedInto: "A-y" },
            { id: "A-y", name: "Y", mergedInto: "A-x" },
        ];
        const index = buildAuthorsIndex(
            authorRecords,
            [{ paperId: "p1", authorIds: ["A-x", "A-y"] }],
            {},
        );
        // Cycle detected — resolution stops rather than hanging; the exact
        // landing id is an implementation detail, but it must be stable and
        // every paper author id must resolve to a single canonical id.
        expect(index.paperAuthors.p1).toHaveLength(1);
    });
});

describe("buildCoauthors", () => {
    it("produces symmetric counts for every pair on a 3-author paper", () => {
        const coauthors = buildCoauthors([{ paperId: "p1", authorIds: ["A1", "A2", "A3"] }]);
        expect(coauthors).toEqual({
            A1: { A2: 1, A3: 1 },
            A2: { A1: 1, A3: 1 },
            A3: { A1: 1, A2: 1 },
        });
    });

    it("accumulates counts across multiple shared papers", () => {
        const coauthors = buildCoauthors([
            { paperId: "p1", authorIds: ["A1", "A2"] },
            { paperId: "p2", authorIds: ["A1", "A2"] },
        ]);
        expect(coauthors).toEqual({
            A1: { A2: 2 },
            A2: { A1: 2 },
        });
    });

    it("contributes no pairs for a solo-authored paper", () => {
        const coauthors = buildCoauthors([{ paperId: "p1", authorIds: ["A1"] }]);
        expect(coauthors).toEqual({});
    });
});
