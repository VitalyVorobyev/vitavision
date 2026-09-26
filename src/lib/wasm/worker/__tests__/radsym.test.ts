import { describe, it, expect } from "vitest";
import { adaptRadsymProposalResult } from "../radsym";

/** Build a synthetic stride-3 `extract_proposals` output: x, y, score. */
function makeRaw(circles: Array<{ x: number; y: number; score: number }>): Float32Array {
    const out = new Float32Array(circles.length * 3);
    circles.forEach((c, i) => out.set([c.x, c.y, c.score], i * 3));
    return out;
}

describe("adaptRadsymProposalResult", () => {
    it("maps a stride-3 buffer into circles with radius 0 (radius is unknown at proposal stage)", () => {
        const raw = makeRaw([{ x: 10, y: 20, score: 0.5 }]);
        const result = adaptRadsymProposalResult(raw, 100, 100, 4);
        expect(result.status).toBe("success");
        expect(result.circles).toHaveLength(1);
        expect(result.circles[0]).toMatchObject({ x: 10, y: 20, score: 0.5, radius: 0 });
        expect(typeof result.circles[0].id).toBe("string");
        expect(result.summary.count).toBe(1);
        expect(result.summary.runtime_ms).toBe(4);
    });

    it("sorts circles by score descending", () => {
        const raw = makeRaw([{ x: 0, y: 0, score: 0.2 }, { x: 1, y: 1, score: 0.9 }, { x: 2, y: 2, score: 0.5 }]);
        const result = adaptRadsymProposalResult(raw, 10, 10, 1);
        const scores = result.circles.map((c) => c.score);
        expect(scores[0]).toBeCloseTo(0.9);
        expect(scores[1]).toBeCloseTo(0.5);
        expect(scores[2]).toBeCloseTo(0.2);
    });

    it("drops non-finite x/y", () => {
        const raw = makeRaw([{ x: NaN, y: 0, score: 1 }, { x: 1, y: 1, score: 1 }]);
        const result = adaptRadsymProposalResult(raw, 10, 10, 1);
        expect(result.circles).toHaveLength(1);
    });

    it("handles an empty detection", () => {
        const result = adaptRadsymProposalResult(new Float32Array(0), 10, 10, 1);
        expect(result.circles).toHaveLength(0);
        expect(result.summary.count).toBe(0);
    });
});
