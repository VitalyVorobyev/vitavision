import type { AlgorithmDefinition, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { Feature, RingMarkerFeature } from "../../../../store/editor/useEditorStore";
import type { RinggridDetectResult } from "../../../../lib/types";
import { detectRinggridWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import RinggridConfigForm, { type RinggridConfig } from "./RinggridConfigForm";

const RAD_TO_DEG = 180 / Math.PI;

const initialConfig: RinggridConfig = {
    rows: 15,
    longRowCols: 14,
    pitchMm: 8.0,
    markerOuterRadiusMm: 4.8,
    markerInnerRadiusMm: 3.2,
    markerRingWidthMm: 1.152,
    profile: "baseline",
    diameterMinPx: 14,
    diameterMaxPx: 66,
    gradThreshold: 0.05,
    maxDecodeDist: 3,
    minDecodeConfidence: 0.3,
    enableCompletion: true,
    enableSelfUndistort: false,
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
    return result.markers.map((marker, index): RingMarkerFeature => ({
        id: `rg-${index}-${runId}`,
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
        meta: {
            kind: marker.decode ? "ringgrid_decoded" : "ringgrid_proposal",
            markerId: marker.id,
            score: marker.confidence,
            rotation: marker.decode?.best_rotation,
            hamming: marker.decode ? marker.decode.best_dist : undefined,
            targetPosition: marker.board_xy_mm
                ? { x: marker.board_xy_mm.x, y: marker.board_xy_mm.y }
                : undefined,
        },
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
    executionModes: ["wasm"],
    ConfigComponent: RinggridConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("Ring Grid detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as RinggridConfig;
        // ringgrid.target.v5 nests layout fields under lattice/marker/coding.
        // This is a partial override merged (nested-aware) onto the WASM
        // module's default board in wasmWorker.ts — do not add `kind` here,
        // it must come from the module defaults.
        const boardJson = JSON.stringify({
            lattice: {
                rows: c.rows,
                long_row_cols: c.longRowCols,
                pitch_mm: c.pitchMm,
            },
            marker: {
                outer_radius_mm: c.markerOuterRadiusMm,
                inner_radius_mm: c.markerInnerRadiusMm,
            },
            coding: {
                ring_width_mm: c.markerRingWidthMm,
            },
        });
        // Detection config: proposal/decode/completion moved under `advanced`
        // in the v5 config schema; marker_scale and self_undistort stay top-level.
        const configOverlay = JSON.stringify({
            marker_scale: {
                diameter_min_px: c.diameterMinPx,
                diameter_max_px: c.diameterMaxPx,
            },
            self_undistort: { enable: c.enableSelfUndistort },
            advanced: {
                proposal: {
                    grad_threshold: c.gradThreshold,
                },
                decode: {
                    codebook_profile: c.profile === "extended" ? "extended" : "base",
                    max_decode_dist: c.maxDecodeDist,
                    min_decode_confidence: c.minDecodeConfidence,
                },
                completion: { enable: c.enableCompletion },
            },
        });
        return detectRinggridWasm(pixels, width, height, { boardJson, configOverlay });
    },
    toFeatures: (result, runId) => toFeatures(result as RinggridDetectResult, runId),
    summary: (result) => toSummary(result as RinggridDetectResult),
    diagnostics: (result) => toDiagnostics(result as RinggridDetectResult),
};
