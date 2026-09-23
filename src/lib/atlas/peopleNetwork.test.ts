import { describe, expect, it } from "vitest";
import {
    cameraFitBounds,
    coauthorTies,
    computeFocusPositions,
    computeRingLayout,
    eraIntersects,
    focusBounds,
    focusHalfExtent,
    layoutLabels,
    matchesQuery,
    nodeRadius,
    resolveAuthorId,
    ringRadius,
    ringRadiusScale,
    searchPeople,
    selectFocusLabelCandidates,
    selectOverviewLabelCandidates,
    splitFocusTieLabels,
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

    it("scales collision math by contentPerScreenPx — the same screen-px font renders further from the node when content units are 'bigger' (zoomed out)", () => {
        const candidate = { id: "a", x: 500, y: 500, radius: 5, text: "Ada", fontSize: 12 };
        const atFitScale = layoutLabels([candidate], canvas, [], 1);
        const zoomedOut = layoutLabels([candidate], canvas, [], 4);
        const distAt1 = Math.hypot(atFitScale[0].x - 500, atFitScale[0].y - 500);
        const distAt4 = Math.hypot(zoomedOut[0].x - 500, zoomedOut[0].y - 500);
        expect(distAt4).toBeGreaterThan(distAt1);
    });

    it("never lets two mandatory labels overlap, even in a dense ring (nudges directly apart)", () => {
        // Mirrors a real focused view: many mandatory co-author labels on one
        // ring — using `computeRingLayout`'s real (tie-count-scaled) radius,
        // since a synthetic ring far smaller than what the real system would
        // ever produce isn't a scenario the nudge budget is meant to rescue
        // (see the Girshick-scale test below for that guarantee end-to-end).
        const n = 10;
        const ties = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, shared: 1 }));
        const ring = computeRingLayout(ties);
        const candidates = ties.map((t) => {
            const slot = ring.get(t.id)!;
            return {
                id: t.id,
                x: 500 + slot.x,
                y: 500 + slot.y,
                radius: 5,
                text: `Person Number ${t.id}`,
                fontSize: 12.5,
                mandatory: true,
            };
        });
        const placed = layoutLabels(candidates, { minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
        expect(placed).toHaveLength(n);
        expectNoPairwiseOverlap(placed);
    });

    it("resolves a cross-tier collision (different ring radii, so no shared tangent direction) by nudging along the real separating vector", () => {
        // An inner-ring and an outer-ring candidate placed close enough to
        // collide — the old tangent-based nudge could push two such labels
        // in unrelated (or even worsening) directions since their tangents
        // come from different-radius circles; nudging along the vector
        // between their actual box centers works regardless of ring geometry.
        const candidates = [
            { id: "inner", x: 500, y: 500, radius: 5, text: "Inner Ring Person", fontSize: 12.5, mandatory: true },
            { id: "outer", x: 540, y: 505, radius: 5, text: "Outer Ring Person", fontSize: 12.5, mandatory: true },
        ];
        const placed = layoutLabels(candidates, { minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
        expect(placed).toHaveLength(2);
        expectNoPairwiseOverlap(placed);
    });

    it("Girshick-scale end-to-end (42 ties): budget + scaled rings + capped nudge together avoid overlap and clipping", () => {
        const focusId = "focus";
        // Roughly mirrors the reported case: a couple of strong ties, a few
        // medium, and many single-paper ties.
        const ties = [
            { id: "s0", shared: 7 },
            { id: "s1", shared: 6 },
            { id: "m0", shared: 2 },
            { id: "m1", shared: 2 },
            { id: "m2", shared: 2 },
            ...Array.from({ length: 37 }, (_, i) => ({ id: `w${i}`, shared: 1 })),
        ];
        expect(ties).toHaveLength(42);

        const nodes: ScholarlyNetworkNode[] = [{ id: focusId, x: 0, y: 0 }, ...ties.map((t) => ({ id: t.id, x: 0, y: 0 }))];
        const positions = computeFocusPositions(nodes, ties, focusId);
        const people = [
            { id: focusId, name: "Focus Person", pageCount: 14, x: 0, y: 0 },
            ...ties.map((t, i) => ({ id: t.id, name: `Co Author Number ${i}`, pageCount: 5, x: positions.get(t.id)!.x, y: positions.get(t.id)!.y })),
        ];

        const halfExtent = focusHalfExtent(ties);
        const canvas = { minX: -halfExtent, minY: -halfExtent, maxX: halfExtent, maxY: halfExtent };
        const { candidates, unlabelledTies } = selectFocusLabelCandidates(people, focusId, ties, "none");
        const placed = layoutLabels(candidates, canvas, [], 1);

        // Budget: 16 total - 1 (focus) - 5 (strong+medium) = 10 single-paper ties labelled.
        expect(unlabelledTies).toHaveLength(37 - 10);
        expectNoPairwiseOverlap(placed);

        for (const p of placed) {
            const w = p.text.length * p.fontSize * 0.62;
            const box = { minX: p.x - 2, minY: p.y - p.fontSize, maxX: p.x + w + 2, maxY: p.y + 4 };

            // No label clipped by the canvas frame.
            expect(box.minX).toBeGreaterThanOrEqual(canvas.minX - 0.01);
            expect(box.maxX).toBeLessThanOrEqual(canvas.maxX + 0.01);
            expect(box.minY).toBeGreaterThanOrEqual(canvas.minY - 0.01);
            expect(box.maxY).toBeLessThanOrEqual(canvas.maxY + 0.01);

            // Never more than roughly a couple of label-heights from its own
            // node — measured to the NEAREST edge of the label's box, not its
            // anchor coordinate (a "left"-anchored label's `x` is its far/start
            // edge, which is naturally ~a label-width away even though the
            // near edge sits right beside the node).
            const node = people.find((person) => person.id === p.id)!;
            const dx = Math.max(box.minX - node.x, 0, node.x - box.maxX);
            const dy = Math.max(box.minY - node.y, 0, node.y - box.maxY);
            const gap = Math.hypot(dx, dy);
            expect(gap).toBeLessThan(p.fontSize * 2.5);
        }
    });
});

