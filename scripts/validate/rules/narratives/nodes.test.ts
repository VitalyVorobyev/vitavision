import { describe, it, expect } from "vitest";
import { createContext } from "../../context.ts";
import { checkNodes } from "./nodes.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";
import type { MarkdownDirEntry } from "../../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("checkNodes", () => {
    it("resolves page/paper/question nodes cleanly", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "paper-a" } })],
            indexEntries: [
                { id: "paper-a", year: 1999 },
                { id: "p1", year: 2000 },
            ],
        });
        const fm: NarrativeFrontmatterShape = {
            areas: [{ id: "area1", label: "Area 1" }],
            nodes: [
                { id: "n1", page: "a", area: "area1" },
                { id: "n2", paper: "p1", area: "area1", label: "Paper One" },
                { id: "n3", question: "Why does this happen?", area: "area1" },
            ],
        };

        const result = checkNodes("narr.md", fm, ctx);

        expect(result.diagnostics).toEqual([
            { level: "warning", message: '[narr.md] page debt: node "n2" cites paper "p1" with no atlas page yet' },
        ]);
        expect(result.nodeIds).toEqual(new Set(["n1", "n2", "n3"]));
        expect(result.nodeYear.get("n1")).toBe(1999);
        expect(result.nodeYear.get("n2")).toBe(2000);
        expect(result.nodeSlug.get("n1")).toBe("a");
        expect(result.nodeSlug.has("n2")).toBe(false);
    });

    it("flags an area mismatch, an unresolved page, a year-derivation warning, and a duplicate id", () => {
        const ctx = createContext({});
        const fm: NarrativeFrontmatterShape = {
            areas: [{ id: "area1", label: "Area 1" }],
            nodes: [
                { id: "n1", page: "ghost", area: "wrong-area" },
                { id: "n1", question: "Duplicate id?", area: "area1" },
            ],
        };

        const result = checkNodes("narr.md", fm, ctx);

        expect(result.diagnostics).toEqual([
            { level: "error", message: '[narr.md] node "n1" area "wrong-area" is not a declared area id' },
            { level: "error", message: '[narr.md] node "n1" page "ghost" does not resolve to a known atlas page' },
            { level: "warning", message: '[narr.md] node "n1" has no derivable publication year' },
            { level: "error", message: '[narr.md] duplicate narrative node id "n1"' },
        ]);
    });
});
