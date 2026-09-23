import { describe, it, expect } from "vitest";
import { checkLenses } from "./lenses.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

describe("checkLenses", () => {
    it("passes an overview lens covering all nodes with no order inversions", () => {
        const fm: NarrativeFrontmatterShape = {
            lenses: [{ id: "overview", coords: { n1: [0, 0], n2: [1, 1] } }],
        };
        const nodeIds = new Set(["n1", "n2"]);
        const nodeYear = new Map([["n1", 2000], ["n2", 2010]]);
        expect(checkLenses("narr.md", fm, nodeIds, nodeYear)).toEqual([]);
    });

    it("flags a missing overview lens", () => {
        const fm: NarrativeFrontmatterShape = { lenses: [] };
        const nodeIds = new Set(["n1"]);
        expect(checkLenses("narr.md", fm, nodeIds, new Map())).toEqual([
            { level: "error", message: '[narr.md] narrative requires a lens with id "overview" covering all nodes' },
        ]);
    });

    it("warns on an x-order inversion of >= 2 years between node pairs", () => {
        const fm: NarrativeFrontmatterShape = {
            lenses: [{ id: "overview", coords: { n1: [1, 0], n2: [0, 0] } }],
        };
        const nodeIds = new Set(["n1", "n2"]);
        const nodeYear = new Map([["n1", 2000], ["n2", 2010]]);
        expect(checkLenses("narr.md", fm, nodeIds, nodeYear)).toEqual([
            {
                level: "warning",
                message: '[narr.md] lens "overview" x-order inversion between "n1" and "n2" (>= 2 years apart)',
            },
        ]);
    });
});
