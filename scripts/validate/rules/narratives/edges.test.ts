import { describe, it, expect } from "vitest";
import { createContext } from "../../context.ts";
import { checkEdges } from "./edges.ts";
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

describe("checkEdges", () => {
    it("passes a plain edge between two known nodes", () => {
        const ctx = createContext({});
        const fm: NarrativeFrontmatterShape = { edges: [{ from: "n1", to: "n2", type: "prerequisite" }] };
        const nodeIds = new Set(["n1", "n2"]);
        expect(checkEdges("narr.md", fm, nodeIds, new Map(), new Map(), ctx)).toEqual([]);
    });

    it("flags a self-edge and both unknown endpoints", () => {
        const ctx = createContext({});
        const fm: NarrativeFrontmatterShape = { edges: [{ from: "x", to: "x", type: "bridge" }] };
        const result = checkEdges("narr.md", fm, new Set(), new Map(), new Map(), ctx);
        expect(result).toEqual([
            { level: "error", message: '[narr.md] self-edge on node "x"' },
            { level: "error", message: '[narr.md] edge references unknown node "x" (from)' },
            { level: "error", message: '[narr.md] edge references unknown node "x" (to)' },
        ]);
    });

    it("flags an evolution edge that violates chronology", () => {
        const ctx = createContext({});
        const fm: NarrativeFrontmatterShape = { edges: [{ from: "n1", to: "n2", type: "evolution" }] };
        const nodeIds = new Set(["n1", "n2"]);
        const nodeYear = new Map([["n1", 2020], ["n2", 2010]]);
        expect(checkEdges("narr.md", fm, nodeIds, nodeYear, new Map(), ctx)).toEqual([
            { level: "error", message: "[narr.md] evolution edge n1 → n2 violates chronology (2020 > 2010)" },
        ]);
    });

    it("warns when a contrast edge crosses an Atlas lineage relation", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", { relations: [{ type: "generalized_by", target: "b", confidence: "high" }] }),
                algo("b.md"),
            ],
        });
        const fm: NarrativeFrontmatterShape = { edges: [{ from: "n1", to: "n2", type: "contrast" }] };
        const nodeIds = new Set(["n1", "n2"]);
        const nodeSlug = new Map([["n1", "a"], ["n2", "b"]]);
        expect(checkEdges("narr.md", fm, nodeIds, new Map(), nodeSlug, ctx)).toEqual([
            {
                level: "warning",
                message: '[narr.md] contrast edge n1 → n2 over a lineage relation (Atlas: "a" generalized_by "b")',
            },
        ]);
    });

    it("warns when an evolution edge runs against Atlas lineage direction", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md"),
                algo("b.md", { relations: [{ type: "feeds_into", target: "a", confidence: "high" }] }),
            ],
        });
        const fm: NarrativeFrontmatterShape = { edges: [{ from: "n1", to: "n2", type: "evolution" }] };
        const nodeIds = new Set(["n1", "n2"]);
        const nodeSlug = new Map([["n1", "a"], ["n2", "b"]]);
        expect(checkEdges("narr.md", fm, nodeIds, new Map(), nodeSlug, ctx)).toEqual([
            {
                level: "warning",
                message: '[narr.md] evolution edge n1 → n2 runs against Atlas lineage direction (Atlas: "b" feeds_into "a")',
            },
        ]);
    });
});
