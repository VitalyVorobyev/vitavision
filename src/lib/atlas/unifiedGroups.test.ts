import { describe, it, expect } from "vitest";
import { byDepthThenDate, computeUnifiedGroups, type UnifiedEntry } from "./unifiedGroups.ts";
import type { AlgorithmIndexEntry, ModelIndexEntry, ConceptIndexEntry } from "../content/schema.ts";

// ── Synthetic fixtures ───────────────────────────────────────────────────────
// Slugs deliberately don't match any real content-graph node, so `depth` always
// falls back to Number.MAX_SAFE_INTEGER for every entry in the grouping tests —
// that isolates the date/title tie-break, which byDepthThenDate is separately
// exercised against explicit depth maps below.

function algo(slug: string, title: string, date: string, domain?: string): AlgorithmIndexEntry {
    return {
        slug,
        frontmatter: { title, date, summary: `${title} summary`, access: "public", tags: ["classical"], domain },
    } as unknown as AlgorithmIndexEntry;
}

function model(slug: string, title: string, date: string, domain?: string): ModelIndexEntry {
    return {
        slug,
        frontmatter: { title, date, summary: `${title} summary`, access: "public", tags: ["deep-learning"], domain },
    } as unknown as ModelIndexEntry;
}

function concept(slug: string, title: string, date: string, domain?: string): ConceptIndexEntry {
    return {
        slug,
        frontmatter: { title, date, summary: `${title} summary`, access: "public", tags: ["classical"], domain },
    } as unknown as ConceptIndexEntry;
}

function entry(slug: string, date: string, title = slug): UnifiedEntry {
    return { kind: "algorithm", slug, frontmatter: { title, date } } as unknown as UnifiedEntry;
}

describe("byDepthThenDate", () => {
    it("orders by ascending depth first", () => {
        const depth = { a: 2, b: 0, c: 1 };
        const items = [entry("a", "2026-01-01"), entry("b", "2026-01-01"), entry("c", "2026-01-01")];
        items.sort(byDepthThenDate(depth));
        expect(items.map((e) => e.slug)).toEqual(["b", "c", "a"]);
    });

    it("treats an unknown slug as maximal depth (sorts last)", () => {
        const depth = { known: 0 };
        const items = [entry("unknown", "2026-01-01"), entry("known", "2026-01-01")];
        items.sort(byDepthThenDate(depth));
        expect(items.map((e) => e.slug)).toEqual(["known", "unknown"]);
    });

    it("tie-breaks equal depth by date descending", () => {
        const depth = { a: 0, b: 0 };
        const items = [entry("a", "2026-01-01"), entry("b", "2026-06-01")];
        items.sort(byDepthThenDate(depth));
        expect(items.map((e) => e.slug)).toEqual(["b", "a"]);
    });

    it("tie-breaks equal depth and date by title ascending", () => {
        const depth = { a: 0, b: 0 };
        const items = [entry("a", "2026-01-01", "Zebra"), entry("b", "2026-01-01", "Alpha")];
        items.sort(byDepthThenDate(depth));
        expect(items.map((e) => e.slug)).toEqual(["b", "a"]);
    });
});

describe("computeUnifiedGroups", () => {
    it("groups by kind (algorithm/model/concept) when kind is 'all'", () => {
        const groups = computeUnifiedGroups(
            [algo("harris", "Harris", "2026-01-01")],
            [model("superpoint", "SuperPoint", "2026-01-01")],
            [concept("epipolar", "Epipolar geometry", "2026-01-01")],
            "all",
        );
        expect(groups.map((g) => g.id)).toEqual(["algorithm", "model", "concept"]);
        expect(groups.map((g) => g.label)).toEqual(["Algorithms", "Models", "Concepts"]);
        expect(groups.find((g) => g.id === "algorithm")?.entries.map((e) => e.slug)).toEqual(["harris"]);
    });

    it("omits empty kind groups", () => {
        const groups = computeUnifiedGroups([algo("harris", "Harris", "2026-01-01")], [], [], "all");
        expect(groups.map((g) => g.id)).toEqual(["algorithm"]);
    });

    it("groups by domain (in domainOrder) when a specific kind is selected", () => {
        const groups = computeUnifiedGroups(
            [
                algo("harris", "Harris", "2026-01-01", "features"),
                algo("zhang", "Zhang", "2026-01-01", "calibration"),
                algo("orb", "ORB", "2026-01-01", "features"),
            ],
            [],
            [],
            "algorithm",
        );
        // domainOrder = [..., "features", ..., "calibration", ...] — features before calibration.
        expect(groups.map((g) => g.id)).toEqual(["features", "calibration"]);
        expect(groups.find((g) => g.id === "features")?.entries.map((e) => e.slug).sort()).toEqual(["harris", "orb"]);
    });

    it("drops entries with no domain entirely — 'unknown' bucket isn't in domainOrder so never surfaces", () => {
        const groups = computeUnifiedGroups(
            [
                algo("mystery", "Mystery algorithm", "2026-01-01", undefined),
                algo("harris", "Harris", "2026-01-01", "features"),
            ],
            [],
            [],
            "algorithm",
        );
        expect(groups.map((g) => g.id)).toEqual(["features"]);
        expect(groups[0].entries.map((e) => e.slug)).toEqual(["harris"]);
    });

    it("sorts entries within a domain group by depth-then-date (date desc, title asc, since these slugs have no known depth)", () => {
        const groups = computeUnifiedGroups(
            [
                algo("older", "Zebra", "2026-01-01", "features"),
                algo("newer", "Alpha", "2026-06-01", "features"),
            ],
            [],
            [],
            "algorithm",
        );
        expect(groups[0].entries.map((e) => e.slug)).toEqual(["newer", "older"]);
    });
});
