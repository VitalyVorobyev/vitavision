import { describe, expect, it } from "vitest";

import type { PuzzleBoardDetectResult } from "../../../lib/types";
import type { Feature } from "../../../store/editor/useEditorStore";
import { chessCornersAlgorithm } from "../algorithms/chessCorners/adapter";
import { chessboardAlgorithm } from "../algorithms/calibrationTargets/chessboardAdapter";
import { detectionGroups, detectionKindOf, hasLatticeOverlay, isDetectionFeature, toTargetDetection } from "./targetDetection";

const algo = { source: "algorithm" as const, readonly: true };

describe("detectionKindOf", () => {
    it("names each algorithm's kind, and loose corners for features read from a file", () => {
        expect(detectionKindOf("chessboard")).toBe("chessboard");
        expect(detectionKindOf("charuco")).toBe("charuco");
        expect(detectionKindOf("markerboard")).toBe("markerboard");
        expect(detectionKindOf("puzzleboard")).toBe("puzzleboard");
        expect(detectionKindOf("ringgrid")).toBe("ringgrid");
        expect(detectionKindOf("chess-corners")).toBe("corners");
        expect(detectionKindOf("radsym")).toBe("corners");
        expect(detectionKindOf(null)).toBe("corners");
    });

    it("draws lattice edges for the four boards only", () => {
        expect(["chessboard", "charuco", "markerboard", "puzzleboard"].every(hasLatticeOverlay)).toBe(true);
        expect(["chess-corners", "ringgrid", "radsym"].some(hasLatticeOverlay)).toBe(false);
    });
});

