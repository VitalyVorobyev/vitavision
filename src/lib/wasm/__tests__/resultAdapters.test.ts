import { describe, it, expect } from "vitest";
import type { ChessCornersResult, CalibrationTargetResult } from "../../types";

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
    const corners = Array.from({ length: cornerCount }, (_, i) => {
        const axis0Angle = (i * Math.PI) / Math.max(cornerCount, 1);
        const axis1Angle = axis0Angle + Math.PI / 2;
        return {
            id: crypto.randomUUID(),
            x: 100 + i * 10,
            y: 200 + i * 5,
            x_norm: (100 + i * 10) / 640,
            y_norm: (200 + i * 5) / 480,
            response: 0.5 + i * 0.1,
            contrast: 0.3 + i * 0.02,
            fit_rms: 0.05 + i * 0.01,
            axes: [
                {
                    angle_rad: axis0Angle,
                    angle_deg: axis0Angle * 180 / Math.PI,
                    sigma_rad: 0.05,
                    direction: { dx: Math.cos(axis0Angle), dy: Math.sin(axis0Angle) },
                },
                {
                    angle_rad: axis1Angle,
                    angle_deg: axis1Angle * 180 / Math.PI,
                    sigma_rad: 0.06,
                    direction: { dx: Math.cos(axis1Angle), dy: Math.sin(axis1Angle) },
                },
            ] as [ChessCornersResult["corners"][0]["axes"][0], ChessCornersResult["corners"][0]["axes"][0]],
            confidence: i / Math.max(cornerCount - 1, 1),
            confidence_level: (i / Math.max(cornerCount - 1, 1) < 0.33
                ? "low"
                : i / Math.max(cornerCount - 1, 1) < 0.66
                  ? "medium"
                  : "high") as "low" | "medium" | "high",
        };
    });

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
            threshold_rel: 0.2,
            nms_radius: 2,
            broad_mode: false,
            min_cluster_size: 2,
            pyramid_levels: 4,
            pyramid_min_size: 128,
            upscale_factor: 0,
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
            expect(typeof corner.contrast).toBe("number");
            expect(typeof corner.fit_rms).toBe("number");
            expect(corner.axes).toHaveLength(2);
            expect(typeof corner.axes[0].angle_rad).toBe("number");
            expect(typeof corner.axes[0].direction.dx).toBe("number");
            expect(typeof corner.axes[0].direction.dy).toBe("number");
            expect(typeof corner.axes[1].angle_rad).toBe("number");
            expect(typeof corner.axes[1].direction.dx).toBe("number");
            expect(typeof corner.confidence).toBe("number");
            expect(["low", "medium", "high"]).toContain(corner.confidence_level);
        }
    });

    it("axes[0].direction matches cos/sin of angle_rad", () => {
        const result = mockChessCornersResult(3);
        for (const corner of result.corners) {
            expect(corner.axes[0].direction.dx).toBeCloseTo(Math.cos(corner.axes[0].angle_rad), 5);
            expect(corner.axes[0].direction.dy).toBeCloseTo(Math.sin(corner.axes[0].angle_rad), 5);
        }
    });

    it("handles empty detection", () => {
        const result = mockChessCornersResult(0);
        expect(result.summary.count).toBe(0);
        expect(result.corners).toHaveLength(0);
        expect(result.summary.response_min).toBeNull();
    });

    it("produces features compatible with toFeatures", () => {
        const result = mockChessCornersResult(3);
        const corner = result.corners[0];
        expect(corner).toHaveProperty("id");
        expect(corner).toHaveProperty("x");
        expect(corner).toHaveProperty("y");
        expect(corner).toHaveProperty("axes");
        expect(corner.axes[0]).toHaveProperty("direction");
        expect(corner.axes[0].direction).toHaveProperty("dx");
        expect(corner.axes[0].direction).toHaveProperty("dy");
        expect(corner).toHaveProperty("confidence");
        expect(corner.axes[0]).toHaveProperty("angle_rad");
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

// ── Radsym ───────────────────────────────────────────────────────────────────

function mockRadsymResult(circleCount: number) {
    const circles = Array.from({ length: circleCount }, (_, i) => ({
        id: crypto.randomUUID(),
        x: 100 + i * 30,
        y: 150 + i * 20,
        radius: 10 + i * 5,
        score: 0.5 + i * 0.1,
    }));

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: 640,
        image_height: 480,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        summary: {
            count: circleCount,
            runtime_ms: 33.7,
        },
        circles,
    };
}

describe("Radsym WASM result shape", () => {
    it("has all required RadsymResult fields", () => {
        const result = mockRadsymResult(5);
        expect(result.status).toBe("success");
        expect(result.image_width).toBe(640);
        expect(result.image_height).toBe(480);
        expect(result.frame.name).toBe("image_px_center");
        expect(result.summary.count).toBe(5);
        expect(typeof result.summary.runtime_ms).toBe("number");
    });

    it("produces valid circle detections", () => {
        const result = mockRadsymResult(3);
        for (const circle of result.circles) {
            expect(typeof circle.id).toBe("string");
            expect(circle.id.length).toBeGreaterThan(0);
            expect(typeof circle.x).toBe("number");
            expect(typeof circle.y).toBe("number");
            expect(typeof circle.radius).toBe("number");
            expect(circle.radius).toBeGreaterThan(0);
            expect(typeof circle.score).toBe("number");
        }
    });

    it("handles empty detection", () => {
        const result = mockRadsymResult(0);
        expect(result.summary.count).toBe(0);
        expect(result.circles).toHaveLength(0);
    });

    it("produces features compatible with toFeatures", () => {
        const result = mockRadsymResult(2);
        const circle = result.circles[0];
        expect(circle).toHaveProperty("id");
        expect(circle).toHaveProperty("x");
        expect(circle).toHaveProperty("y");
        expect(circle).toHaveProperty("radius");
        expect(circle).toHaveProperty("score");
    });
});

// ── Ringgrid WASM ────────────────────────────────────────────────────────────

function mockRinggridWasmResult(markerCount: number) {
    const markers = Array.from({ length: markerCount }, (_, i) => ({
        id: i,
        confidence: 0.8 + i * 0.02,
        center: { x: 100 + i * 50, y: 200 + i * 30 },
        ellipse_outer: { cx: 100 + i * 50, cy: 200 + i * 30, a: 20, b: 19, angle: 0.1 },
        ellipse_inner: { cx: 100 + i * 50, cy: 200 + i * 30, a: 12, b: 11.5, angle: 0.1 },
        decode: {
            best_id: i,
            best_rotation: 0,
            best_dist: 1,
            margin: 3,
            decode_confidence: 0.9,
        },
        fit: {
            rms_residual_outer: 0.5,
            rms_residual_inner: 0.4,
            ransac_inlier_ratio_outer: 0.95,
            ransac_inlier_ratio_inner: 0.93,
        },
        board_xy_mm: { x: i * 8.0, y: 0 },
    }));

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: 1920,
        image_height: 1080,
        summary: {
            marker_count: markerCount,
            runtime_ms: 250.0,
        },
        markers,
    };
}

