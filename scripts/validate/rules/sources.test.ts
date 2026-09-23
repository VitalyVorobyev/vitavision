import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { sourcesRule } from "./sources.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";
import type { RawIndexEntry } from "../../lib/papers-index.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

const knownPaper: RawIndexEntry = { id: "known-paper", year: 2000 };

describe("sourcesRule", () => {
    it("passes when sources.primary resolves in the papers index", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "known-paper" } })],
            indexEntries: [knownPaper],
        });
        expect(sourcesRule(ctx)).toEqual([]);
    });

    it("flags a sources.primary id that isn't in the papers index", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "missing-paper" } })],
            indexEntries: [knownPaper],
        });
        expect(sourcesRule(ctx)).toEqual([
            { level: "error", message: '[a.md] sources.primary "missing-paper" not found in docs/papers/index.yaml' },
        ]);
    });

    it("flags a malformed repo: ref", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "repo:not-a-url" } })],
        });
        expect(sourcesRule(ctx)).toEqual([
            {
                level: "error",
                message: '[a.md] sources.primary "repo:not-a-url" malformed (expected paper:<id> | repo:<url>@<7-40 hex> | doc:<path>)',
            },
        ]);
    });
});