describe("toTargetDetection: chess-corners", () => {
    it("maps a directed point to a corner with both edge directions, keeping the feature id and position", () => {
        const feature: Feature = {
            ...algo,
            id: "c1",
            type: "directed_point",
            algorithmId: "chess-corners",
            x: 426.5,
            y: 369.25,
            axes: [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
            score: 0.8,
        };
        const detection = toTargetDetection("chess-corners", [feature]);
        expect(detection.kind).toBe("corners");
        expect(detection.corners).toEqual([
            { id: "c1", x: 426.5, y: 369.25, score: 0.8, angle: 0, angle2: Math.PI / 2, label: undefined },
        ]);
    });

    it("reads the corner positions straight from the adapter's features: no half-pixel offset anywhere", () => {
        const features = chessCornersAlgorithm.toFeatures(
            {
                status: "success",
                key: "k",
                storage_mode: "local",
                image_width: 100,
                image_height: 100,
                frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
                summary: { count: 1, response_min: 1, response_max: 1, response_mean: 1, confidence_min: 1, confidence_max: 1, runtime_ms: 1 },
                corners: [
                    {
                        id: "a",
                        x: 10.25,
                        y: 20.75,
                        x_norm: 0,
                        y_norm: 0,
                        response: 1,
                        axes: [
                            { angle_rad: 0, angle_deg: 0, sigma_rad: 0.1, direction: { dx: 1, dy: 0 } },
                            { angle_rad: 1.5, angle_deg: 90, sigma_rad: 0.1, direction: { dx: 0, dy: 1 } },
                        ],
                        confidence: 0.9,
                        confidence_level: "high",
                    },
                ],
            },
            "run",
        );
        const detection = toTargetDetection("chess-corners", features);
        expect(detection.corners?.[0]).toMatchObject({ id: "a", x: 10.25, y: 20.75, score: 0.9 });
    });
});

describe("toTargetDetection: boards", () => {
    const corner = (id: string, x: number, y: number, i: number, j: number): Feature => ({
        ...algo,
        id,
        type: "point",
        algorithmId: "chessboard",
        x,
        y,
        meta: { kind: "chessboard", score: 0.9, grid: { i, j } },
    });

    it("chessboard: corners carry their lattice index", () => {
        const detection = toTargetDetection("chessboard", [corner("a", 1, 2, 0, 0), corner("b", 3, 4, 0, 1)]);
        expect(detection.kind).toBe("chessboard");
        expect(detection.corners).toMatchObject([
            { id: "a", x: 1, y: 2, i: 0, j: 0, score: 0.9 },
            { id: "b", x: 3, y: 4, i: 0, j: 1 },
        ]);
        expect(detection.markers).toBeUndefined();
    });

    it("chessboard adapter features map one to one, in order", () => {
        const features = chessboardAlgorithm.toFeatures(
            {
                status: "success",
                key: "k",
                storage_mode: "local",
                algorithm: "chessboard",
                image_width: 10,
                image_height: 10,
                frame: { name: "image_px_center", origin: "top_left", x_axis: "right", y_axis: "down", units: "pixels" },
                summary: { corner_count: 1, marker_count: null, circle_candidate_count: null, circle_match_count: null, alignment_inliers: null, alignment_runner_up_inliers: null, runtime_ms: 1 },
                detection: { kind: "chessboard", corners: [{ id: "x", x: 5.5, y: 6.5, x_norm: 0, y_norm: 0, score: 1, grid: { i: 2, j: 3 }, corner_id: 7, target_position: null }] },
                markers: null,
                alignment: null,
                circle_candidates: null,
                circle_matches: null,
            },
            "run",
        );
        expect(toTargetDetection("chessboard", features).corners).toMatchObject([{ id: "x", x: 5.5, y: 6.5, i: 2, j: 3 }]);
    });

    it("charuco: markers keep their four corners and are labelled by marker id", () => {
        const marker: Feature = {
            ...algo,
            id: "charuco-marker-4",
            type: "aruco_marker",
            algorithmId: "charuco",
            x: 5,
            y: 5,
            corners: [0, 0, 10, 0, 10, 10, 0, 10],
            meta: { kind: "marker", markerId: 4 },
        };
        const detection = toTargetDetection("charuco", [corner("a", 1, 2, 0, 0), marker]);
        expect(detection.kind).toBe("charuco");
        expect(detection.markers).toEqual([{ id: "charuco-marker-4", corners: [0, 0, 10, 0, 10, 10, 0, 10], label: "4" }]);
        expect(detection.corners).toHaveLength(1);
    });

    it("markerboard: circle matches become circles with their polarity and cell, corners stay corners", () => {
        const circle: Feature = {
            ...algo,
            id: "mb-circle",
            type: "point",
            algorithmId: "markerboard",
            x: 9,
            y: 8,
            meta: { kind: "circle_match", grid: { i: 3, j: 4 }, polarity: "black" },
        };
        const detection = toTargetDetection("markerboard", [corner("a", 1, 2, 0, 0), circle]);
        expect(detection.kind).toBe("markerboard");
        expect(detection.circles).toEqual([{ id: "mb-circle", x: 9, y: 8, polarity: "black", i: 3, j: 4 }]);
        expect(detection.corners).toHaveLength(1);
    });

    it("puzzleboard: labeled points are corners with their master index, and the decoded edges become edge bits", () => {
        const labeled = (id: string, x: number, y: number, i: number, j: number): Feature => ({
            ...algo,
            id,
            type: "labeled_point",
            algorithmId: "puzzleboard",
            x,
            y,
            score: 0.9,
            gridIndex: { i, j },
            masterId: 1,
        });
        // An identity alignment: local (col, row) is master (i, j); a horizontal edge joins (0,0)-(1,0).
        const result = {
            alignment: { transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] },
            observed_edges: [{ row: 0, col: 0, orientation: "horizontal", bit: 1, confidence: 0.5 }],
        } as unknown as PuzzleBoardDetectResult;
        const detection = toTargetDetection("puzzleboard", [labeled("p0", 10, 20, 0, 0), labeled("p1", 30, 20, 1, 0)], result);
        expect(detection.kind).toBe("puzzleboard");
        expect(detection.corners).toMatchObject([{ id: "p0", i: 0, j: 0 }, { id: "p1", i: 1, j: 0 }]);
        expect(detection.edgeBits).toHaveLength(1);
        expect(detection.edgeBits?.[0]).toMatchObject({ x: 20, y: 20, radius: 5, bit: 1, confidence: 0.5 });
    });

    it("puzzleboard without a result has no edge bits", () => {
        expect(toTargetDetection("puzzleboard", []).edgeBits).toBeUndefined();
    });
});

