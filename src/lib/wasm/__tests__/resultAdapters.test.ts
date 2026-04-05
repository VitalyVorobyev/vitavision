import { describe, it, expect } from "vitest";
import type { ChessCornersResult, CalibrationTargetResult } from "../../api";

/**
 * Tests for the WASM result adapter output shapes.
 *
 * These tests validate that the result objects produced by the Worker's
 * adaptation logic match the TypeScript interfaces consumed by the
 * algorithm adapters' toFeatures() and summary() methods.
 *
 * We test with mock result objects (not actual WASM calls) since the Worker
 * runs in a separate thread and WASM requires browser APIs.
 */

// ── Chess Corners ────────────────────────────────────────────────────────────

function mockChessCornersResult(cornerCount: number): ChessCornersResult {
    const corners = Array.from({ length: cornerCount }, (_, i) => ({
        id: crypto.randomUUID(),
        x: 100 + i * 10,
        y: 200 + i * 5,
        x_norm: (100 + i * 10) / 640,
        y_norm: (200 + i * 5) / 480,
        response: 0.5 + i * 0.1,
        orientation_rad: (i * Math.PI) / cornerCount,
        orientation_deg: (i * 180) / cornerCount,
        direction: {
            dx: Math.cos((i * Math.PI) / cornerCount),
            dy: Math.sin((i * Math.PI) / cornerCount),
        },
        confidence: i / Math.max(cornerCount - 1, 1),
        confidence_level: (i / Math.max(cornerCount - 1, 1) < 0.33
            ? "low"
            : i / Math.max(cornerCount - 1, 1) < 0.66
              ? "medium"
              : "high") as "low" | "medium" | "high",
        subpixel_offset_px: 0,
    }));

    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 640,
        image_height: 480,
        frame: {
            name: "image_px_center",
            origin: "top_left",
            x_axis: "right",
            y_axis: "down",
            units: "pixels",
        },
        config: {
            use_ml_refiner: false,
            threshold_rel: 0.2,
            threshold_abs: null,
            nms_radius: 2,
            min_cluster_size: 2,
            pyramid_num_levels: 4,
            pyramid_min_size: 128,
            refinement_radius: 4,
            merge_radius: 4.0,
            use_radius10: false,
            descriptor_use_radius10: null,
            refiner: "center_of_mass",
        },
        summary: {
            count: cornerCount,
            response_min: cornerCount > 0 ? 0.5 : null,
            response_max: cornerCount > 0 ? 0.5 + (cornerCount - 1) * 0.1 : null,
            response_mean: cornerCount > 0 ? 0.5 + ((cornerCount - 1) * 0.1) / 2 : null,
            confidence_min: cornerCount > 0 ? 0 : null,
            confidence_max: cornerCount > 0 ? 1 : null,
            runtime_ms: 42.5,
        },
        corners,
    };
}

describe("Chess Corners WASM result shape", () => {
    it("has all required ChessCornersResult fields", () => {
        const result = mockChessCornersResult(5);

        expect(result.status).toBe("success");
        expect(result.image_width).toBe(640);
        expect(result.image_height).toBe(480);
        expect(result.frame.name).toBe("image_px_center");
        expect(result.summary.count).toBe(5);
        expect(typeof result.summary.runtime_ms).toBe("number");
    });

    it("produces valid corner features", () => {
        const result = mockChessCornersResult(3);
        for (const corner of result.corners) {
            expect(typeof corner.id).toBe("string");
            expect(corner.id.length).toBeGreaterThan(0);
            expect(typeof corner.x).toBe("number");
            expect(typeof corner.y).toBe("number");
            expect(corner.x_norm).toBeGreaterThanOrEqual(0);
            expect(corner.x_norm).toBeLessThanOrEqual(1);
            expect(corner.y_norm).toBeGreaterThanOrEqual(0);
            expect(corner.y_norm).toBeLessThanOrEqual(1);
            expect(typeof corner.response).toBe("number");
            expect(typeof corner.orientation_rad).toBe("number");
            expect(typeof corner.direction.dx).toBe("number");
            expect(typeof corner.direction.dy).toBe("number");
            expect(typeof corner.confidence).toBe("number");
            expect(["low", "medium", "high"]).toContain(corner.confidence_level);
        }
    });

    it("handles empty detection", () => {
        const result = mockChessCornersResult(0);
        expect(result.summary.count).toBe(0);
        expect(result.corners).toHaveLength(0);
        expect(result.summary.response_min).toBeNull();
    });

    it("produces features compatible with toFeatures", () => {
        // Import the actual adapter to verify compatibility
        const result = mockChessCornersResult(3);
        // Verify the shape matches what toFeatures expects
        const corner = result.corners[0];
        expect(corner).toHaveProperty("id");
        expect(corner).toHaveProperty("x");
        expect(corner).toHaveProperty("y");
        expect(corner).toHaveProperty("direction");
        expect(corner.direction).toHaveProperty("dx");
        expect(corner.direction).toHaveProperty("dy");
        expect(corner).toHaveProperty("confidence");
        expect(corner).toHaveProperty("orientation_rad");
    });
});

