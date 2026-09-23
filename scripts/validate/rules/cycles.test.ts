import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { cyclesRule } from "./cycles.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("cyclesRule", () => {
    it("passes for an acyclic prerequisite graph", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { prerequisites: ["b"] }), algo("b.md")],
        });
        expect(cyclesRule(ctx)).toEqual([]);
    });

    it("flags a prerequisite cycle", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", { prerequisites: ["b"] }),
                algo("b.md", { prerequisites: ["a"] }),
            ],
        });
        expect(cyclesRule(ctx)).toEqual([
            { level: "error", message: "[prerequisite cycle] a → b → a" },
        ]);
    });
});
