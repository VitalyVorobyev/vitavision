import type { AlgorithmDefinition, AlgorithmPreset, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/api";
import { detectCalibrationTarget } from "../../../../lib/api";
import { detectChessboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { calibrationCornerFeatures, calibrationSummary } from "./shared";
import ChessboardConfigForm, { type ChessboardConfig } from "./ChessboardConfigForm";
import ChessboardOverlay from "../../canvas/overlays/ChessboardOverlay";

const initialConfig: ChessboardConfig = {
    expectedRows: 7,
    expectedCols: 11,
    minCornerStrength: 0.2,
    completenessThreshold: 0.1,
};

const presets: AlgorithmPreset[] = [
    { label: "7×11 board", description: "Standard calibration board", config: { ...initialConfig } },
    { label: "6×9 board", description: "Common smaller board", config: { ...initialConfig, expectedRows: 6, expectedCols: 9 } },
    { label: "5×8 board", config: { ...initialConfig, expectedRows: 5, expectedCols: 8 } },
];

const toDiagnostics = (result: CalibrationTargetResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.corner_count === 0) {
        entries.push({ level: "error", message: "No corners detected", detail: "Check that the image contains a chessboard pattern, or lower the corner strength threshold." });
    } else if (result.summary.corner_count < 10) {
        entries.push({ level: "warning", message: `Low corner count: ${result.summary.corner_count}`, detail: "The board may be partially occluded or the expected size may be wrong." });
    }
    return entries;
};

export const chessboardAlgorithm: AlgorithmDefinition = {
    id: "chessboard",
    title: "Chessboard",
    description: "Detect labeled chessboard corner grid with subpixel accuracy.",
    initialConfig,
    presets,
    executionModes: ["wasm", "server"],
    sampleDefaults: {
        chessboard: {
            expectedRows: 7,
            expectedCols: 11,
            minCornerStrength: 0.2,
            completenessThreshold: 0.1,
        },
    },
    ConfigComponent: ChessboardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const c = config as ChessboardConfig;
        return detectCalibrationTarget({
            algorithm: "chessboard",
            key,
            storageMode,
            config: {
                detector: {
                    expectedRows: c.expectedRows,
                    expectedCols: c.expectedCols,
                    minCornerStrength: c.minCornerStrength,
                    completenessThreshold: c.completenessThreshold,
                },
            },
        });
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as ChessboardConfig;
        return detectChessboardWasm(pixels, width, height, {
            chessCfg: { threshold_value: c.minCornerStrength },
            params: {
                min_corner_strength: c.minCornerStrength,
                expected_rows: c.expectedRows,
                expected_cols: c.expectedCols,
                completeness_threshold: c.completenessThreshold,
            },
        });
    },
    toFeatures: (result, runId) =>
        calibrationCornerFeatures(result as CalibrationTargetResult, runId, "chessboard"),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: ChessboardOverlay,
};
