import {
    edgeBitsFromPuzzleboard,
    isLatticeKind,
    type TargetCircle,
    type TargetCorner,
    type TargetDetection,
    type TargetKind,
    type TargetMarker,
    type TargetRing,
} from "@vitavision/overlays";

import type { PuzzleBoardDetectResult } from "../../../lib/types";
import type {
    ArUcoMarkerFeature,
    CircleFeature,
    DirectedPointFeature,
    Feature,
    LabeledPointFeature,
    PointFeature,
    RingMarkerFeature,
} from "../../../store/editor/useEditorStore";

/*
 * The one place that turns what the editor stores (features, in the detector's own pixel frame)
 * into what `@vitavision/overlays` draws (a `TargetDetection`). Every id is the feature's id, so
 * a hit or hover on the overlay maps straight back to the feature.
 */

const DEG_TO_RAD = Math.PI / 180;

/** What each algorithm detects, so the overlay knows whether to join corners into a lattice. */
const ALGORITHM_KINDS: Readonly<Record<string, TargetKind>> = {
    "chess-corners": "corners",
    chessboard: "chessboard",
    charuco: "charuco",
    markerboard: "markerboard",
    ringgrid: "ringgrid",
    radsym: "corners",
    puzzleboard: "puzzleboard",
};

/** The detection kind of an algorithm's features; features with no algorithm (an imported file) are loose corners. */
export function detectionKindOf(algorithmId: string | null | undefined): TargetKind {
    return (algorithmId ? ALGORITHM_KINDS[algorithmId] : undefined) ?? "corners";
}

/** Whether an algorithm's overlay draws lattice edges (the Grid edges toggle means something). */
export function hasLatticeOverlay(algorithmId: string | null | undefined): boolean {
    return isLatticeKind(detectionKindOf(algorithmId));
}

/** The feature types that are always a detection's. A `point` is one only when an algorithm made it. */
const DETECTION_TYPES = new Set<Feature["type"]>(["directed_point", "ring_marker", "aruco_marker", "circle", "labeled_point"]);

/** Whether a feature belongs to a detection overlay rather than to the annotation layers (manual `point`, `line`, …). */
export function isDetectionFeature(feature: Feature): boolean {
    if (feature.type === "point") return feature.source === "algorithm";
    return DETECTION_TYPES.has(feature.type);
}

function directedCorner(feature: DirectedPointFeature): TargetCorner {
    const [first, second] = feature.axes;
    return {
        id: feature.id,
        x: feature.x,
        y: feature.y,
        score: feature.score,
        angle: Math.atan2(first.dy, first.dx),
        angle2: Math.atan2(second.dy, second.dx),
        label: feature.label,
    };
}

function gridCorner(feature: PointFeature | LabeledPointFeature): TargetCorner {
    const labeled = feature.type === "labeled_point";
    const grid = labeled ? feature.gridIndex : feature.meta?.grid;
    return {
        id: feature.id,
        x: feature.x,
        y: feature.y,
        score: labeled ? feature.score : feature.meta?.score,
        i: grid?.i,
        j: grid?.j,
        // A board labels its corners by lattice index; a loose point keeps the label it was given.
        label: grid ? undefined : feature.label,
    };
}

/** A marker board's matched or candidate circle: a `point` feature that carries a printed polarity. */
function isCircleFeature(feature: Feature): feature is PointFeature {
    return feature.type === "point" && (feature.meta?.kind === "circle_match" || feature.meta?.kind === "circle_candidate");
}

function circleOf(feature: PointFeature): TargetCircle {
    const grid = feature.meta?.grid;
    return {
        id: feature.id,
        x: feature.x,
        y: feature.y,
        polarity: feature.meta?.polarity === "black" ? "black" : "white",
        i: grid?.i,
        j: grid?.j,
    };
}

