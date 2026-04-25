import { describe, it, expect } from "vitest";
import type { ChessCornersResult, CalibrationTargetResult, CalibrationTargetAlgorithm, CalibrationTargetKind, RinggridDetectResult, RadsymResult, PuzzleBoardDetectResult } from "../../../../lib/types";
import { chessCornersAlgorithm } from "../chessCorners/adapter";
import { chessboardAlgorithm } from "../calibrationTargets/chessboardAdapter";
import { charucoAlgorithm } from "../calibrationTargets/charucoAdapter";
import { markerboardAlgorithm } from "../calibrationTargets/markerboardAdapter";
import { ringgridAlgorithm } from "../ringgrid/adapter";
import { radsymAlgorithm } from "../radsym/adapter";
import { puzzleboardAlgorithm } from "../puzzleboard/adapter";

// ── Mock result builders ────────────────────────────────────────────────────

function mockChessCornersResult(count: number): ChessCornersResult {
    const axis0Angle = Math.PI / 4;
    const axis1Angle = axis0Angle + Math.PI / 2;
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 640,
        image_height: 480,
        frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
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
            count,
            response_min: count > 0 ? 0.1 : null,
            response_max: count > 0 ? 0.9 : null,
            response_mean: count > 0 ? 0.5 : null,
            confidence_min: count > 0 ? 0.2 : null,
            confidence_max: count > 0 ? 1.0 : null,
            runtime_ms: 12.5,
        },
        corners: Array.from({ length: count }, (_, i) => ({
            id: `corner-${i}`,
            x: 50 + i * 20,
            y: 60 + i * 15,
            x_norm: (50 + i * 20) / 640,
            y_norm: (60 + i * 15) / 480,
            response: 0.5,
            contrast: 0.3,
            fit_rms: 0.1,
            axes: [
                { angle_rad: axis0Angle, angle_deg: 45, sigma_rad: 0.05, direction: { dx: Math.cos(axis0Angle), dy: Math.sin(axis0Angle) } },
                { angle_rad: axis1Angle, angle_deg: 135, sigma_rad: 0.06, direction: { dx: Math.cos(axis1Angle), dy: Math.sin(axis1Angle) } },
            ],
            confidence: 0.8,
            confidence_level: "high" as const,
        })),
    };
}

function mockCalibResult(algorithm: CalibrationTargetAlgorithm, cornerCount: number, markerCount = 0): CalibrationTargetResult {
    const kind: CalibrationTargetKind = algorithm === "markerboard" ? "checkerboard_marker" : algorithm;
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        algorithm,
        image_width: 1024,
        image_height: 768,
        frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
        summary: {
            corner_count: cornerCount,
            marker_count: algorithm === "charuco" ? markerCount : null,
            circle_candidate_count: algorithm === "markerboard" ? 3 : null,
            circle_match_count: algorithm === "markerboard" ? 2 : null,
            alignment_inliers: algorithm === "markerboard" ? 10 : null,
            runtime_ms: 45.2,
        },
        detection: {
            kind,
            corners: Array.from({ length: cornerCount }, (_, i) => ({
                id: `cal-corner-${i}`,
                x: 100 + i * 10,
                y: 200 + i * 8,
                x_norm: (100 + i * 10) / 1024,
                y_norm: (200 + i * 8) / 768,
                score: 0.95,
                grid: { i: Math.floor(i / 7), j: i % 7 },
                corner_id: i,
                target_position: null,
            })),
        },
        markers: algorithm === "charuco" ? Array.from({ length: markerCount }, (_, i) => ({
            id: i,
            grid_cell: { gx: i, gy: 0 },
            rotation: 0,
            hamming: 0,
            score: 0.9,
            border_score: 0.8,
            code: i * 10,
            inverted: false,
            corners_rect: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
            corners_img: [{ x: 100 + i * 50, y: 200 }, { x: 110 + i * 50, y: 200 }, { x: 110 + i * 50, y: 210 }, { x: 100 + i * 50, y: 210 }],
        })) : null,
        alignment: null,
        circle_candidates: null,
        circle_matches: null,
    };
}

