import { describe, expect, it } from "vitest";
import {
    NARRATIVE_EDGE_REL,
    NARRATIVE_NODE_H,
    NARRATIVE_NODE_W,
    areaColor,
    narrativeYearRange,
    scaleLensCoords,
    yearRulerTicks,
} from "./narrativeLayout.ts";
import { GRAPH_REL_COLOR_VAR } from "../graph/graphTheme.ts";
import type { NarrativeNode } from "../content/schema.ts";

describe("NARRATIVE_EDGE_REL", () => {
    it("maps every narrative edge type onto a defined --graph-rel-* token", () => {
        for (const rel of Object.values(NARRATIVE_EDGE_REL)) {
            expect(GRAPH_REL_COLOR_VAR[rel]).toBeDefined();
        }
    });

    it("uses the agreed token per edge type", () => {
        expect(NARRATIVE_EDGE_REL).toEqual({
            prerequisite: "prerequisites",
            evolution:    "extended_by",
            bridge:       "feeds_into",
            contrast:     "compared_with",
        });
    });
});

describe("scaleLensCoords", () => {
    it("returns an empty layout for an empty lens", () => {
        const l = scaleLensCoords({});
        expect(l.positions).toEqual({});
        expect(l.width).toBe(NARRATIVE_NODE_W);
        expect(l.height).toBe(NARRATIVE_NODE_H);
    });

    it("places a single node at the origin with a one-chip extent", () => {
        const l = scaleLensCoords({ a: [42, -7] });
        expect(l.positions.a).toEqual({ x: 0, y: 0 });
        expect(l.width).toBe(NARRATIVE_NODE_W);
        expect(l.height).toBe(NARRATIVE_NODE_H);
    });

    it("is translation-invariant: only coordinate differences matter", () => {
        const origin  = scaleLensCoords({ a: [0, 0], b: [1, 1] });
        const shifted = scaleLensCoords({ a: [10, -4], b: [11, -3] });
        expect(shifted.positions).toEqual(origin.positions);
        expect(shifted.width).toBe(origin.width);
        expect(shifted.height).toBe(origin.height);
    });

    it("maps one authored unit to one chip pitch on each axis", () => {
        const l = scaleLensCoords({ a: [0, 0], b: [1, 1] });
        expect(l.positions.b.x - l.positions.a.x).toBeGreaterThan(NARRATIVE_NODE_W);
        expect(l.positions.b.y - l.positions.a.y).toBeGreaterThan(NARRATIVE_NODE_H);
        const doubled = scaleLensCoords({ a: [0, 0], b: [2, 2] });
        expect(doubled.positions.b.x).toBe(2 * l.positions.b.x);
        expect(doubled.positions.b.y).toBe(2 * l.positions.b.y);
    });

    it("pushes overlapping same-row chips apart, preserving authored order", () => {
        const l = scaleLensCoords({ a: [6.0, 4], b: [6.1, 4], c: [6.2, 4], d: [6.6, 4] });
        const xs = ["a", "b", "c", "d"].map((id) => l.positions[id].x);
        for (let i = 1; i < xs.length; i++) {
            expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NARRATIVE_NODE_W);
        }
        expect(l.width).toBe(xs[3] + NARRATIVE_NODE_W);
    });

    it("does not collision-push chips that sit in different rows", () => {
        const l = scaleLensCoords({ a: [0, 0], b: [0.1, 1] });
        // Different rows: b keeps its authored near-zero x offset.
        expect(l.positions.b.x - l.positions.a.x).toBeLessThan(NARRATIVE_NODE_W);
    });

    it("spaces adjacent distinct columns by at least the chip width", () => {
        const l = scaleLensCoords({ a: [0, 0], b: [1, 0], c: [2, 0], d: [3, 0] });
        const xs = ["a", "b", "c", "d"].map((id) => l.positions[id].x);
        for (let i = 1; i < xs.length; i++) {
            expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NARRATIVE_NODE_W);
        }
        expect(l.width).toBe(xs[xs.length - 1] + NARRATIVE_NODE_W);
    });

    it("collapses an axis with no span to zero extent", () => {
        const l = scaleLensCoords({ a: [0, 5], b: [1, 5] });
        expect(l.positions.a.y).toBe(0);
        expect(l.positions.b.y).toBe(0);
        expect(l.height).toBe(NARRATIVE_NODE_H);
    });

    it("keeps unevenly spaced coordinates proportional", () => {
        const l = scaleLensCoords({ a: [0, 0], b: [1, 0], c: [4, 0] });
        const { a, b, c } = l.positions;
        expect(a.x).toBe(0);
        expect(b.x / c.x).toBeCloseTo(0.25, 6);
    });
});

describe("yearRulerTicks", () => {
    it("returns a single tick when the range is degenerate", () => {
        expect(yearRulerTicks(2020, 2020)).toEqual([2020]);
        expect(yearRulerTicks(2020, 2010)).toEqual([2020]);
    });

    it("uses a 1-year step for short ranges", () => {
        expect(yearRulerTicks(2018, 2022)).toEqual([2018, 2019, 2020, 2021, 2022]);
    });

    it("keeps the tick count within maxTicks for long ranges", () => {
        const ticks = yearRulerTicks(1960, 2025, 8);
        expect(ticks.length).toBeLessThanOrEqual(8);
        expect(ticks[0]).toBeGreaterThanOrEqual(1960);
        expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(2025);
    });

    it("snaps ticks to round multiples of the chosen step", () => {
        const ticks = yearRulerTicks(2013, 2024, 4);
        expect(ticks.every((t) => t % 5 === 0)).toBe(true);
    });
});

describe("narrativeYearRange", () => {
    const page = (id: string, year?: number): NarrativeNode => ({
        id, kind: "page", slug: id, title: id, pageKind: "concept",
        path: `/atlas/${id}`, area: "a", ...(year !== undefined ? { year } : {}),
    });

    it("returns null when no node carries a year", () => {
        expect(narrativeYearRange([page("x"), page("y")])).toBeNull();
    });

    it("ignores year-less nodes", () => {
        expect(narrativeYearRange([page("x", 2017), page("y"), page("z", 2023)]))
            .toEqual({ min: 2017, max: 2023 });
    });
});

describe("areaColor", () => {
    it("is stable per area and distinct across areas", () => {
        const areas = ["foundations", "architectures"];
        expect(areaColor(areas, "foundations")).toBe(areaColor(areas, "foundations"));
        expect(areaColor(areas, "foundations")).not.toBe(areaColor(areas, "architectures"));
    });

    it("falls back to the first hue for an unknown area", () => {
        expect(areaColor(["a", "b"], "missing")).toBe(areaColor(["a", "b"], "a"));
    });
});