function markerOf(feature: ArUcoMarkerFeature): TargetMarker {
    const markerId = feature.meta?.markerId;
    return { id: feature.id, corners: feature.corners, label: markerId == null ? undefined : String(markerId) };
}

function ringOf(feature: RingMarkerFeature): TargetRing {
    const { outerEllipse: outer, innerEllipse: inner } = feature;
    const markerId = feature.meta?.markerId;
    return {
        id: feature.id,
        x: feature.x,
        y: feature.y,
        outer: { rx: outer.a, ry: outer.b, angle: outer.angleDeg * DEG_TO_RAD },
        inner: { rx: inner.a, ry: inner.b, angle: inner.angleDeg * DEG_TO_RAD },
        label: markerId == null ? undefined : String(markerId),
    };
}

/** A detected circle with a radius and no printed polarity: its fitted outline, at its centre. */
function radiusRingOf(feature: CircleFeature): TargetRing {
    return { id: feature.id, x: feature.x, y: feature.y, outer: { rx: feature.radius, ry: feature.radius, angle: 0 } };
}

/**
 * The detection an algorithm's features make.
 *
 * @param algorithmId - The algorithm that produced the features, or `null` for features read from a file.
 * @param features - The features to draw (already filtered to the visible ones); annotations are ignored.
 * @param result - The algorithm's last result, when the features come from that run. PuzzleBoard
 *   needs it for the decoded edge bits, which no feature carries.
 * @returns The detection `TargetOverlay` takes. Every id is a feature id.
 */
export function toTargetDetection(
    algorithmId: string | null,
    features: readonly Feature[],
    result?: unknown,
): TargetDetection {
    const corners: TargetCorner[] = [];
    const markers: TargetMarker[] = [];
    const circles: TargetCircle[] = [];
    const rings: TargetRing[] = [];

    for (const feature of features) {
        switch (feature.type) {
            case "directed_point":
                corners.push(directedCorner(feature));
                break;
            case "labeled_point":
                corners.push(gridCorner(feature));
                break;
            case "point":
                if (feature.source !== "algorithm") break;
                if (isCircleFeature(feature)) circles.push(circleOf(feature));
                else corners.push(gridCorner(feature));
                break;
            case "aruco_marker":
                markers.push(markerOf(feature));
                break;
            case "ring_marker":
                rings.push(ringOf(feature));
                break;
            case "circle":
                rings.push(radiusRingOf(feature));
                break;
            default:
                break;
        }
    }

    const detection: TargetDetection = { kind: detectionKindOf(algorithmId) };
    if (corners.length > 0) detection.corners = corners;
    if (markers.length > 0) detection.markers = markers;
    if (circles.length > 0) detection.circles = circles;
    if (rings.length > 0) detection.rings = rings;

    if (algorithmId === "puzzleboard" && result) {
        const puzzle = result as PuzzleBoardDetectResult;
        const edgeBits = edgeBitsFromPuzzleboard(puzzle.observed_edges, corners, puzzle.alignment);
        if (edgeBits.length > 0) detection.edgeBits = edgeBits;
    }
    return detection;
}

/** The detections of a feature list: one per algorithm that produced features, plus one for features read from a file. */
export function detectionGroups(
    features: readonly Feature[],
    lastResult: { algorithmId: string; result: unknown } | null,
): { key: string; algorithmId: string | null; features: Feature[]; result: unknown }[] {
    const byAlgorithm = new Map<string | null, Feature[]>();
    for (const feature of features) {
        if (!isDetectionFeature(feature)) continue;
        const key = feature.source === "algorithm" ? (feature.algorithmId ?? null) : null;
        const group = byAlgorithm.get(key);
        if (group) group.push(feature);
        else byAlgorithm.set(key, [feature]);
    }
    return [...byAlgorithm].map(([algorithmId, group]) => ({
        key: algorithmId ?? "imported",
        algorithmId,
        features: group,
        result: lastResult && lastResult.algorithmId === algorithmId ? lastResult.result : undefined,
    }));
}
