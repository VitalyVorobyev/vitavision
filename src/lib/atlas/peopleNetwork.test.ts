import { describe, expect, it } from "vitest";
import {
    coauthorTies,
    computeFocusPositions,
    eraIntersects,
    focusBounds,
    layoutLabels,
    matchesQuery,
    nodeRadius,
    resolveAuthorId,
    ringRadius,
    searchPeople,
    selectFocusLabelCandidates,
    selectOverviewLabelCandidates,
} from "./peopleNetwork.ts";
import type { ScholarlyNetworkNode } from "./scholarlyTypes.ts";

// ── alias resolution ─────────────────────────────────────────────────────────

describe("resolveAuthorId", () => {
    it("returns the id unchanged when it isn't an alias", () => {
        expect(resolveAuthorId("A1", {})).toBe("A1");
    });

    it("follows a single alias hop", () => {
        expect(resolveAuthorId("A1", { A1: "A2" })).toBe("A2");
    });

    it("follows a chain to the fixed point", () => {
        expect(resolveAuthorId("A1", { A1: "A2", A2: "A3" })).toBe("A3");
    });

    it("never infinite-loops on a cycle", () => {
        expect(resolveAuthorId("A1", { A1: "A2", A2: "A1" })).toBe("A1");
    });
});

// ── era filter ───────────────────────────────────────────────────────────────

describe("eraIntersects", () => {
    it("'all' always matches", () => {
        expect(eraIntersects("all", 1990, 1990)).toBe(true);
    });

    it("'pre2000' matches only spans starting before 2000", () => {
        expect(eraIntersects("pre2000", 1999, 2005)).toBe(true);
        expect(eraIntersects("pre2000", 2000, 2005)).toBe(false);
    });

    it("'2000-2011' requires overlap with [2000,2011]", () => {
        expect(eraIntersects("2000-2011", 1995, 2001)).toBe(true);
        expect(eraIntersects("2000-2011", 2012, 2020)).toBe(false);
        expect(eraIntersects("2000-2011", 1990, 1995)).toBe(false);
    });

    it("'2012plus' matches spans reaching 2012 or later", () => {
        expect(eraIntersects("2012plus", 2005, 2012)).toBe(true);
        expect(eraIntersects("2012plus", 2005, 2011)).toBe(false);
    });
});

// ── search matching ──────────────────────────────────────────────────────────

describe("matchesQuery", () => {
    it("matches case-insensitively", () => {
        expect(matchesQuery("Kaiming He", "kaiming")).toBe(true);
    });

    it("matches accent/diacritic-insensitively", () => {
        expect(matchesQuery("Piotr Dollár", "dollar")).toBe(true);
        expect(matchesQuery("Piotr Dollar", "dollár")).toBe(true);
    });

    it("is a substring match, not prefix-only", () => {
        expect(matchesQuery("Ross Girshick", "girsh")).toBe(true);
    });

    it("returns false for an empty query", () => {
        expect(matchesQuery("Kaiming He", "  ")).toBe(false);
    });
});

describe("searchPeople", () => {
    const authorsIdx = {
        authors: {
            A1: { name: "Kaiming He", papers: [] },
            A2: { name: "Ross Girshick", papers: [] },
            A3: { name: "Not In Network", papers: [] },
        },
    };
    const scholarly = {
        authors: {
            A1: { firstYear: 2015, lastYear: 2021, pageCount: 22, primaryPages: [], domains: [], group: "representation" as const },
            A2: { firstYear: 2014, lastYear: 2017, pageCount: 10, primaryPages: [], domains: [], group: "recognition" as const },
        },
    };

    it("only matches authors present in the network index", () => {
        const results = searchPeople("not in network", authorsIdx, scholarly);
        expect(results).toHaveLength(0);
    });

    it("ranks by page count descending", () => {
        const results = searchPeople("i", authorsIdx, scholarly);
        expect(results.map((r) => r.id)).toEqual(["A1", "A2"]);
    });

    it("caps to the given limit", () => {
        const results = searchPeople("i", authorsIdx, scholarly, 1);
        expect(results).toHaveLength(1);
    });
});

// ── node sizing ──────────────────────────────────────────────────────────────

describe("nodeRadius", () => {
    it("grows with sqrt(pageCount)", () => {
        expect(nodeRadius(0)).toBeCloseTo(2.5);
        expect(nodeRadius(4)).toBeCloseTo(2.5 + 2 * 1.25);
    });
});

// ── focus rings ──────────────────────────────────────────────────────────────

