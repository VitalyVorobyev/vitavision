import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { chronologyRule } from "./chronology.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("chronologyRule", () => {
    it("passes when a feeds_into target is at least as recent as the host", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    sources: { primary: "paper-a" },
                    relations: [{ type: "feeds_into", target: "b", confidence: "high" }],
                }),
                algo("b.md", { sources: { primary: "paper-b" } }),
            ],
            indexEntries: [
                { id: "paper-a", year: 2010 },
                { id: "paper-b", year: 2015 },
            ],
        });
        expect(chronologyRule(ctx)).toEqual([]);
    });

    it("errors when a feeds_into target predates the host", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    sources: { primary: "paper-a" },
                    relations: [{ type: "feeds_into", target: "b", confidence: "high" }],
                }),
                algo("b.md", { sources: { primary: "paper-b" } }),
            ],
            indexEntries: [
                { id: "paper-a", year: 2010 },
                { id: "paper-b", year: 2000 },
            ],
        });
        expect(chronologyRule(ctx)).toEqual([
            {
                level: "error",
                message: '[a.md] feeds_into target "b" (2000) predates host (2010) — feeds_into is an intellectual-lineage edge and must be chronological (see CLAUDE.md → Relations field)',
            },
        ]);
    });

    it("warns (does not error) when a generalized_by target predates the host", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    sources: { primary: "paper-a" },
                    relations: [{ type: "generalized_by", target: "b", confidence: "high" }],
                }),
                algo("b.md", { sources: { primary: "paper-b" } }),
            ],
            indexEntries: [
                { id: "paper-a", year: 2010 },
                { id: "paper-b", year: 2000 },
            ],
        });
        expect(chronologyRule(ctx)).toEqual([
            {
                level: "warning",
                message: '[a.md] generalized_by target "b" (2000) predates host (2010) — generalized_by is a lineage edge and the target is expected to be at least as recent as the host',
            },
        ]);
    });
});