function mockRinggridResult(markerCount: number): RinggridDetectResult {
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 800,
        image_height: 600,
        summary: { marker_count: markerCount, runtime_ms: 33.1 },
        markers: Array.from({ length: markerCount }, (_, i) => ({
            id: i,
            confidence: 0.95,
            center: { x: 100 + i * 40, y: 200 + i * 30 },
            ellipse_outer: { cx: 100 + i * 40, cy: 200 + i * 30, a: 20, b: 18, angle: 0.1 },
            ellipse_inner: { cx: 100 + i * 40, cy: 200 + i * 30, a: 10, b: 9, angle: 0.1 },
            decode: { best_id: i, best_rotation: 0, best_dist: 0, margin: 1, decode_confidence: 0.9 },
            fit: { rms_residual_outer: 0.5, rms_residual_inner: 0.3, ransac_inlier_ratio_outer: 0.95, ransac_inlier_ratio_inner: 0.9 },
            board_xy_mm: { x: i * 8, y: 0 },
        })),
    };
}

function mockRadsymResult(count: number): RadsymResult {
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 800,
        image_height: 600,
        frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
        summary: { count, runtime_ms: 18.7 },
        circles: Array.from({ length: count }, (_, i) => ({
            id: `circle-${i}`,
            x: 100 + i * 40,
            y: 150 + i * 30,
            radius: 8 + i * 3,
            score: 0.9 - i * 0.05,
        })),
    };
}

// ── Chess Corners adapter ───────────────────────────────────────────────────

describe("chessCornersAlgorithm", () => {
    it("is WASM-only", () => {
        expect(chessCornersAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(chessCornersAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps corners to directed_point features", () => {
        const result = mockChessCornersResult(5);
        const features = chessCornersAlgorithm.toFeatures(result, "run-1");

        expect(features).toHaveLength(5);
        for (const f of features) {
            expect(f.type).toBe("directed_point");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("chess-corners");
            expect(f.runId).toBe("run-1");
            expect(f.readonly).toBe(true);
        }
    });

    it("applies +0.5 pixel offset", () => {
        const result = mockChessCornersResult(1);
        const features = chessCornersAlgorithm.toFeatures(result, "run-1");
        expect(features[0].type === "directed_point" && features[0].x).toBe(result.corners[0].x + 0.5);
    });

    it("emits two axes with dx/dy/angleRad/sigmaRad", () => {
        const result = mockChessCornersResult(1);
        const features = chessCornersAlgorithm.toFeatures(result, "run-1");
        const f = features[0];
        if (f.type === "directed_point") {
            expect(f.axes).toHaveLength(2);
            expect(f.axes[0].dx).toBeCloseTo(result.corners[0].axes[0].direction.dx, 5);
            expect(f.axes[0].dy).toBeCloseTo(result.corners[0].axes[0].direction.dy, 5);
            expect(f.axes[0].angleRad).toBeCloseTo(result.corners[0].axes[0].angle_rad, 5);
            expect(f.axes[0].sigmaRad).toBeCloseTo(result.corners[0].axes[0].sigma_rad, 5);
            expect(f.axes[1].dx).toBeCloseTo(result.corners[0].axes[1].direction.dx, 5);
            expect(f.axes[1].dy).toBeCloseTo(result.corners[0].axes[1].direction.dy, 5);
            expect(f.axes[1].angleRad).toBeCloseTo(result.corners[0].axes[1].angle_rad, 5);
            expect(f.axes[1].sigmaRad).toBeCloseTo(result.corners[0].axes[1].sigma_rad, 5);
            expect(f.contrast).toBeCloseTo(result.corners[0].contrast, 5);
            expect(f.fitRms).toBeCloseTo(result.corners[0].fit_rms, 5);
        }
    });

    it("does not emit direction or orientationRad fields", () => {
        const result = mockChessCornersResult(1);
        const features = chessCornersAlgorithm.toFeatures(result, "run-1");
        const f = features[0] as unknown as Record<string, unknown>;
        expect(f["direction"]).toBeUndefined();
        expect(f["orientationRad"]).toBeUndefined();
    });

    it("handles empty result", () => {
        const result = mockChessCornersResult(0);
        const features = chessCornersAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(0);
    });

    it("summary returns count and runtime", () => {
        const result = mockChessCornersResult(10);
        const summary = chessCornersAlgorithm.summary(result);
        expect(summary).toEqual([
            { label: "Corners", value: "10" },
            { label: "Runtime", value: "12.50 ms" },
        ]);
    });

    it("diagnostics warns on zero corners", () => {
        const result = mockChessCornersResult(0);
        const diags = chessCornersAlgorithm.diagnostics!(result);
        expect(diags.length).toBe(1);
        expect(diags[0].level).toBe("warning");
    });

    it("diagnostics empty on successful detection", () => {
        const result = mockChessCornersResult(5);
        const diags = chessCornersAlgorithm.diagnostics!(result);
        expect(diags).toHaveLength(0);
    });
});

// ── Chessboard adapter ──────────────────────────────────────────────────────

describe("chessboardAlgorithm", () => {
    it("is WASM-only", () => {
        expect(chessboardAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(chessboardAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps corners to point features", () => {
        const result = mockCalibResult("chessboard", 20);
        const features = chessboardAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(20);
        for (const f of features) {
            expect(f.type).toBe("point");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("chessboard");
        }
    });

    it("summary includes kind, corners, and runtime", () => {
        const result = mockCalibResult("chessboard", 77);
        const summary = chessboardAlgorithm.summary(result);
        expect(summary.find((e) => e.label === "Corners")?.value).toBe("77");
        expect(summary.find((e) => e.label === "Runtime")?.value).toContain("ms");
    });

    it("diagnostics error on zero corners", () => {
        const result = mockCalibResult("chessboard", 0);
        const diags = chessboardAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.level === "error")).toBe(true);
    });

    it("diagnostics warns on low corner count", () => {
        const result = mockCalibResult("chessboard", 5);
        const diags = chessboardAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.level === "warning")).toBe(true);
    });
});

