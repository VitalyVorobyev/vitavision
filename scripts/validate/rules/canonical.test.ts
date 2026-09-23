import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { canonicalRule } from "./canonical.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}, content = "body text"): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content,
    };
}

describe("canonicalRule", () => {
    it("passes a well-formed canonical page", async () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    quality: "canonical",
                    prerequisites: ["b"],
                    sources: { primary: "known-paper" },
                }),
                algo("b.md"),
            ],
        });
        expect(await canonicalRule(ctx)).toEqual([]);
    });

    it("flags a canonical algorithm/model with no sources.primary", async () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", { quality: "canonical", prerequisites: ["b"] }),
                algo("b.md"),
            ],
        });
        expect(await canonicalRule(ctx)).toEqual([
            { level: "error", message: '[a.md] quality: "canonical" algorithm/model must have sources.primary' },
        ]);
    });

    it("flags a canonical page whose rendered HTML contains TODO", async () => {
        const ctx = createContext({
            algorithms: [
                algo(
                    "a.md",
                    { quality: "canonical", prerequisites: ["b"], sources: { primary: "known-paper" } },
                    "Still needs work. TODO: fill in the algorithm section.",
                ),
                algo("b.md"),
            ],
        });
        expect(await canonicalRule(ctx)).toEqual([
            { level: "error", message: '[a.md] quality: "canonical" but rendered HTML contains TODO' },
        ]);
    });
});