/** Asserts no two placed labels' boxes overlap — shared by several dense-ring tests. */
function expectNoPairwiseOverlap(placed: { x: number; y: number; text: string; fontSize: number }[]): void {
    const boxOf = (p: (typeof placed)[number]) => {
        const w = p.text.length * p.fontSize * 0.62;
        const h = p.fontSize;
        return [p.x - 2, p.y - h, p.x + w + 2, p.y + 4] as const;
    };
    for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
            const a = boxOf(placed[i]);
            const b = boxOf(placed[j]);
            const overlaps = !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
            expect(overlaps).toBe(false);
        }
    }
}

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

    it("always includes the focus node and every tie as mandatory (under the budget)", () => {
        const { candidates } = selectFocusLabelCandidates(people, "focus", ties, "none");
        const mandatoryIds = candidates.filter((c) => c.mandatory).map((c) => c.id).sort();
        expect(mandatoryIds).toEqual(["focus", "tie-a", "tie-b"]);
    });

    it("adds no optional context labels when labelMode is 'none'", () => {
        const { candidates } = selectFocusLabelCandidates(people, "focus", ties, "none");
        expect(candidates.every((c) => c.mandatory)).toBe(true);
    });

    it("adds optional high-page-count context labels when labelMode isn't 'none'", () => {
        const { candidates } = selectFocusLabelCandidates(people, "focus", ties, "top20", 5);
        const optional = candidates.filter((c) => !c.mandatory);
        expect(optional.map((c) => c.id)).toContain("other-1");
    });

    it("caps optional context labels by extraLimit", () => {
        const { candidates } = selectFocusLabelCandidates(people, "focus", ties, "top20", 1);
        expect(candidates.filter((c) => !c.mandatory)).toHaveLength(1);
    });

    it("reports no unlabelled ties when everyone fits under the budget", () => {
        const { unlabelledTies } = selectFocusLabelCandidates(people, "focus", ties, "none");
        expect(unlabelledTies).toHaveLength(0);
    });
});

// ── focus label budget ───────────────────────────────────────────────────────

describe("splitFocusTieLabels", () => {
    it("always labels every tie with >= 2 shared papers, regardless of budget", () => {
        const ties = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, shared: 2 }));
        const { labelled, unlabelled } = splitFocusTieLabels(ties, 4);
        expect(labelled).toHaveLength(10);
        expect(unlabelled).toHaveLength(0);
    });

    it("fills remaining budget with single-paper ties spread evenly across the ring, not a bunched prefix", () => {
        const strong = [{ id: "a", shared: 3 }, { id: "b", shared: 2 }];
        const weak = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, shared: 1 }));
        const { labelled, unlabelled } = splitFocusTieLabels([...strong, ...weak], 16);
        // budget 16, -1 for the focus node's own label, -2 for the strong pair = 13 weak slots.
        expect(labelled).toHaveLength(2 + 13);
        const weakIndices = labelled.slice(2).map((t) => Number(t.id.slice(1)));
        // Ring order preserved (strictly increasing indices)...
        expect(weakIndices).toEqual([...weakIndices].sort((x, y) => x - y));
        // ...but NOT a contiguous prefix — spread across the full 0..19 range,
        // since a prefix would bunch every labelled tie into one narrow arc.
        expect(Math.max(...weakIndices) - Math.min(...weakIndices)).toBeGreaterThan(13);
        expect(unlabelled).toHaveLength(20 - 13);
    });

    it("leaves nobody unlabelled when the total is small", () => {
        const ties = [{ id: "a", shared: 1 }, { id: "b", shared: 1 }];
        const { unlabelled } = splitFocusTieLabels(ties, 16);
        expect(unlabelled).toHaveLength(0);
    });
});