// ── ChArUco adapter ─────────────────────────────────────────────────────────

describe("charucoAlgorithm", () => {
    it("is WASM-only", () => {
        expect(charucoAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(charucoAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps corners and markers", () => {
        const result = mockCalibResult("charuco", 30, 5);
        const features = charucoAlgorithm.toFeatures(result, "run-1");
        const points = features.filter((f) => f.type === "point");
        const markers = features.filter((f) => f.type === "aruco_marker");
        expect(points).toHaveLength(30);
        expect(markers).toHaveLength(5);
    });

    it("handles result with no markers", () => {
        const result = mockCalibResult("charuco", 10, 0);
        const features = charucoAlgorithm.toFeatures(result, "run-1");
        const markers = features.filter((f) => f.type === "aruco_marker");
        expect(markers).toHaveLength(0);
    });

    it("summary includes marker count", () => {
        const result = mockCalibResult("charuco", 30, 5);
        const summary = charucoAlgorithm.summary(result);
        expect(summary.find((e) => e.label === "Markers")?.value).toBe("5");
    });

    it("diagnostics warns when no markers detected", () => {
        const result = mockCalibResult("charuco", 10, 0);
        const diags = charucoAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.message.includes("No ArUco markers"))).toBe(true);
    });
});

// ── Marker Board adapter ────────────────────────────────────────────────────

describe("markerboardAlgorithm", () => {
    it("is WASM-only", () => {
        expect(markerboardAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(markerboardAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps corners", () => {
        const result = mockCalibResult("markerboard", 50);
        const features = markerboardAlgorithm.toFeatures(result, "run-1");
        expect(features.length).toBeGreaterThanOrEqual(50);
    });

    it("diagnostics error on zero corners", () => {
        const result = mockCalibResult("markerboard", 0);
        const diags = markerboardAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.level === "error")).toBe(true);
    });
});

// ── Ring Grid adapter ───────────────────────────────────────────────────────

