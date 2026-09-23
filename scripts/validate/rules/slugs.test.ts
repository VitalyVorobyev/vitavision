import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { slugsRule } from "./slugs.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("slugsRule", () => {
    it("passes when prerequisites/failureModes/relations all resolve", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    prerequisites: ["b"],
                    failureModes: ["b"],
                    relations: [{ type: "compared_with", target: "b", confidence: "high" }],
                }),
                algo("b.md"),
            ],
        });
        expect(slugsRule(ctx)).toEqual([]);
    });

    it("flags an unknown slug in prerequisites and in relations[].target", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", {
                    prerequisites: ["ghost"],
                    relations: [{ type: "compared_with", target: "ghost2", confidence: "high" }],
                }),
            ],
        });
        expect(slugsRule(ctx)).toEqual([
            { level: "error", message: '[a.md] unknown slug "ghost" in prerequisites' },
            { level: "error", message: '[a.md] unknown slug "ghost2" in relations[].target' },
        ]);
    });
});