describe("Ringgrid WASM result shape", () => {
    it("has all required RinggridDetectResult fields", () => {
        const result = mockRinggridWasmResult(10);
        expect(result.status).toBe("success");
        expect(result.image_width).toBe(1920);
        expect(result.summary.marker_count).toBe(10);
        expect(typeof result.summary.runtime_ms).toBe("number");
    });

    it("produces valid marker data", () => {
        const result = mockRinggridWasmResult(3);
        for (const marker of result.markers) {
            expect(typeof marker.id).toBe("number");
            expect(typeof marker.confidence).toBe("number");
            expect(marker.center).toHaveProperty("x");
            expect(marker.center).toHaveProperty("y");
            expect(marker.ellipse_outer).toHaveProperty("cx");
            expect(marker.ellipse_outer).toHaveProperty("a");
            expect(marker.ellipse_outer).toHaveProperty("angle");
            expect(marker.ellipse_inner).toHaveProperty("cx");
        }
    });

    it("includes decode and fit data", () => {
        const result = mockRinggridWasmResult(1);
        const marker = result.markers[0];
        expect(marker.decode).not.toBeNull();
        expect(marker.decode!.best_id).toBe(0);
        expect(typeof marker.decode!.decode_confidence).toBe("number");
        expect(marker.fit).not.toBeNull();
        expect(typeof marker.fit!.rms_residual_outer).toBe("number");
    });

    it("handles empty detection", () => {
        const result = mockRinggridWasmResult(0);
        expect(result.summary.marker_count).toBe(0);
        expect(result.markers).toHaveLength(0);
    });
});
