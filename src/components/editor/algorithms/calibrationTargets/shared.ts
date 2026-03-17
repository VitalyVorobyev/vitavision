import type {
    CalibrationCircleCandidate,
    CalibrationCircleMatch,
    CalibrationMarker,
    CalibrationTargetResult,
} from "../../../../lib/api";
import { overlayTheme } from "../../canvas/overlays/overlayTheme";
import type { Feature, PointFeature } from "../../../../store/editor/useEditorStore";

export const toCanvasCoordinate = (value: number): number => value + 0.5;

const averagePoint = (points: Array<{ x: number; y: number }>): { x: number; y: number } => {
    const total = points.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 },
    );
    return {
        x: total.x / points.length,
        y: total.y / points.length,
    };
};

export const calibrationSummary = (result: CalibrationTargetResult): Array<{ label: string; value: string }> => {
    const summary = [
        { label: "Kind", value: result.detection.kind },
        { label: "Corners", value: `${result.summary.corner_count}` },
        { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
    ];

    if (result.summary.marker_count !== null) {
        summary.push({ label: "Markers", value: `${result.summary.marker_count}` });
    }
    if (result.summary.circle_match_count !== null) {
        summary.push({ label: "Circle matches", value: `${result.summary.circle_match_count}` });
    }
    if (result.summary.alignment_inliers !== null) {
        summary.push({ label: "Alignment inliers", value: `${result.summary.alignment_inliers}` });
    }

    return summary;
};

export const calibrationCornerFeatures = (
    result: CalibrationTargetResult,
    runId: string,
    algorithmId: string,
    color = overlayTheme.cornerAccent,
): Feature[] => {
    return result.detection.corners.map((corner, index) => ({
        id: corner.id,
        type: "point",
        source: "algorithm",
        algorithmId,
        runId,
        readonly: true,
        x: toCanvasCoordinate(corner.x),
        y: toCanvasCoordinate(corner.y),
        color,
        label: `corner ${index + 1}`,
        meta: {
            kind: result.detection.kind,
            score: corner.score,
            grid: corner.grid ?? undefined,
            cornerId: corner.corner_id,
            targetPosition: corner.target_position ?? undefined,
        },
    }));
};

export const calibrationMarkerFeatures = (
    markers: CalibrationMarker[] | null,
    runId: string,
    algorithmId: string,
    color = overlayTheme.markerStroke,
): Feature[] => {
    if (!markers) {
        return [];
    }

    return markers
        .filter((marker) => marker.corners_img !== null && marker.corners_img.length > 0)
        .map((marker) => {
            const center = averagePoint(marker.corners_img ?? []);
            const feature: PointFeature = {
                id: `${algorithmId}-marker-${marker.id}`,
                type: "point",
                source: "algorithm",
                algorithmId,
                runId,
                readonly: true,
                x: toCanvasCoordinate(center.x),
                y: toCanvasCoordinate(center.y),
                color,
                label: `marker ${marker.id}`,
                meta: {
                    kind: "marker",
                    markerId: marker.id,
                    gridCell: marker.grid_cell,
                    score: marker.score,
                    rotation: marker.rotation,
                    hamming: marker.hamming,
                    borderScore: marker.border_score,
                    code: marker.code,
                    inverted: marker.inverted,
                },
            };
            return feature;
        });
};

export const calibrationCircleCandidateFeatures = (
    candidates: CalibrationCircleCandidate[] | null,
    runId: string,
    algorithmId: string,
    color = overlayTheme.markerStroke,
): Feature[] => {
    if (!candidates) {
        return [];
    }

    return candidates.map((candidate, index) => ({
        id: `${algorithmId}-circle-${index + 1}`,
        type: "point",
        source: "algorithm",
        algorithmId,
        runId,
        readonly: true,
        x: toCanvasCoordinate(candidate.center_img.x),
        y: toCanvasCoordinate(candidate.center_img.y),
        color,
        label: `circle ${index + 1}`,
        meta: {
            kind: "circle_candidate",
            grid: candidate.cell,
            score: candidate.score,
            polarity: candidate.polarity,
            contrast: candidate.contrast,
        },
    }));
};

export const calibrationCircleMatchFeatures = (
    matches: CalibrationCircleMatch[] | null,
    candidates: CalibrationCircleCandidate[] | null,
    runId: string,
    algorithmId: string,
    color = overlayTheme.markerStroke,
): Feature[] => {
    if (!matches || !candidates) return [];

    return matches
        .filter((m) => m.matched_index !== null && m.matched_index! < candidates.length)
        .map((m) => {
            const candidate = candidates[m.matched_index!];
            return {
                id: `${algorithmId}-circle-match-${m.expected.cell.i}-${m.expected.cell.j}`,
                type: "point" as const,
                source: "algorithm" as const,
                algorithmId,
                runId,
                readonly: true,
                x: toCanvasCoordinate(candidate.center_img.x),
                y: toCanvasCoordinate(candidate.center_img.y),
                color,
                label: `(${m.expected.cell.i}, ${m.expected.cell.j})`,
                meta: {
                    kind: "circle_match",
                    grid: m.expected.cell,
                    polarity: m.expected.polarity,
                    score: candidate.score,
                    contrast: candidate.contrast,
                    distanceCells: m.distance_cells,
                    offsetCells: m.offset_cells,
                },
            };
        });
};
