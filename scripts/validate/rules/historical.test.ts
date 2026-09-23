import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { historicalRule } from "./historical.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("historicalRule", () => {
    it("passes a properly superseded historical page", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    quality: "historical",
                    sources: { primary: "known-paper" },
                    relations: [{ type: "generalized_by", target: "b", confidence: "high" }],
                }),
                algo("b.md"),
            ],
        });
        expect(historicalRule(ctx)).toEqual([]);
    });

    it("leaves unresolved relations[].target to the slugs rule (no duplicate report)", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    relations: [{ type: "compared_with", target: "ghost", confidence: "high" }],
                }),
            ],
        });
        expect(historicalRule(ctx)).toEqual([]);
    });

    it("flags a historical page with no generalized_by/high relation", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", { quality: "historical", sources: { primary: "known-paper" } }),
            ],
        });
        expect(historicalRule(ctx)).toEqual([
            {
                level: "error",
                message: '[a.md] quality: "historical" requires at least one relations[] entry with type: "generalized_by" and confidence: "high"',
            },
        ]);
    });
});
