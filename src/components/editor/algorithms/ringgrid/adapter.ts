import type { AlgorithmDefinition, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { Feature, RingMarkerFeature } from "../../../../store/editor/useEditorStore";
import { detectRinggrid, type RinggridDetectResult } from "../../../../lib/api";

import RinggridConfigForm, { type RinggridConfig } from "./RinggridConfigForm";

const RAD_TO_DEG = 180 / Math.PI;

const initialConfig: RinggridConfig = {
    rows: 15,
    longRowCols: 14,
    pitchMm: 8.0,
    markerOuterRadiusMm: 5.6,
    markerInnerRadiusMm: 3.2,
    markerRingWidthMm: 0.8,
    profile: "baseline",
};

const toSummary = (result: RinggridDetectResult): AlgorithmSummaryEntry[] => [
    { label: "Markers", value: `${result.summary.marker_count}` },
    { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
];

const toDiagnostics = (result: RinggridDetectResult): DiagnosticEntry[] => {
    if (result.summary.marker_count === 0) {
        return [{ level: "warning", message: "No markers detected", detail: "Check that the board parameters match the target in the image." }];
    }
    return [];
};

const toFeatures = (result: RinggridDetectResult, runId: string): Feature[] => {
    return result.markers.map((marker): RingMarkerFeature => ({
        id: `rg-${marker.id}-${runId}`,
        type: "ring_marker",
        source: "algorithm",
        algorithmId: "ringgrid",
        runId,
        readonly: true,
        x: marker.center.x + 0.5,
        y: marker.center.y + 0.5,
        outerEllipse: {
            cx: marker.ellipse_outer.cx,
            cy: marker.ellipse_outer.cy,
            a: marker.ellipse_outer.a,
            b: marker.ellipse_outer.b,
            angleDeg: marker.ellipse_outer.angle * RAD_TO_DEG,
        },
        innerEllipse: {
            cx: marker.ellipse_inner.cx,
            cy: marker.ellipse_inner.cy,
            a: marker.ellipse_inner.a,
            b: marker.ellipse_inner.b,
            angleDeg: marker.ellipse_inner.angle * RAD_TO_DEG,
        },
        meta: { kind: "ringgrid", markerId: marker.id, score: marker.confidence },
    }));
};

export const ringgridAlgorithm: AlgorithmDefinition = {
    id: "ringgrid",
    title: "Ring Grid",
    description: "Detect concentric ring markers on a hex-lattice grid with binary code bands.",
    initialConfig,
    sampleDefaults: {
        ringgrid: { ...initialConfig },
    },
    ConfigComponent: RinggridConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const c = config as RinggridConfig;
        return detectRinggrid({
            key,
            storageMode,
            board: {
                rows: c.rows,
                longRowCols: c.longRowCols,
                pitchMm: c.pitchMm,
                markerOuterRadiusMm: c.markerOuterRadiusMm,
                markerInnerRadiusMm: c.markerInnerRadiusMm,
                markerRingWidthMm: c.markerRingWidthMm,
            },
            profile: c.profile,
        });
    },
    toFeatures: (result, runId) => toFeatures(result as RinggridDetectResult, runId),
    summary: (result) => toSummary(result as RinggridDetectResult),
    diagnostics: (result) => toDiagnostics(result as RinggridDetectResult),
};