describe("ringgridAlgorithm", () => {
    it("is WASM-only", () => {
        expect(ringgridAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(ringgridAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps markers to ring_marker features", () => {
        const result = mockRinggridResult(8);
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(8);
        for (const f of features) {
            expect(f.type).toBe("ring_marker");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("ringgrid");
            expect(f.readonly).toBe(true);
        }
    });

    it("applies +0.5 pixel offset to center", () => {
        const result = mockRinggridResult(1);
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        const f = features[0];
        expect(f.type === "ring_marker" && f.x).toBe(result.markers[0].center.x + 0.5);
    });

    it("converts ellipse angle from radians to degrees", () => {
        const result = mockRinggridResult(1);
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        const f = features[0];
        if (f.type === "ring_marker") {
            const expected = result.markers[0].ellipse_outer.angle * (180 / Math.PI);
            expect(f.outerEllipse.angleDeg).toBeCloseTo(expected, 5);
        }
    });

    it("board JSON overrides only user-configured fields", () => {
        // The adapter sends only user fields; the worker merges with WASM defaults
        // that provide `schema`, `name`, etc.
        const config = ringgridAlgorithm.initialConfig as { rows: number; longRowCols: number; pitchMm: number; markerOuterRadiusMm: number; markerInnerRadiusMm: number; markerRingWidthMm: number };
        const boardJson = JSON.stringify({
            rows: config.rows,
            long_row_cols: config.longRowCols,
            pitch_mm: config.pitchMm,
            marker_outer_radius_mm: config.markerOuterRadiusMm,
            marker_inner_radius_mm: config.markerInnerRadiusMm,
            marker_ring_width_mm: config.markerRingWidthMm,
        });
        const parsed = JSON.parse(boardJson);
        // User fields are present
        expect(parsed.rows).toBe(15);
        expect(parsed.long_row_cols).toBe(14);
        // Schema/name are NOT in user JSON — the worker merges from defaults
        expect(parsed.schema).toBeUndefined();
        expect(parsed.name).toBeUndefined();
    });

    it("summary returns marker count and runtime", () => {
        const result = mockRinggridResult(12);
        const summary = ringgridAlgorithm.summary(result);
        expect(summary).toEqual([
            { label: "Markers", value: "12" },
            { label: "Runtime", value: "33.10 ms" },
        ]);
    });

    it("diagnostics warns on zero markers", () => {
        const result = mockRinggridResult(0);
        const diags = ringgridAlgorithm.diagnostics!(result);
        expect(diags.length).toBe(1);
        expect(diags[0].level).toBe("warning");
    });

    it("handles empty result", () => {
        const result = mockRinggridResult(0);
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(0);
    });

    it("assigns ringgrid_decoded kind to decoded markers", () => {
        const result = mockRinggridResult(1);
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        expect(features[0].meta?.kind).toBe("ringgrid_decoded");
    });

    it("assigns ringgrid_proposal kind to undecoded markers", () => {
        const result = mockRinggridResult(1);
        result.markers[0].decode = null;
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        expect(features[0].meta?.kind).toBe("ringgrid_proposal");
    });

    it("generates unique feature IDs even with duplicate marker IDs", () => {
        const result = mockRinggridResult(3);
        result.markers[0].decode = null;
        result.markers[1].decode = null;
        result.markers[2].decode = null;
        const features = ringgridAlgorithm.toFeatures(result, "run-1");
        const ids = features.map((f) => f.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

// ── Radsym adapter ──────────────────────────────────────────────────────────

describe("radsymAlgorithm", () => {
    it("is WASM-only", () => {
        expect(radsymAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(radsymAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures maps proposals to point features", () => {
        const result = mockRadsymResult(4);
        const features = radsymAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(4);
        for (const f of features) {
            expect(f.type).toBe("point");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("radsym");
            expect(f.readonly).toBe(true);
        }
    });

    it("applies +0.5 pixel offset", () => {
        const result = mockRadsymResult(1);
        const features = radsymAlgorithm.toFeatures(result, "run-1");
        expect(features[0].type === "point" && features[0].x).toBe(result.circles[0].x + 0.5);
    });

    it("preserves score in meta", () => {
        const result = mockRadsymResult(1);
        const features = radsymAlgorithm.toFeatures(result, "run-1");
        expect(features[0].meta?.score).toBe(result.circles[0].score);
    });

    it("summary returns count and runtime", () => {
        const result = mockRadsymResult(7);
        const summary = radsymAlgorithm.summary(result);
        expect(summary).toEqual([
            { label: "Proposals", value: "7" },
            { label: "Runtime", value: "18.70 ms" },
        ]);
    });

    it("diagnostics warns on zero circles", () => {
        const result = mockRadsymResult(0);
        const diags = radsymAlgorithm.diagnostics!(result);
        expect(diags.length).toBe(1);
        expect(diags[0].level).toBe("warning");
    });

    it("handles empty result", () => {
        const result = mockRadsymResult(0);
        const features = radsymAlgorithm.toFeatures(result, "run-1");
        expect(features).toHaveLength(0);
    });
});

// ── PuzzleBoard adapter ─────────────────────────────────────────────────────

function mockPuzzleboardResult(cornerCount: number, bitErrorRate = 0.05): PuzzleBoardDetectResult {
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 1280,
        image_height: 960,
        frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
        summary: {
            corner_count: cornerCount,
            mean_confidence: 0.82,
            bit_error_rate: bitErrorRate,
            master_origin: [3, 2],
            runtime_ms: 55.3,
        },
        detection: {
            kind: "puzzleboard",
            corners: Array.from({ length: cornerCount }, (_, idx) => ({
                id: `pb-corner-${idx}`,
                x: 100 + idx * 12 + 0.5,
                y: 200 + idx * 9 + 0.5,
                score: 0.88,
                grid: { i: Math.floor(idx / 5), j: idx % 5 },
                master_id: idx + 10,
                target_position: null,
            })),
        },
        alignment: {
            transform: { a: 1, b: 0, c: 0, d: 1 },
            translation: [0, 0],
        },
        decode: {
            edges_observed: 40,
            edges_matched: 38,
            mean_confidence: 0.82,
            bit_error_rate: bitErrorRate,
            master_origin_row: 3,
            master_origin_col: 2,
        },
        observed_edges: [],
    };
}

describe("puzzleboardAlgorithm", () => {
    it("is WASM-only", () => {
        expect(puzzleboardAlgorithm.executionModes).toEqual(["wasm"]);
    });

    it("run() throws", async () => {
        await expect(puzzleboardAlgorithm.run({ key: "", storageMode: "local", config: {} }))
            .rejects.toThrow("only available via client-side WASM");
    });

    it("toFeatures emits labeled_point features with gridIndex and masterId", () => {
        const result = mockPuzzleboardResult(6);
        const features = puzzleboardAlgorithm.toFeatures(result, "run-pb");
        expect(features).toHaveLength(6);
        for (const f of features) {
            expect(f.type).toBe("labeled_point");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("puzzleboard");
            expect(f.runId).toBe("run-pb");
            expect(f.readonly).toBe(true);
        }
        const first = features[0] as import("../../../../store/editor/useEditorStore").LabeledPointFeature;
        expect(first.gridIndex).toEqual({ i: 0, j: 0 });
        expect(first.masterId).toBe(10);
    });

    it("skips corners with null grid or null master_id", () => {
        const result = mockPuzzleboardResult(3);
        result.detection.corners[1].grid = null;
        result.detection.corners[2].master_id = null;
        const features = puzzleboardAlgorithm.toFeatures(result, "run-pb");
        expect(features).toHaveLength(1);
    });

    it("summary returns five entries", () => {
        const result = mockPuzzleboardResult(10);
        const summary = puzzleboardAlgorithm.summary(result);
        expect(summary).toHaveLength(5);
        expect(summary[0]).toEqual({ label: "Corners", value: "10" });
        expect(summary[1].label).toBe("Mean confidence");
        expect(summary[2].label).toBe("Bit error rate");
        expect(summary[3]).toEqual({ label: "Master origin", value: "(3, 2)" });
        expect(summary[4].label).toBe("Runtime");
    });

    it("diagnostics warns on high bit error rate", () => {
        const result = mockPuzzleboardResult(10, 0.25);
        const diags = puzzleboardAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.level === "warning" && d.message.includes("bit error rate"))).toBe(true);
    });

    it("diagnostics errors on zero corners", () => {
        const result = mockPuzzleboardResult(0);
        const diags = puzzleboardAlgorithm.diagnostics!(result);
        expect(diags.some((d) => d.level === "error")).toBe(true);
    });

    it("diagnostics is clean on normal result", () => {
        const result = mockPuzzleboardResult(50, 0.05);
        const diags = puzzleboardAlgorithm.diagnostics!(result);
        expect(diags.filter((d) => d.level !== "info")).toHaveLength(0);
    });
});
