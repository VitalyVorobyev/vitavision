import { describe, it, expect } from "vitest";
import {
    paperYears,
    paperTitles,
    paperAuthorIds,
    paperRefRecords,
    sourceKeyMap,
} from "./papers-index.ts";
import type { RawIndexEntry } from "./papers-index.ts";

describe("paperYears", () => {
    it("collects year for kind:paper (and absent-kind) entries", () => {
        const entries: RawIndexEntry[] = [
            { id: "a", year: 2000 },
            { id: "b", kind: "paper", year: 2010 },
        ];
        expect(paperYears(entries)).toEqual(new Map([["a", 2000], ["b", 2010]]));
    });

    it("skips repo/doc entries and entries without a numeric year", () => {
        const entries: RawIndexEntry[] = [
            { id: "repo1", kind: "repo", year: 1999 },
            { id: "doc1", kind: "doc" },
            { id: "noyear" },
        ];
        expect(paperYears(entries)).toEqual(new Map());
    });

    it("skips entries with no id", () => {
        const entries = [{ year: 2020 } as unknown as RawIndexEntry];
        expect(paperYears(entries)).toEqual(new Map());
    });
});

describe("paperTitles", () => {
    it("falls back to id when title is absent", () => {
        const entries: RawIndexEntry[] = [{ id: "zhang2000" }];
        expect(paperTitles(entries)).toEqual(new Map([["zhang2000", "zhang2000"]]));
    });

    it("uses the title when present", () => {
        const entries: RawIndexEntry[] = [{ id: "zhang2000", title: "A Flexible New Technique" }];
        expect(paperTitles(entries)).toEqual(new Map([["zhang2000", "A Flexible New Technique"]]));
    });

    it("excludes repo/doc entries", () => {
        const entries: RawIndexEntry[] = [{ id: "r1", kind: "repo", title: "some repo" }];
        expect(paperTitles(entries)).toEqual(new Map());
    });
});

describe("paperAuthorIds", () => {
    it("includes only kind:paper entries with a non-empty authorIds", () => {
        const entries: RawIndexEntry[] = [
            { id: "p1", authorIds: ["A1", "A2"] },
            { id: "p2", authorIds: [] },
            { id: "p3" },
            { id: "r1", kind: "repo", authorIds: ["A9"] },
        ];
        expect(paperAuthorIds(entries)).toEqual([{ paperId: "p1", authorIds: ["A1", "A2"] }]);
    });
});

describe("paperRefRecords", () => {
    it("fills in display fallbacks for missing fields", () => {
        const entries: RawIndexEntry[] = [{ id: "p1" }];
        expect(paperRefRecords(entries)).toEqual([
            { id: "p1", title: "p1", authors: [], year: 0, venue: "", url: "" },
        ]);
    });

    it("passes through arxiv/doi only when present", () => {
        const entries: RawIndexEntry[] = [
            {
                id: "p1",
                title: "T",
                authors: ["A"],
                year: 2020,
                venue: "V",
                url: "https://example.com",
                arxiv: "2001.00001",
                doi: "10.1/x",
            },
        ];
        expect(paperRefRecords(entries)).toEqual([
            {
                id: "p1",
                title: "T",
                authors: ["A"],
                year: 2020,
                venue: "V",
                url: "https://example.com",
                arxiv: "2001.00001",
                doi: "10.1/x",
            },
        ]);
    });

    it("excludes repo/doc entries", () => {
        const entries: RawIndexEntry[] = [{ id: "r1", kind: "repo" }];
        expect(paperRefRecords(entries)).toEqual([]);
    });
});

describe("sourceKeyMap", () => {
    it("keys a paper entry as paper:<id>", () => {
        const errors: string[] = [];
        const map = sourceKeyMap([{ id: "zhang2000" }], errors);
        expect(map.has("paper:zhang2000")).toBe(true);
        expect(errors).toEqual([]);
    });

    it("keys a repo entry as repo:<repo>@<commit>", () => {
        const errors: string[] = [];
        const map = sourceKeyMap(
            [{ id: "r1", kind: "repo", repo: "https://github.com/foo/bar", commit: "abc1234" }],
            errors,
        );
        expect(map.has("repo:https://github.com/foo/bar@abc1234")).toBe(true);
        expect(errors).toEqual([]);
    });

    it("errors on a repo entry missing repo/commit", () => {
        const errors: string[] = [];
        const map = sourceKeyMap([{ id: "r1", kind: "repo" }], errors);
        expect(map.size).toBe(0);
        expect(errors).toEqual([
            '[index.yaml] entry id "r1" (kind: repo) must have "repo" and "commit" fields',
        ]);
    });

    it("keys a doc entry as doc:<path>", () => {
        const errors: string[] = [];
        const map = sourceKeyMap([{ id: "d1", kind: "doc", path: "docs/foo.md" }], errors);
        expect(map.has("doc:docs/foo.md")).toBe(true);
        expect(errors).toEqual([]);
    });

    it("errors on a doc entry missing path", () => {
        const errors: string[] = [];
        sourceKeyMap([{ id: "d1", kind: "doc" }], errors);
        expect(errors).toEqual([
            '[index.yaml] entry id "d1" (kind: doc) must have a "path" field',
        ]);
    });

    it("errors when a paper id starts with a reserved prefix", () => {
        const errors: string[] = [];
        const map = sourceKeyMap([{ id: "repo:foo" }], errors);
        expect(map.size).toBe(0);
        expect(errors).toEqual([
            '[index.yaml] entry id "repo:foo" must not start with reserved prefix "repo:" or "doc:"',
        ]);
    });

    it("skips entries with no id", () => {
        const errors: string[] = [];
        const map = sourceKeyMap([{} as unknown as RawIndexEntry], errors);
        expect(map.size).toBe(0);
        expect(errors).toEqual([]);
    });
});
