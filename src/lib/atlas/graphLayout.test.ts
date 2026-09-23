import { describe, expect, it } from "vitest";
import {
    GG,
    type ByRel,
    categorize,
    computeLayout,
    layoutBounds,
    resolveInitialSlug,
} from "./graphLayout";
import { algorithmPages } from "../../generated/content-index";
import { getNeighbors } from "./graphNeighbors";

function makeByRel(overrides: Partial<ByRel> = {}): ByRel {
    return {
        prerequisites:          [],
        extended_from:          [],
        compared_with:          [],
        extended_by:            [],
        feeds_into:             [],
        learned_by:             [],
        used_by:                [],
        fed_by:                 [],
        learned_alternative_of: [],
        ...overrides,
    };
}

describe("computeLayout", () => {
    it("assigns each relation to its documented lane (side)", () => {
        const layout = computeLayout(makeByRel({
            prerequisites: ["a"],
            extended_by:   ["b"],
            compared_with: ["c"],
            learned_by:    ["d"],
        }));

        const at = (slug: string) => layout.positions.find((p) => p.slug === slug)!;

        // West: prerequisites / extended_from / fed_by
        expect(at("a").rel).toBe("prerequisites");
        expect(at("a").x).toBe(GG.pad);

        // East: extended_by / feeds_into / used_by
        expect(at("b").rel).toBe("extended_by");
        expect(at("b").x).toBe(layout.canvasW - GG.pad - GG.nodeW);

        // North: compared_with
        expect(at("c").rel).toBe("compared_with");
        expect(at("c").y).toBe(GG.pad);

        // South: learned_by / learned_alternative_of
        expect(at("d").rel).toBe("learned_by");
        expect(at("d").y).toBe(layout.canvasH - GG.pad - GG.nodeH);
    });

    it("wraps the north row at 5 items", () => {
        const compared = Array.from({ length: 7 }, (_, i) => `n${i}`);
        const layout = computeLayout(makeByRel({ compared_with: compared }));
        const positions = compared.map((slug) => layout.positions.find((p) => p.slug === slug)!);

        const row0 = positions.slice(0, 5);
        const row1 = positions.slice(5);

        for (const p of row0) expect(p.y).toBe(GG.pad);
        for (const p of row1) expect(p.y).toBe(GG.pad + (GG.nodeH + GG.gap));
    });

    it("wraps the south row at 5 items symmetrically", () => {
        const learned = Array.from({ length: 6 }, (_, i) => `s${i}`);
        const layout = computeLayout(makeByRel({ learned_by: learned }));
        const positions = learned.map((slug) => layout.positions.find((p) => p.slug === slug)!);

        const row0 = positions.slice(0, 5);
        const row1 = positions.slice(5);

        for (const p of row0) expect(p.y).toBe(layout.canvasH - GG.pad - GG.nodeH);
        for (const p of row1) expect(p.y).toBe(layout.canvasH - GG.pad - GG.nodeH - (GG.nodeH + GG.gap));
    });

    it("grows canvas height as west/east stacks grow", () => {
        const small = computeLayout(makeByRel({ prerequisites: ["a"] }));
        const large = computeLayout(makeByRel({
            prerequisites: Array.from({ length: 10 }, (_, i) => `p${i}`),
        }));
        expect(large.canvasH).toBeGreaterThan(small.canvasH);
    });

    it("grows canvas width as the north row widens (up to the wrap point)", () => {
        const one  = computeLayout(makeByRel({ compared_with: ["a"] }));
        const five = computeLayout(makeByRel({ compared_with: ["a", "b", "c", "d", "e"] }));
        expect(five.canvasW).toBeGreaterThan(one.canvasW);
    });

    it("grows canvas height (not width) once the north row wraps past 5", () => {
        // Both counts wrap to a 5-wide north row (min(5, n)), so width is
        // identical; more rows still needs more vertical room.
        const twenty = computeLayout(makeByRel({
            compared_with: Array.from({ length: 20 }, (_, i) => `n${i}`),
        }));
        const thirty = computeLayout(makeByRel({
            compared_with: Array.from({ length: 30 }, (_, i) => `n${i}`),
        }));
        expect(thirty.canvasW).toBe(twenty.canvasW);
        expect(thirty.canvasH).toBeGreaterThan(twenty.canvasH);
    });

    it("never shrinks below the minimum canvas size for an empty ByRel", () => {
        const layout = computeLayout(makeByRel());
        expect(layout.canvasW).toBe(GG.canvasMinW);
        expect(layout.canvasH).toBe(GG.canvasMinH);
    });
});

