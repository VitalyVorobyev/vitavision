import type { AlgorithmDefinition } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/api";
import { detectCalibrationTarget } from "../../../../lib/api";
import { calibrationCornerFeatures, calibrationSummary } from "./shared";
import ChessboardConfigForm, { type ChessboardConfig } from "./ChessboardConfigForm";

const initialConfig: ChessboardConfig = {
    expectedRows: 7,
    expectedCols: 11,
    minCornerStrength: 0.2,
    completenessThreshold: 0.1,
};

export const chessboardAlgorithm: AlgorithmDefinition = {
    id: "chessboard",
    title: "Chessboard",
    description: "Detect labeled chessboard corner grid with subpixel accuracy.",
    initialConfig,
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
    toFeatures: (result, runId) =>
        calibrationCornerFeatures(result as CalibrationTargetResult, runId, "chessboard"),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
};