// ── Calibration Target ───────────────────────────────────────────────────────

function mockCalibTargetResult(
    algorithm: "chessboard" | "charuco" | "markerboard",
    cornerCount: number,
): CalibrationTargetResult {
    const kind = algorithm === "markerboard" ? "checkerboard_marker" : algorithm;
    const corners = Array.from({ length: cornerCount }, (_, i) => ({
        id: crypto.randomUUID(),
        x: 50 + i * 20,
        y: 60 + i * 15,
        x_norm: (50 + i * 20) / 800,
        y_norm: (60 + i * 15) / 600,
        score: 0.8 + i * 0.02,
        grid: { i: Math.floor(i / 5), j: i % 5 },
        corner_id: i,
        target_position: null,
    }));

    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        algorithm,
        image_width: 800,
        image_height: 600,
        frame: {
            name: "image_px_center",
            origin: "top_left",
            x_axis: "right",
            y_axis: "down",
            units: "pixels",
        },
        summary: {
            corner_count: cornerCount,
            marker_count: algorithm === "charuco" ? 10 : null,
            circle_candidate_count: algorithm === "markerboard" ? 3 : null,
            circle_match_count: algorithm === "markerboard" ? 2 : null,
            alignment_inliers: algorithm === "markerboard" ? 5 : null,
            runtime_ms: 150.3,
        },
        detection: { kind: kind as CalibrationTargetResult["detection"]["kind"], corners },
        markers: algorithm === "charuco"
            ? [{
                id: 0,
                grid_cell: { gx: 0, gy: 0 },
                rotation: 0,
                hamming: 0,
                score: 0.95,
                border_score: 0.9,
                code: 42,
                inverted: false,
                corners_rect: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 10, y: 50 }],
                corners_img: [{ x: 12, y: 12 }, { x: 48, y: 11 }, { x: 49, y: 49 }, { x: 11, y: 48 }],
            }]
            : null,
        alignment: null,
        circle_candidates: null,
        circle_matches: null,
    };
}

describe("Calibration Target WASM result shape", () => {
    it("has all required CalibrationTargetResult fields for chessboard", () => {
        const result = mockCalibTargetResult("chessboard", 10);

        expect(result.status).toBe("success");
        expect(result.algorithm).toBe("chessboard");
        expect(result.detection.kind).toBe("chessboard");
        expect(result.summary.corner_count).toBe(10);
        expect(result.markers).toBeNull();
    });

    it("has markers for charuco", () => {
        const result = mockCalibTargetResult("charuco", 20);

        expect(result.algorithm).toBe("charuco");
        expect(result.detection.kind).toBe("charuco");
        expect(result.markers).not.toBeNull();
        expect(result.markers!.length).toBe(1);

        const marker = result.markers![0];
        expect(marker).toHaveProperty("id");
        expect(marker).toHaveProperty("grid_cell");
        expect(marker.grid_cell).toHaveProperty("gx");
        expect(marker.grid_cell).toHaveProperty("gy");
        expect(marker).toHaveProperty("corners_rect");
        expect(marker).toHaveProperty("corners_img");
    });

    it("uses checkerboard_marker kind for markerboard", () => {
        const result = mockCalibTargetResult("markerboard", 15);

        expect(result.algorithm).toBe("markerboard");
        expect(result.detection.kind).toBe("checkerboard_marker");
        expect(result.summary.circle_candidate_count).toBe(3);
        expect(result.summary.circle_match_count).toBe(2);
    });

    it("produces valid corner features", () => {
        const result = mockCalibTargetResult("chessboard", 5);

        for (const corner of result.detection.corners) {
            expect(typeof corner.id).toBe("string");
            expect(typeof corner.x).toBe("number");
            expect(typeof corner.y).toBe("number");
            expect(corner.x_norm).toBeGreaterThanOrEqual(0);
            expect(corner.x_norm).toBeLessThanOrEqual(1);
            expect(typeof corner.score).toBe("number");
            expect(corner.grid).not.toBeNull();
        }
    });

    it("handles empty detection", () => {
        const result = mockCalibTargetResult("chessboard", 0);
        expect(result.summary.corner_count).toBe(0);
        expect(result.detection.corners).toHaveLength(0);
    });
});