describe("ringRadius", () => {
    it("is smallest for the strongest tie (>=3 shared papers)", () => {
        expect(ringRadius(3)).toBeLessThan(ringRadius(2));
        expect(ringRadius(2)).toBeLessThan(ringRadius(1));
    });
});

describe("coauthorTies", () => {
    const coauthorPapers = {
        focus: { a: ["p1", "p2", "p3"], b: ["p1", "p2"], c: ["p1"] },
    };

    it("sorts by shared-paper count descending", () => {
        expect(coauthorTies(coauthorPapers, "focus")).toEqual([
            { id: "a", shared: 3 },
            { id: "b", shared: 2 },
            { id: "c", shared: 1 },
        ]);
    });

    it("returns an empty list for an author with no coauthors", () => {
        expect(coauthorTies(coauthorPapers, "nobody")).toEqual([]);
    });
});

describe("computeFocusPositions", () => {
    const nodes: ScholarlyNetworkNode[] = [
        { id: "focus", x: 100, y: 100 },
        { id: "a", x: 500, y: 500 },
        { id: "b", x: -500, y: -500 },
    ];
    const ties = [
        { id: "a", shared: 3 },
        { id: "b", shared: 1 },
    ];

    it("keeps the focus node at its real network position", () => {
        const pos = computeFocusPositions(nodes, ties, "focus");
        expect(pos.get("focus")).toEqual({ x: 100, y: 100 });
    });

    it("places closer-tie coauthors nearer the focus node than weaker ties", () => {
        const pos = computeFocusPositions(nodes, ties, "focus");
        const focus = pos.get("focus")!;
        const distA = Math.hypot(pos.get("a")!.x - focus.x, pos.get("a")!.y - focus.y);
        const distB = Math.hypot(pos.get("b")!.x - focus.x, pos.get("b")!.y - focus.y);
        expect(distA).toBeLessThan(distB);
    });

    it("returns an empty map when the focus id isn't in the network", () => {
        expect(computeFocusPositions(nodes, ties, "missing").size).toBe(0);
    });

    it("spaces coauthors evenly by angle (order matters for label priority, not overlap)", () => {
        const manyTies = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, shared: 1 }));
        const manyNodes: ScholarlyNetworkNode[] = [
            { id: "focus", x: 0, y: 0 },
            ...manyTies.map((t) => ({ id: t.id, x: 0, y: 0 })),
        ];
        const pos = computeFocusPositions(manyNodes, manyTies, "focus");
        const angles = manyTies.map((t) => Math.atan2(pos.get(t.id)!.y, pos.get(t.id)!.x));
        // All four angles should be distinct (evenly spaced around the circle).
        expect(new Set(angles.map((a) => a.toFixed(3))).size).toBe(4);
    });
});

describe("focusBounds", () => {
    const nodes: ScholarlyNetworkNode[] = [{ id: "focus", x: 10, y: -20 }];

    it("centers a symmetric box on the focus node", () => {
        expect(focusBounds(nodes, "focus", 100)).toEqual({ minX: -90, minY: -120, maxX: 110, maxY: 80 });
    });

    it("returns null when the focus id isn't found", () => {
        expect(focusBounds(nodes, "missing")).toBeNull();
    });
});

// ── label layout ─────────────────────────────────────────────────────────────

