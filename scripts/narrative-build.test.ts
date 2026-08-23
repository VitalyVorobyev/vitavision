import { describe, it, expect } from "vitest";
import {
    buildTimelineLens,
    normalizeCoordsToUnitSquare,
    sliceChapters,
    violatesEvolutionChronology,
    findLensOrderInversions,
} from "./narrative-build.ts";

describe("buildTimelineLens", () => {
    it("scales x linearly over the year range and sets y to the area's lane index", () => {
        const lens = buildTimelineLens(
            [
                { id: "a", year: 2000, area: "foundations" },
                { id: "b", year: 2010, area: "architectures" },
                { id: "c", year: 2020, area: "foundations" },
            ],
            ["foundations", "architectures"],
        );
        expect(lens.id).toBe("timeline");
        expect(lens.coords.a).toEqual([0, 0]);
        expect(lens.coords.b).toEqual([0.5, 1]);
        expect(lens.coords.c).toEqual([1, 0]);
    });

    it("omits nodes with no derivable year", () => {
        const lens = buildTimelineLens(
            [
                { id: "a", year: 2000, area: "foundations" },
                { id: "b", area: "foundations" },
            ],
            ["foundations"],
        );
        expect(Object.keys(lens.coords)).toEqual(["a"]);
    });

    it("centers a single-year node at x=0.5 (zero span)", () => {
        const lens = buildTimelineLens(
            [
                { id: "a", year: 2015, area: "foundations" },
                { id: "b", year: 2015, area: "foundations" },
            ],
            ["foundations"],
        );
        expect(lens.coords.a[0]).toBe(0.5);
        expect(lens.coords.b[0]).toBe(0.5);
    });

    it("returns empty coords when no node has a derivable year", () => {
        const lens = buildTimelineLens([{ id: "a", area: "foundations" }], ["foundations"]);
        expect(lens.coords).toEqual({});
    });
});

describe("normalizeCoordsToUnitSquare", () => {
    it("min-max normalizes both axes independently into [0,1]", () => {
        const out = normalizeCoordsToUnitSquare({
            a: [0, 0],
            b: [10, 5],
            c: [5, 10],
        });
        expect(out.a).toEqual([0, 0]);
        expect(out.b).toEqual([1, 0.5]);
        expect(out.c).toEqual([0.5, 1]);
    });

    it("centers a zero-span axis at 0.5", () => {
        const out = normalizeCoordsToUnitSquare({ a: [3, 0], b: [3, 10] });
        expect(out.a).toEqual([0.5, 0]);
        expect(out.b).toEqual([0.5, 1]);
    });

    it("returns an empty object for empty input", () => {
        expect(normalizeCoordsToUnitSquare({})).toEqual({});
    });
});

describe("sliceChapters", () => {
    it("slices from each h2 heading (inclusive) up to the next h2 (exclusive)", () => {
        const html =
            '<p>intro</p><h2 id="alpha">Alpha</h2><p>alpha body</p>' +
            '<h2 id="beta">Beta</h2><p>beta body</p>';
        const chapters = sliceChapters(html);
        expect(Object.keys(chapters)).toEqual(["alpha", "beta"]);
        expect(chapters.alpha).toBe('<h2 id="alpha">Alpha</h2><p>alpha body</p>');
        expect(chapters.beta).toBe('<h2 id="beta">Beta</h2><p>beta body</p>');
    });

    it("returns an empty map when there are no h2 headings", () => {
        expect(sliceChapters("<p>no headings here</p>")).toEqual({});
    });

    it("ignores non-h2 headings", () => {
        const html = '<h1 id="title">Title</h1><h2 id="a">A</h2><h3 id="sub">Sub</h3><p>x</p>';
        const chapters = sliceChapters(html);
        expect(Object.keys(chapters)).toEqual(["a"]);
        expect(chapters.a).toContain('<h3 id="sub">Sub</h3>');
    });
});

describe("violatesEvolutionChronology", () => {
    it("is a violation when `from` postdates `to`", () => {
        expect(violatesEvolutionChronology(2023, 2020)).toBe(true);
    });

    it("is not a violation when `from` predates or matches `to`", () => {
        expect(violatesEvolutionChronology(2020, 2023)).toBe(false);
        expect(violatesEvolutionChronology(2020, 2020)).toBe(false);
    });

    it("skips the check when either year is underivable", () => {
        expect(violatesEvolutionChronology(undefined, 2020)).toBe(false);
        expect(violatesEvolutionChronology(2020, undefined)).toBe(false);
        expect(violatesEvolutionChronology(undefined, undefined)).toBe(false);
    });
});

describe("findLensOrderInversions", () => {
    it("flags a pair whose x-order contradicts a >=2 year gap", () => {
        const inversions = findLensOrderInversions([
            { id: "newer", x: 0, year: 2023 },
            { id: "older", x: 1, year: 2020 },
        ]);
        expect(inversions).toEqual([["newer", "older"]]);
    });

    it("does not flag a pair whose x-order agrees with year order", () => {
        const inversions = findLensOrderInversions([
            { id: "older", x: 0, year: 2020 },
            { id: "newer", x: 1, year: 2023 },
        ]);
        expect(inversions).toEqual([]);
    });

    it("allows free reordering for same/adjacent years (< 2 year gap)", () => {
        const inversions = findLensOrderInversions([
            { id: "b", x: 0, year: 2021 },
            { id: "a", x: 1, year: 2020 },
        ]);
        expect(inversions).toEqual([]);
    });

    it("ignores nodes with no derivable year", () => {
        const inversions = findLensOrderInversions([
            { id: "a", x: 0, year: 2020 },
            { id: "b", x: 1 },
        ]);
        expect(inversions).toEqual([]);
    });
});
