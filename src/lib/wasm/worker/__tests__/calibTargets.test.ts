import { describe, it, expect } from "vitest";
import { adaptCalibTargetResult } from "../calibTargets";

describe("adaptCalibTargetResult", () => {
    it("returns an empty chessboard result when raw is null (no detection)", () => {
        const result = adaptCalibTargetResult(null, "chessboard", 640, 480, 12);
        expect(result.status).toBe("success");
        expect(result.algorithm).toBe("chessboard");
        expect(result.detection).toEqual({ kind: "chessboard", corners: [] });
        expect(result.summary.corner_count).toBe(0);
        expect(result.markers).toBeNull();
        expect(result.alignment).toBeNull();
    });

    it("uses the checkerboard_marker kind for an empty markerboard result", () => {
        const result = adaptCalibTargetResult(undefined, "markerboard", 640, 480, 1);
        expect(result.detection.kind).toBe("checkerboard_marker");
    });

    it("maps chessboard corners, converting {u,v} grid to {i,j} and computing normalized coords", () => {
        const raw = {
            detection: {
                kind: "chessboard",
                corners: [
                    { position: [64, 48], grid: { u: 1, v: 2 }, score: 0.9, input_index: 5 },
                ],
            },
        };
        const result = adaptCalibTargetResult(raw, "chessboard", 640, 480, 3);
        expect(result.detection.corners).toHaveLength(1);
        const c = result.detection.corners[0];
        expect(c.x).toBe(64);
        expect(c.y).toBe(48);
        expect(c.x_norm).toBeCloseTo(0.1);
        expect(c.y_norm).toBeCloseTo(0.1);
        expect(c.grid).toEqual({ i: 1, j: 2 });
        expect(c.corner_id).toBe(5); // input_index preferred over array index
        expect(result.summary.corner_count).toBe(1);
    });

    it("falls back corner_id to array index when neither input_index nor id is present", () => {
        const raw = { detection: { kind: "chessboard", corners: [{ position: [0, 0], grid: null, score: 0 }] } };
        const result = adaptCalibTargetResult(raw, "chessboard", 10, 10, 1);
        expect(result.detection.corners[0].corner_id).toBe(0);
        expect(result.detection.corners[0].grid).toBeNull();
    });

    it("maps charuco markers, converting gc {u,v} to grid_cell {gx,gy}", () => {
        const raw = {
            detection: { kind: "charuco", corners: [] },
            markers: [
                {
                    id: 3,
                    gc: { u: 2, v: 4 },
                    rotation: 0,
                    hamming: 0,
                    score: 0.95,
                    border_score: 0.8,
                    code: 7,
                    inverted: false,
                    corners_rect: [[0, 0], [1, 0], [1, 1], [0, 1]],
                    corners_img: null,
                },
            ],
        };
        const result = adaptCalibTargetResult(raw, "charuco", 100, 100, 1);
        expect(result.markers).toHaveLength(1);
        expect(result.markers![0].grid_cell).toEqual({ gx: 2, gy: 4 });
        expect(result.markers![0].corners_img).toBeNull();
        expect(result.summary.marker_count).toBe(1);
    });

    it("maps markerboard circle candidates/matches and converts the alignment matrix", () => {
        const raw = {
            detection: { kind: "checkerboard_marker", corners: [] },
            circle_candidates: [
                { center_img: [5, 6], cell: { i: 0, j: 0 }, polarity: "white", score: 0.5, contrast: 0.2 },
            ],
            circle_matches: [
                { expected: { cell: { i: 0, j: 0 }, polarity: "white" }, matched_index: 0, distance_cells: 0, offset_cells: { di: 0, dj: 0 } },
                { expected: { cell: { i: 1, j: 1 }, polarity: "black" }, matched_index: null, distance_cells: null, offset_cells: null },
            ],
            alignment_inliers: 3,
            alignment: { matrix: [[1, 0], [0, 1]], translation: [2, 3] },
        };
        const result = adaptCalibTargetResult(raw, "markerboard", 100, 100, 1);
        expect(result.circle_candidates).toHaveLength(1);
        expect(result.circle_matches).toHaveLength(2);
        expect(result.summary.circle_candidate_count).toBe(1);
        expect(result.summary.circle_match_count).toBe(1); // only the matched one counts
        expect(result.summary.alignment_inliers).toBe(3);
        expect(result.alignment).toEqual({ transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [2, 3] });
    });

    it("does not populate circle/alignment fields for chessboard", () => {
        const raw = { detection: { kind: "chessboard", corners: [] } };
        const result = adaptCalibTargetResult(raw, "chessboard", 10, 10, 1);
        expect(result.circle_candidates).toBeNull();
        expect(result.circle_matches).toBeNull();
        expect(result.summary.alignment_inliers).toBeNull();
    });
});
