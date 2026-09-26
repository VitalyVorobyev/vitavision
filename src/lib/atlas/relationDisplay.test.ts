import { describe, expect, it } from "vitest";
import { buildRelationDisplay, hasRawGraphEdges, SECTION_ORDER } from "./relationDisplay.ts";
import type { ContentGraph } from "../../generated/content-graph.ts";

function node(slug: string, draft = false): ContentGraph["nodes"][string] {
    return {
        slug,
        type: "algorithm",
        title: `Title of ${slug}`,
        summary: "summary",
        path: `/atlas/${slug}`,
        draft,
    };
}

/** A small synthetic graph exercising forward relations, mirrored symmetric
 * entries, all four asymmetric reverse buckets, plain slug edges, and a
 * draft target. Shaped like `src/generated/content-graph.ts`. */
function makeGraph(): ContentGraph {
    return {
        nodes: {
            a: node("a"),
            b: node("b"),
            c: node("c"),
            peer: node("peer"),
            successor: node("successor"),
            extender: node("extender"),
            feeder: node("feeder"),
            learner: node("learner"),
            "draft-target": node("draft-target", true),
        },
        forward: {
            a: {
                prerequisites: ["b", "draft-target"],
                failureModes: ["c"],
                relations: [
                    { type: "generalized_by", target: "successor", confidence: "high" },
                    { type: "compared_with", target: "peer", confidence: "medium", caution: "nuanced" },
                    { type: "generalized_by", target: "draft-target", confidence: "low" },
                ],
            },
            successor: { prerequisites: [], failureModes: [], relations: [] },
            peer: { prerequisites: [], failureModes: [], relations: [] },
        },
        reverse: {
            a: {
                usedBy: ["c", "draft-target"],
                affects: ["b"],
                generalises: [],
                extending: [{ slug: "extender", confidence: "high" }],
                fedBy: [{ slug: "feeder", confidence: "medium", caution: "one-way" }],
                hasLearnedAlternative: [{ slug: "learner", confidence: "high" }],
            },
        },
        depth: {},
    };
}

describe("hasRawGraphEdges", () => {
    it("is true when the slug has forward or reverse edges", () => {
        const graph = makeGraph();
        expect(hasRawGraphEdges("a", graph)).toBe(true);
        expect(hasRawGraphEdges("successor", graph)).toBe(true);
    });

    it("is false for a slug absent from both forward and reverse maps", () => {
        const graph = makeGraph();
        expect(hasRawGraphEdges("nowhere", graph)).toBe(false);
    });
});

describe("buildRelationDisplay", () => {
    it("includes forward relations under their forward label", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, graph });
        expect(result.grouped.get("Compared with")).toEqual([
            { label: "Compared with", target: "peer", confidence: "medium", caution: "nuanced" },
        ]);
    });

    it("suppresses the forward generalized_by/high entry matching supersededBy", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, supersededBy: "successor", graph });
        expect(result.grouped.get("Generalised by")).toBeUndefined();
        expect(result.hasSuccessor).toBe(true);
    });

    it("surfaces draft targets when showDrafts is true", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: true, graph });
        const generalisedBy = result.grouped.get("Generalised by") ?? [];
        expect(generalisedBy.map((r) => r.target)).toContain("draft-target");
        expect(result.prerequisites).toContain("draft-target");
        expect(result.usedBy).toContain("draft-target");
    });

    it("maps each asymmetric reverse bucket to its reverse label", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, graph });
        expect(result.grouped.get("Extends")).toEqual([
            { label: "Extends", target: "extender", confidence: "high", caution: undefined },
        ]);
        expect(result.grouped.get("Fed by")).toEqual([
            { label: "Fed by", target: "feeder", confidence: "medium", caution: "one-way" },
        ]);
        expect(result.grouped.get("Has learned alternative")).toEqual([
            { label: "Has learned alternative", target: "learner", confidence: "high", caution: undefined },
        ]);
    });

    it("filters draft targets out of plain slug lists by default", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, graph });
        expect(result.prerequisites).toEqual(["b"]);
        expect(result.usedBy).toEqual(["c"]);
        expect(result.failureModes).toEqual(["c"]);
        expect(result.affects).toEqual(["b"]);
    });

    it("reports hasGraphContent true when any list or grouped relation is non-empty", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, graph });
        expect(result.hasGraphContent).toBe(true);
    });

    it("reports hasGraphContent false and hasSuccessor false for a slug with no edges", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("nowhere", { showDrafts: false, graph });
        expect(result.hasGraphContent).toBe(false);
        expect(result.hasSuccessor).toBe(false);
        expect(result.grouped.size).toBe(0);
    });

    it("hasSuccessor is false when supersededBy targets an unknown slug", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: false, supersededBy: "ghost", graph });
        expect(result.hasSuccessor).toBe(false);
    });

    it("SECTION_ORDER contains every label produced for this fixture", () => {
        const graph = makeGraph();
        const result = buildRelationDisplay("a", { showDrafts: true, graph });
        for (const label of result.grouped.keys()) {
            expect(SECTION_ORDER).toContain(label);
        }
    });
});
