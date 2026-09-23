import { describe, it, expect } from "vitest";
import { adaptPuzzleboardResult } from "../puzzleboard";

describe("adaptPuzzleboardResult", () => {
    it("returns a well-formed empty result when raw is null", () => {
        const result = adaptPuzzleboardResult(null, 7, 640, 480, {});
        expect(result.status).toBe("success");
        expect(result.image_width).toBe(640);
        expect(result.image_height).toBe(480);
        expect(result.detection).toEqual({ kind: "puzzleboard", corners: [] });
        expect(result.alignment).toEqual({ transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] });
        expect(result.decode.bit_error_rate).toBe(0);
        expect(result.observed_edges).toEqual([]);
        expect(result.summary.runtime_ms).toBe(7);
    });

    it("returns a well-formed empty result when raw is undefined", () => {
        const result = adaptPuzzleboardResult(undefined, 1, 10, 10, {});
        expect(result.detection.corners).toHaveLength(0);
    });

    it("applies the +0.5px pixel-center-to-pixel-corner offset to corner coordinates", () => {
        const raw = {
            detection: { kind: "puzzleboard", corners: [{ position: [10, 20], grid: { u: 1, v: 2 }, score: 0.9, id: 5 }] },
            decode: { edges_observed: 1, edges_matched: 1, mean_confidence: 1, bit_error_rate: 0, master_origin_row: 0, master_origin_col: 0 },
            observed_edges: [],
        };
        const result = adaptPuzzleboardResult(raw, 3, 100, 100, {});
        const c = result.detection.corners[0];
        expect(c.x).toBe(10.5);
        expect(c.y).toBe(20.5);
        expect(c.grid).toEqual({ i: 1, j: 2 });
        expect(c.master_id).toBe(5);
    });

    it("does not apply an offset to score-less/null target_position corners, and null target_position maps to null", () => {
        const raw = {
            detection: { kind: "puzzleboard", corners: [{ position: [0, 0], grid: null, target_position: null }] },
            decode: {},
            observed_edges: [],
        };
        const result = adaptPuzzleboardResult(raw, 1, 10, 10, {});
        const c = result.detection.corners[0];
        expect(c.score).toBe(0);
        expect(c.grid).toBeNull();
        expect(c.target_position).toBeNull();
        expect(c.master_id).toBeNull();
    });

    it("converts the alignment matrix and passes through decode/observed_edges", () => {
        const raw = {
            detection: { kind: "puzzleboard", corners: [] },
            alignment: { matrix: [[0, 1], [1, 0]], translation: [5, 6] },
            decode: { edges_observed: 10, edges_matched: 9, mean_confidence: 0.8, bit_error_rate: 0.1, master_origin_row: 2, master_origin_col: 3 },
            observed_edges: [{ row: 1, col: 2, orientation: "horizontal", bit: 1, confidence: 0.7 }],
        };
        const result = adaptPuzzleboardResult(raw, 4, 10, 10, {});
        expect(result.alignment).toEqual({ transform: { a: 0, b: 1, c: 1, d: 0 }, translation: [5, 6] });
        expect(result.decode.edges_observed).toBe(10);
        expect(result.summary.master_origin).toEqual([2, 3]);
        expect(result.observed_edges).toEqual([{ row: 1, col: 2, orientation: "horizontal", bit: 1, confidence: 0.7 }]);
    });

    it("defaults the alignment to identity when the raw result carries none", () => {
        const raw = { detection: { kind: "puzzleboard", corners: [] }, decode: {}, observed_edges: [] };
        const result = adaptPuzzleboardResult(raw, 1, 10, 10, {});
        expect(result.alignment).toEqual({ transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] });
    });
});
