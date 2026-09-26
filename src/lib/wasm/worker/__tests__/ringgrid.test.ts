import { describe, it, expect } from "vitest";
import { adaptRinggridResult } from "../ringgrid";

describe("adaptRinggridResult", () => {
    it("has no `frame` field, unlike the other adapters' envelopes", () => {
        const result = adaptRinggridResult(JSON.stringify({ detected_markers: [] }), 640, 480, 1);
        expect(result).not.toHaveProperty("frame");
    });

    it("handles a missing detected_markers array as empty", () => {
        const result = adaptRinggridResult(JSON.stringify({}), 640, 480, 1);
        expect(result.markers).toHaveLength(0);
        expect(result.summary.marker_count).toBe(0);
    });

    it("maps a full marker with decode, fit, and board_xy_mm", () => {
        const raw = {
            detected_markers: [
                {
                    center: [12, 34],
                    confidence: 0.8,
                    ellipse_outer: { cx: 12, cy: 34, a: 20, b: 19, angle: 0.1 },
                    ellipse_inner: { cx: 12, cy: 34, a: 10, b: 9, angle: 0.1 },
                    decode: { best_id: 7, best_rotation: 1, best_dist: 2, margin: 3, confidence: 0.95 },
                    fit: { rms_residual_outer: 0.1, rms_residual_inner: 0.2, ransac_inlier_ratio_outer: 0.9, ransac_inlier_ratio_inner: 0.8 },
                    board_xy_mm: [5, 6],
                },
            ],
        };
        const result = adaptRinggridResult(JSON.stringify(raw), 640, 480, 9);
        expect(result.markers).toHaveLength(1);
        const m = result.markers[0];
        expect(m.id).toBe(7); // id comes from decode.best_id, not a top-level field
        expect(m.center).toEqual({ x: 12, y: 34 });
        expect(m.decode).toEqual({ best_id: 7, best_rotation: 1, best_dist: 2, margin: 3, decode_confidence: 0.95 });
        expect(m.fit).toEqual({ rms_residual_outer: 0.1, rms_residual_inner: 0.2, ransac_inlier_ratio_outer: 0.9, ransac_inlier_ratio_inner: 0.8 });
        expect(m.board_xy_mm).toEqual({ x: 5, y: 6 });
        expect(result.summary.runtime_ms).toBe(9);
    });

    it("defaults id to 0 and decode/fit/board_xy_mm to null when absent", () => {
        const raw = {
            detected_markers: [
                { center: [1, 2], ellipse_outer: { cx: 1, cy: 2, a: 1, b: 1, angle: 0 }, decode: null, fit: null, board_xy_mm: null },
            ],
        };
        const result = adaptRinggridResult(JSON.stringify(raw), 10, 10, 1);
        const m = result.markers[0];
        expect(m.id).toBe(0);
        expect(m.decode).toBeNull();
        expect(m.fit).toBeNull();
        expect(m.board_xy_mm).toBeNull();
    });

    it("falls back ellipse_inner to a degenerate ellipse at the center when absent", () => {
        const raw = {
            detected_markers: [
                { center: [3, 4], ellipse_outer: { cx: 3, cy: 4, a: 5, b: 5, angle: 0 } },
            ],
        };
        const result = adaptRinggridResult(JSON.stringify(raw), 10, 10, 1);
        expect(result.markers[0].ellipse_inner).toEqual({ cx: 3, cy: 4, a: 0, b: 0, angle: 0 });
    });
});
