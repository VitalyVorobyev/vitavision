import { describe, expect, it } from "vitest";
import { computeLineageLayout } from "./lineage.ts";

describe("computeLineageLayout", () => {
    it("stacks multiple dots sharing a year, nearest-to-axis first", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [],
            citedBy: [
                { id: "a", year: 2020 },
                { id: "b", year: 2020 },
                { id: "c", year: 2020 },
            ],
            width: 720,
        });

        expect(layout.citedBy).toHaveLength(3);
        const [a, b, c] = layout.citedBy;
        // Same x (same year), increasing distance from the axis.
        expect(a.x).toBe(b.x);
        expect(b.x).toBe(c.x);
        expect(a.stackIndex).toBe(0);
        expect(b.stackIndex).toBe(1);
        expect(c.stackIndex).toBe(2);
        // Above the axis: y decreases (moves further from axisY) with stack index.
        expect(a.y).toBeGreaterThan(b.y);
        expect(b.y).toBeGreaterThan(c.y);
        expect(a.y).toBeLessThan(layout.axisY);
    });

    it("stacks cites below the axis, increasing y (away from the axis) with stack index", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [
                { id: "x", year: 2015 },
                { id: "y", year: 2015 },
            ],
            citedBy: [],
            width: 720,
        });

        const [x, y] = layout.cites;
        expect(x.y).toBeLessThan(y.y);
        expect(x.y).toBeGreaterThan(layout.axisY);
    });

    it("includes the paper's own year in the axis range even when absent from cites/citedBy", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [{ id: "a", year: 2012 }],
            citedBy: [{ id: "b", year: 2023 }],
            width: 720,
        });

        expect(layout.minYear).toBeLessThanOrEqual(2016);
        expect(layout.maxYear).toBeGreaterThanOrEqual(2016);
        expect(layout.minYear).toBe(2012);
        expect(layout.maxYear).toBe(2023);
        // A tick exists for every year in [minYear, maxYear], one flagged as the paper's year.
        const paperTicks = layout.ticks.filter((t) => t.isPaperYear);
        expect(paperTicks).toHaveLength(1);
        expect(paperTicks[0].year).toBe(2016);
        expect(layout.ticks).toHaveLength(2023 - 2012 + 1);
    });

    it("handles the single-year edge case (paper year with no cites/citedBy spanning other years) without NaN", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [{ id: "a", year: 2016 }],
            citedBy: [{ id: "b", year: 2016 }],
            width: 720,
        });

        expect(layout.minYear).toBe(2016);
        expect(layout.maxYear).toBe(2016);
        expect(layout.ticks).toHaveLength(1);
        expect(Number.isFinite(layout.paperX)).toBe(true);
        expect(Number.isFinite(layout.citedBy[0].x)).toBe(true);
        expect(Number.isFinite(layout.cites[0].x)).toBe(true);
        // Same year → same x for the paper tick and both dots.
        expect(layout.citedBy[0].x).toBe(layout.paperX);
        expect(layout.cites[0].x).toBe(layout.paperX);
    });

    it("produces a sane layout with empty cites and citedBy", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [],
            citedBy: [],
            width: 720,
        });

        expect(layout.citedBy).toEqual([]);
        expect(layout.cites).toEqual([]);
        expect(layout.minYear).toBe(2016);
        expect(layout.maxYear).toBe(2016);
        expect(layout.ticks).toHaveLength(1);
        expect(layout.height).toBeGreaterThan(layout.axisY);
        expect(Number.isFinite(layout.axisY)).toBe(true);
    });

    it("keeps the axis within [MARGIN_X, width - MARGIN_X] and respects the requested width", () => {
        const layout = computeLineageLayout({
            paperYear: 2016,
            cites: [{ id: "a", year: 2012 }],
            citedBy: [{ id: "b", year: 2023 }],
            width: 356,
        });

        expect(layout.width).toBe(356);
        expect(layout.axisX1).toBe(28);
        expect(layout.axisX2).toBe(328);
    });
});
