import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { authorsRule } from "./authors.ts";
import type { RawIndexEntry } from "../../lib/papers-index.ts";
import type { AuthorRecord } from "../../lib/authors.ts";

const author: AuthorRecord = { id: "A1", name: "A. Author" };
const coauthor: AuthorRecord = { id: "A2", name: "B. Coauthor" };

function paper(overrides: Partial<RawIndexEntry> = {}): RawIndexEntry {
    return { id: "some-paper", title: "T", year: 2020, authors: ["A. Author"], ...overrides };
}

describe("authorsRule", () => {
    it("passes when authorIds all resolve and counts match", () => {
        const ctx = createContext({
            indexEntries: [paper({ authors: ["A. Author", "B. Coauthor"], authorIds: ["A1", "A2"] })],
            authorRecords: [author, coauthor],
        });
        expect(authorsRule(ctx)).toEqual([]);
    });

    it("flags an authorIds entry not present in authors.yaml", () => {
        const ctx = createContext({
            indexEntries: [paper({ authors: ["A. Author", "B. Coauthor"], authorIds: ["A1", "A99"] })],
            authorRecords: [author],
        });
        expect(authorsRule(ctx)).toEqual([
            {
                level: "error",
                message: '[docs/papers/index.yaml] paper "some-paper" authorIds entry "A99" not found in docs/papers/authors.yaml',
            },
        ]);
    });

    it("warns when a paper has no authorIds", () => {
        const ctx = createContext({
            indexEntries: [paper()],
            authorRecords: [author],
        });
        expect(authorsRule(ctx)).toEqual([
            { level: "warning", message: '[docs/papers/index.yaml] paper "some-paper" has no authorIds' },
        ]);
    });

    it("does not warn about missing authorIds for a repo/doc entry", () => {
        const ctx = createContext({
            indexEntries: [{ id: "repo:https://example.com/x@1234567", kind: "repo", repo: "https://example.com/x", commit: "1234567" }],
            authorRecords: [],
        });
        expect(authorsRule(ctx)).toEqual([]);
    });

    it("warns when authorIds.length does not match authors.length, naming both counts", () => {
        const ctx = createContext({
            indexEntries: [paper({ authors: ["A. Author", "B. Coauthor"], authorIds: ["A1"] })],
            authorRecords: [author],
        });
        expect(authorsRule(ctx)).toEqual([
            {
                level: "warning",
                message: '[docs/papers/index.yaml] paper "some-paper" authorIds count (1) does not match authors count (2)',
            },
        ]);
    });

    it("flags a mergedInto target that does not exist", () => {
        const ctx = createContext({
            indexEntries: [],
            authorRecords: [{ id: "A1", name: "A. Author", mergedInto: "A99" }],
        });
        expect(authorsRule(ctx)).toEqual([
            {
                level: "error",
                message: '[docs/papers/authors.yaml] author "A1" mergedInto target "A99" does not exist in authors.yaml',
            },
        ]);
    });

    it("flags a mergedInto cycle exactly once", () => {
        const ctx = createContext({
            indexEntries: [],
            authorRecords: [
                { id: "A1", name: "A. Author", mergedInto: "A2" },
                { id: "A2", name: "B. Coauthor", mergedInto: "A1" },
            ],
        });
        const diags = authorsRule(ctx);
        expect(diags).toHaveLength(1);
        expect(diags[0].level).toBe("error");
        expect(diags[0].message).toMatch(/mergedInto cycle detected/);
    });

    it("passes for a normal (non-cyclic) mergedInto chain", () => {
        const ctx = createContext({
            indexEntries: [],
            authorRecords: [
                { id: "A1", name: "A. Author", mergedInto: "A2" },
                { id: "A2", name: "A. Author Canonical" },
            ],
        });
        expect(authorsRule(ctx)).toEqual([]);
    });
});