describe("toTargetDetection: ringgrid and radsym", () => {
    it("ringgrid: a ring marker becomes a ring with both ellipses, degrees turned to radians", () => {
        const ring: Feature = {
            ...algo,
            id: "rg-0",
            type: "ring_marker",
            algorithmId: "ringgrid",
            x: 100,
            y: 200,
            outerEllipse: { cx: 100, cy: 200, a: 12, b: 10, angleDeg: 90 },
            innerEllipse: { cx: 100, cy: 200, a: 6, b: 5, angleDeg: 180 },
            meta: { kind: "ringgrid_decoded", markerId: 17 },
        };
        const detection = toTargetDetection("ringgrid", [ring]);
        expect(detection.kind).toBe("ringgrid");
        expect(detection.rings).toEqual([
            {
                id: "rg-0",
                x: 100,
                y: 200,
                outer: { rx: 12, ry: 10, angle: Math.PI / 2 },
                inner: { rx: 6, ry: 5, angle: Math.PI },
                label: "17",
            },
        ]);
    });

    it("radsym: proposals are loose corners with their score", () => {
        const proposal: Feature = { ...algo, id: "r1", type: "point", algorithmId: "radsym", x: 395, y: 338, meta: { kind: "radsym_proposal", score: 0.7 } };
        const detection = toTargetDetection("radsym", [proposal]);
        expect(detection.kind).toBe("corners");
        expect(detection.corners).toEqual([{ id: "r1", x: 395, y: 338, score: 0.7, i: undefined, j: undefined, label: undefined }]);
    });
});

describe("toTargetDetection: features read from a file", () => {
    it("draws a bare circle as a ring of its radius", () => {
        const circle: Feature = { id: "c", type: "circle", source: "manual", x: 5, y: 6, radius: 7 };
        expect(toTargetDetection(null, [circle]).rings).toEqual([{ id: "c", x: 5, y: 6, outer: { rx: 7, ry: 7, angle: 0 } }]);
    });

    it("ignores hand-drawn annotations", () => {
        const annotation: Feature = { id: "m", type: "point", source: "manual", x: 1, y: 1 };
        expect(toTargetDetection(null, [annotation])).toEqual({ kind: "corners" });
    });
});

describe("detectionGroups", () => {
    const manualPoint: Feature = { id: "m", type: "point", source: "manual", x: 1, y: 1 };
    const detected = (id: string, algorithmId: string): Feature => ({ ...algo, id, type: "point", algorithmId, x: 1, y: 1 });
    const imported: Feature = { id: "i", type: "directed_point", source: "manual", x: 1, y: 1, axes: [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }], score: 1 };

    it("tells annotations from detections", () => {
        expect(isDetectionFeature(manualPoint)).toBe(false);
        expect(isDetectionFeature(detected("d", "radsym"))).toBe(true);
        expect(isDetectionFeature(imported)).toBe(true);
    });

    it("groups detections by the algorithm that made them, leaving annotations out, and hands the last result to its own run", () => {
        const groups = detectionGroups(
            [manualPoint, detected("a", "radsym"), detected("b", "chessboard"), detected("c", "radsym"), imported],
            { algorithmId: "radsym", result: "RESULT" },
        );
        expect(groups.map((g) => [g.key, g.features.map((f) => f.id), g.result])).toEqual([
            ["radsym", ["a", "c"], "RESULT"],
            ["chessboard", ["b"], undefined],
            ["imported", ["i"], undefined],
        ]);
    });
});