describe("layoutLabels", () => {
    const canvas = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    it("places a single candidate to the right of its node", () => {
        const placed = layoutLabels([{ id: "a", x: 100, y: 100, radius: 5, text: "Ada", fontSize: 12 }], canvas);
        expect(placed).toHaveLength(1);
        expect(placed[0].x).toBeGreaterThan(100);
    });

    it("drops an optional candidate that collides with an already-placed label", () => {
        // Two nodes at (almost) the same spot force a collision on every anchor.
        const candidates = [
            { id: "a", x: 100, y: 100, radius: 5, text: "Alpha Alphaton", fontSize: 14 },
            { id: "b", x: 101, y: 100, radius: 5, text: "Beta Betaton", fontSize: 14 },
        ];
        const placed = layoutLabels(candidates, canvas);
        expect(placed.map((p) => p.id)).toEqual(["a"]);
    });

    it("always places mandatory candidates even under collision", () => {
        const candidates = [
            { id: "a", x: 100, y: 100, radius: 5, text: "Alpha Alphaton", fontSize: 14, mandatory: true },
            { id: "b", x: 101, y: 100, radius: 5, text: "Beta Betaton", fontSize: 14, mandatory: true },
        ];
        const placed = layoutLabels(candidates, canvas);
        expect(placed.map((p) => p.id).sort()).toEqual(["a", "b"]);
    });

    it("picks the least-overlapping fallback anchor for a mandatory label instead of stacking it on the first", () => {
        // Two co-located mandatory candidates: every anchor for "b" collides with "a"'s
        // chosen (right) anchor, EXCEPT "left" — the fallback must not default to
        // anchors[0] ("right") and land text exactly on top of "a"'s label.
        const candidates = [
            { id: "a", x: 200, y: 200, radius: 5, text: "Serge Belongie", fontSize: 12.5, mandatory: true },
            { id: "b", x: 201, y: 200, radius: 5, text: "Georgia Gkioxari", fontSize: 12.5, mandatory: true },
        ];
        const placed = layoutLabels(candidates, canvas);
        const a = placed.find((p) => p.id === "a")!;
        const b = placed.find((p) => p.id === "b")!;
        expect(a.x).not.toBeCloseTo(b.x, 0);
    });

    it("drops a candidate whose only anchors fall outside the canvas", () => {
        const placed = layoutLabels([{ id: "a", x: 998, y: 998, radius: 5, text: "Way Too Long A Name Here", fontSize: 14 }], canvas);
        expect(placed).toHaveLength(0);
    });

    it("respects earlier priority order — first candidate wins the contested spot", () => {
        const candidates = [
            { id: "first", x: 100, y: 100, radius: 5, text: "First Person", fontSize: 14 },
            { id: "second", x: 100.5, y: 100, radius: 5, text: "Second Person", fontSize: 14 },
        ];
        const placed = layoutLabels(candidates, canvas);
        expect(placed.map((p) => p.id)).toEqual(["first"]);
    });

    it("respects reserved overlay boxes", () => {
        const reserved: [number, number, number, number][] = [[0, 0, 300, 300]];
        // Only anchor that would fit (right of node) lands inside the reserved box.
        const placed = layoutLabels([{ id: "a", x: 100, y: 100, radius: 5, text: "Ada", fontSize: 12 }], canvas, reserved);
        expect(placed).toHaveLength(0);
    });
});

describe("selectOverviewLabelCandidates", () => {
    const people = Array.from({ length: 25 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, pageCount: 25 - i, x: i, y: i }));

    it("returns nothing for labelMode 'none'", () => {
        expect(selectOverviewLabelCandidates(people, "none")).toHaveLength(0);
    });

    it("caps to the limit for labelMode 'top20', highest page count first", () => {
        const candidates = selectOverviewLabelCandidates(people, "top20", 20);
        expect(candidates).toHaveLength(20);
        expect(candidates[0].id).toBe("p0");
    });

    it("returns everyone for labelMode 'all'", () => {
        expect(selectOverviewLabelCandidates(people, "all", 20)).toHaveLength(25);
    });

    it("marks overview candidates as optional", () => {
        const candidates = selectOverviewLabelCandidates(people, "top20", 20);
        expect(candidates.every((c) => !c.mandatory)).toBe(true);
    });
});

describe("selectFocusLabelCandidates", () => {
    const people = [
        { id: "focus", name: "Focus Person", pageCount: 22, x: 0, y: 0 },
        { id: "tie-a", name: "Tie A", pageCount: 5, x: 50, y: 0 },
        { id: "tie-b", name: "Tie B", pageCount: 3, x: -50, y: 0 },
        { id: "other-1", name: "Other One", pageCount: 40, x: 500, y: 500 },
        { id: "other-2", name: "Other Two", pageCount: 1, x: -500, y: -500 },
    ];
    const ties = [
        { id: "tie-a", shared: 3 },
        { id: "tie-b", shared: 1 },
    ];

    it("always includes the focus node and every tie as mandatory", () => {
        const candidates = selectFocusLabelCandidates(people, "focus", ties, "none");
        const mandatoryIds = candidates.filter((c) => c.mandatory).map((c) => c.id).sort();
        expect(mandatoryIds).toEqual(["focus", "tie-a", "tie-b"]);
    });

    it("adds no optional context labels when labelMode is 'none'", () => {
        const candidates = selectFocusLabelCandidates(people, "focus", ties, "none");
        expect(candidates.every((c) => c.mandatory)).toBe(true);
    });

    it("adds optional high-page-count context labels when labelMode isn't 'none'", () => {
        const candidates = selectFocusLabelCandidates(people, "focus", ties, "top20", 5);
        const optional = candidates.filter((c) => !c.mandatory);
        expect(optional.map((c) => c.id)).toContain("other-1");
    });

    it("caps optional context labels by extraLimit", () => {
        const candidates = selectFocusLabelCandidates(people, "focus", ties, "top20", 1);
        expect(candidates.filter((c) => !c.mandatory)).toHaveLength(1);
    });
});
