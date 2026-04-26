import type { AlgorithmDefinition, AlgorithmPreset, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectMarkerboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import {
    calibrationCornerFeatures,
    calibrationCircleMatchFeatures,
    calibrationSummary,
} from "./shared";
import MarkerBoardConfigForm, { type MarkerBoardConfig } from "./MarkerBoardConfigForm";
import MarkerboardOverlay from "../../canvas/overlays/MarkerboardOverlay";

const initialConfig: MarkerBoardConfig = {
    boardRows: 22,
    boardCols: 22,
    circles: [
        { i: 11, j: 11, polarity: "black" },
        { i: 12, j: 11, polarity: "white" },
        { i: 12, j: 12, polarity: "white" },
    ],
    expectedRows: 22,
    expectedCols: 22,
    minCornerStrength: 0.2,
    completenessThreshold: 0.05,
    graphMinSpacingPix: 20,
    graphMaxSpacingPix: 160,
    graphKNeighbors: 8,
    graphOrientationToleranceDeg: 22.5,
    circleScorePatchSize: 64,
    circleScoreDiameterFrac: 0.5,
    circleScoreRingThicknessFrac: 0.35,
    circleScoreRingRadiusMul: 1.6,
    circleScoreMinContrast: 10,
    circleScoreSamples: 48,
    circleScoreCenterSearchPx: 2,
    matchMaxCandidatesPerPolarity: 6,
    matchMinOffsetInliers: 1,
};

const presets: AlgorithmPreset[] = [
    { label: "22×22 default", description: "Standard marker board with centered triangle", config: { ...initialConfig } },
    { label: "10×14 compact", description: "Smaller board", config: { ...initialConfig, boardRows: 10, boardCols: 14, expectedRows: 10, expectedCols: 14, circles: [{ i: 5, j: 7, polarity: "white" as const }, { i: 6, j: 7, polarity: "white" as const }, { i: 6, j: 8, polarity: "white" as const }] } },
];

const toDiagnostics = (result: CalibrationTargetResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.corner_count === 0) {
        entries.push({ level: "error", message: "No corners detected", detail: "Check board dimensions and corner strength threshold." });
    }
    if (result.summary.circle_match_count === 0 && result.circle_matches !== null) {
        entries.push({ level: "warning", message: "No circle markers matched", detail: "Verify circle positions match the physical board or adjust circle score parameters." });
    }
    if (result.summary.alignment_inliers !== null && result.summary.alignment_inliers < 2) {
        entries.push({ level: "warning", message: `Low alignment inliers: ${result.summary.alignment_inliers}`, detail: "Grid alignment may be unreliable." });
    }
    return entries;
};

const toFeatures = (result: CalibrationTargetResult, runId: string) => [
    ...calibrationCornerFeatures(result, runId, "markerboard"),
    ...calibrationCircleMatchFeatures(result.circle_matches, result.circle_candidates, runId, "markerboard"),
];

export const markerboardAlgorithm: AlgorithmDefinition = {
    id: "markerboard",
    title: "Marker Board",
    description: "Detect checkerboard corners and fiducial circle markers.",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    sampleDefaults: {
        markerboard: { ...initialConfig },
    },
    ConfigComponent: MarkerBoardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("Marker Board detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as MarkerBoardConfig;
        return detectMarkerboardWasm(pixels, width, height, {
            chessCfg: { threshold_value: c.minCornerStrength },
            params: {
                layout: {
                    rows: c.boardRows,
                    cols: c.boardCols,
                    circles: c.circles.map((circle) => ({
                        cell: { i: circle.i, j: circle.j },
                        polarity: circle.polarity,
                    })),
                },
                chessboard: {
                    min_corner_strength: c.minCornerStrength,
                    expected_rows: c.expectedRows,
                    expected_cols: c.expectedCols,
                    completeness_threshold: c.completenessThreshold,
                    graph: {
                        min_spacing_pix: c.graphMinSpacingPix,
                        max_spacing_pix: c.graphMaxSpacingPix,
                        k_neighbors: c.graphKNeighbors,
                        orientation_tolerance_deg: c.graphOrientationToleranceDeg,
                    },
                },
                circle_score: {
                    patch_size: c.circleScorePatchSize,
                    diameter_frac: c.circleScoreDiameterFrac,
                    ring_thickness_frac: c.circleScoreRingThicknessFrac,
                    ring_radius_mul: c.circleScoreRingRadiusMul,
                    min_contrast: c.circleScoreMinContrast,
                    samples: c.circleScoreSamples,
                    center_search_px: c.circleScoreCenterSearchPx,
                },
                match_params: {
                    max_candidates_per_polarity: c.matchMaxCandidatesPerPolarity,
                    min_offset_inliers: c.matchMinOffsetInliers,
                },
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: MarkerboardOverlay,
};