describe("layoutBounds", () => {
    it("returns the bbox spanning the center box and every positioned node", () => {
        const layout = computeLayout(makeByRel({ prerequisites: ["a"], extended_by: ["b"] }));
        const bounds = layoutBounds(layout);

        let minX = layout.cx - GG.centerW / 2;
        let minY = layout.cy - GG.centerH / 2;
        let maxX = layout.cx + GG.centerW / 2;
        let maxY = layout.cy + GG.centerH / 2;
        for (const pos of layout.positions) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + GG.nodeW);
            maxY = Math.max(maxY, pos.y + GG.nodeH);
        }

        expect(bounds).toEqual({ minX, minY, maxX, maxY });
    });

    it("collapses to just the center box when there are no neighbors", () => {
        const layout = computeLayout(makeByRel());
        const bounds = layoutBounds(layout);
        expect(bounds).toEqual({
            minX: layout.cx - GG.centerW / 2,
            minY: layout.cy - GG.centerH / 2,
            maxX: layout.cx + GG.centerW / 2,
            maxY: layout.cy + GG.centerH / 2,
        });
    });
});

describe("categorize", () => {
    it("returns null for an unknown slug", () => {
        expect(categorize("does-not-exist")).toBeNull();
    });

    it("dedupes across every lane for a real slug (fpn)", () => {
        const cat = categorize("fpn");
        expect(cat).not.toBeNull();
        const all = [
            ...cat!.prerequisites,
            ...cat!.extended_from,
            ...cat!.compared_with,
            ...cat!.extended_by,
            ...cat!.feeds_into,
            ...cat!.learned_by,
            ...cat!.used_by,
            ...cat!.fed_by,
            ...cat!.learned_alternative_of,
        ];
        expect(new Set(all).size).toBe(all.length);
        // Every neighbor getNeighbors reports for this slug must survive categorize's
        // re-filter (all fpn neighbors are known, non-draft nodes).
        const neighbors = getNeighbors("fpn")!;
        const neighborTotal = [
            ...neighbors.prerequisites, ...neighbors.extended_from, ...neighbors.compared_with,
            ...neighbors.extended_by, ...neighbors.feeds_into, ...neighbors.learned_by,
            ...neighbors.used_by, ...neighbors.fed_by, ...neighbors.learned_alternative_of,
        ].length;
        expect(all.length).toBe(neighborTotal);
    });

    it("never includes the focus slug itself among its own neighbors", () => {
        const cat = categorize("fpn")!;
        const all = [
            ...cat.prerequisites, ...cat.extended_from, ...cat.compared_with,
            ...cat.extended_by, ...cat.feeds_into, ...cat.learned_by,
            ...cat.used_by, ...cat.fed_by, ...cat.learned_alternative_of,
        ];
        expect(all).not.toContain("fpn");
    });
});

describe("resolveInitialSlug", () => {
    it("returns the requested slug when it resolves to a valid graph node", () => {
        expect(resolveInitialSlug("fpn")).toBe("fpn");
    });

    it("falls back to the first published algorithm page when the slug is unknown", () => {
        const result = resolveInitialSlug("does-not-exist");
        expect(result).not.toBeNull();
        expect(algorithmPages.some((p) => p.slug === result)).toBe(true);
        expect(getNeighbors(result!)).not.toBeNull();
    });

    it("falls back the same way when no slug is given at all", () => {
        const result = resolveInitialSlug(undefined);
        expect(result).not.toBeNull();
        expect(algorithmPages.some((p) => p.slug === result)).toBe(true);
        expect(getNeighbors(result!)).not.toBeNull();
    });
});