// ── ring radius / layout scaling ─────────────────────────────────────────────

describe("ringRadiusScale", () => {
    it("is 1 (no-op) at and below 16 ties", () => {
        expect(ringRadiusScale(0)).toBe(1);
        expect(ringRadiusScale(16)).toBe(1);
    });

    it("grows past 16 ties, per sqrt(n/16)", () => {
        expect(ringRadiusScale(64)).toBeCloseTo(2);
        expect(ringRadiusScale(144)).toBeCloseTo(3);
    });
});

describe("computeRingLayout", () => {
    it("gives a high-degree focus (42 ties) visibly bigger rings than a low-degree one (2 ties)", () => {
        const fewTies = [{ id: "a", shared: 1 }, { id: "b", shared: 1 }];
        const manyTies = Array.from({ length: 42 }, (_, i) => ({ id: `t${i}`, shared: 1 }));
        const fewRadius = computeRingLayout(fewTies).get("a")!.radius;
        const manyRadius = computeRingLayout(manyTies).get("t0")!.radius;
        expect(manyRadius).toBeGreaterThan(fewRadius);
    });

    it("keeps same-ring neighbors at least MIN_RING_ARC_SPACING apart even when tightly packed", () => {
        const ties = Array.from({ length: 42 }, (_, i) => ({ id: `t${i}`, shared: 1 }));
        const ring = computeRingLayout(ties);
        const slots = ties.map((t) => ring.get(t.id)!);
        // Adjacent-by-angle spacing: straight-line distance between consecutive slots.
        for (let i = 0; i < slots.length; i++) {
            const a = slots[i];
            const b = slots[(i + 1) % slots.length];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            expect(dist).toBeGreaterThanOrEqual(20); // a little under the 22 target — ellipse foreshortens x.
        }
    });

    it("lays out each tier independently — a single strong tie doesn't affect a full weak ring's spacing", () => {
        const ties = [{ id: "strong", shared: 3 }, ...Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, shared: 1 }))];
        const ring = computeRingLayout(ties);
        const weakAngles = Array.from({ length: 8 }, (_, i) => ring.get(`w${i}`)!.angle);
        expect(new Set(weakAngles.map((a) => a.toFixed(3))).size).toBe(8);
    });
});

describe("focusHalfExtent", () => {
    it("grows for a high-degree focus so the camera fit follows the larger ring extent", () => {
        const fewTies = [{ id: "a", shared: 1 }, { id: "b", shared: 1 }];
        const manyTies = Array.from({ length: 42 }, (_, i) => ({ id: `t${i}`, shared: 1 }));
        expect(focusHalfExtent(manyTies)).toBeGreaterThan(focusHalfExtent(fewTies));
    });

    it("never shrinks below the given base", () => {
        expect(focusHalfExtent([], 220)).toBe(220);
    });
});

// ── camera fit bias ──────────────────────────────────────────────────────────

describe("cameraFitBounds", () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    it("overview: pushes content right, away from the left-side minimap+legend", () => {
        const biased = cameraFitBounds(box, false, false);
        expect(biased.minX).toBeLessThan(box.minX);
        expect(biased.maxX).toBe(box.maxX);
        expect(biased.minY).toBe(box.minY);
        expect(biased.maxY).toBe(box.maxY);
    });

    it("focused on phone: pushes content up, away from the bottom-sheet focus card", () => {
        const biased = cameraFitBounds(box, true, true);
        expect(biased.maxY).toBeGreaterThan(box.maxY);
        expect(biased.minX).toBe(box.minX);
        expect(biased.maxX).toBe(box.maxX);
    });

    it("focused on desktop: pushes content left, away from the top-right focus card", () => {
        const biased = cameraFitBounds(box, false, true);
        expect(biased.maxX).toBeGreaterThan(box.maxX);
        expect(biased.minY).toBe(box.minY);
        expect(biased.maxY).toBe(box.maxY);
    });

    it("phone overview uses the overview (left) bias, not the phone-focused (bottom) bias", () => {
        const biased = cameraFitBounds(box, true, false);
        expect(biased.minX).toBeLessThan(box.minX);
        expect(biased.maxY).toBe(box.maxY);
    });
});
