import type { AlgorithmDefinition, AlgorithmPreset, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/api";
import { detectCalibrationTarget } from "../../../../lib/api";
import { calibrationCornerFeatures, calibrationMarkerFeatures, calibrationSummary } from "./shared";
import CharucoConfigForm, { type CharucoConfig } from "./CharucoConfigForm";
import CharucoOverlay from "../../canvas/overlays/CharucoOverlay";

const initialConfig: CharucoConfig = {
    rows: 22,
    cols: 22,
    cellSize: 4.8,
    markerSizeRel: 0.75,
    dictionary: "DICT_4X4_1000",
    pxPerSquare: 40,
    chessExpectedRows: 22,
    chessExpectedCols: 22,
    chessMinCornerStrength: 0.2,
    chessCompletenessThreshold: 0.05,
    graphMinSpacingPix: 40,
    graphMaxSpacingPix: 160,
    graphKNeighbors: 8,
    graphOrientationToleranceDeg: 12.5,
};

const presets: AlgorithmPreset[] = [
    { label: "22×22 4×4", description: "Large board, 4×4 dictionary", config: { ...initialConfig } },
    { label: "10×14 4×4", description: "Medium board, 4×4 dictionary", config: { ...initialConfig, rows: 10, cols: 14, chessExpectedRows: 10, chessExpectedCols: 14 } },
    { label: "6×9 5×5", description: "Small board, 5×5 dictionary", config: { ...initialConfig, rows: 6, cols: 9, chessExpectedRows: 6, chessExpectedCols: 9, dictionary: "DICT_5X5_250" as const } },
];

const toDiagnostics = (result: CalibrationTargetResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.corner_count === 0) {
        entries.push({ level: "error", message: "No corners detected", detail: "Verify board dimensions and dictionary match the printed board." });
    }
    if (result.summary.marker_count === 0) {
        entries.push({ level: "warning", message: "No ArUco markers detected", detail: "Check that the dictionary setting matches the board." });
    } else if (result.summary.marker_count !== null && result.summary.marker_count > 0 && result.summary.corner_count === 0) {
        entries.push({ level: "info", message: "Markers found but no corners — chessboard detector may need tuning" });
    }
    return entries;
};

const toFeatures = (result: CalibrationTargetResult, runId: string) => [
    ...calibrationCornerFeatures(result, runId, "charuco"),
    ...calibrationMarkerFeatures(result.markers, runId, "charuco"),
];

export const charucoAlgorithm: AlgorithmDefinition = {
    id: "charuco",
    title: "ChArUco",
    description: "Detect ChArUco board corners and embedded ArUco markers.",
    initialConfig,
    presets,
    sampleDefaults: {
        charuco: { ...initialConfig },
    },
    ConfigComponent: CharucoConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const c = config as CharucoConfig;
        return detectCalibrationTarget({
            algorithm: "charuco",
            key,
            storageMode,
            config: {
                board: {
                    rows: c.rows,
                    cols: c.cols,
                    cellSize: c.cellSize,
                    markerSizeRel: c.markerSizeRel,
                    dictionary: c.dictionary,
                },
                pxPerSquare: c.pxPerSquare,
                chessboard: {
                    expectedRows: c.chessExpectedRows,
                    expectedCols: c.chessExpectedCols,
                    minCornerStrength: c.chessMinCornerStrength,
                    completenessThreshold: c.chessCompletenessThreshold,
                },
                graph: {
                    minSpacingPix: c.graphMinSpacingPix,
                    maxSpacingPix: c.graphMaxSpacingPix,
                    kNeighbors: c.graphKNeighbors,
                    orientationToleranceDeg: c.graphOrientationToleranceDeg,
                },
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: CharucoOverlay,
};
