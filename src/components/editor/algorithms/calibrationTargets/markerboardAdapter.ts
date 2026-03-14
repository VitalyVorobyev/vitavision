import type { AlgorithmDefinition } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/api";
import { detectCalibrationTarget } from "../../../../lib/api";
import {
    calibrationCornerFeatures,
    calibrationCircleCandidateFeatures,
    calibrationSummary,
} from "./shared";
import MarkerBoardConfigForm, { type MarkerBoardConfig } from "./MarkerBoardConfigForm";

const initialConfig: MarkerBoardConfig = {
    boardRows: 22,
    boardCols: 22,
    circles: [
        { i: 11, j: 11, polarity: "white" },
        { i: 12, j: 11, polarity: "white" },
        { i: 12, j: 12, polarity: "white" },
    ],
    expectedRows: 22,
    expectedCols: 22,
    minCornerStrength: 0.2,
    completenessThreshold: 0.05,
};

const toFeatures = (result: CalibrationTargetResult, runId: string) => [
    ...calibrationCornerFeatures(result, runId, "markerboard"),
    ...calibrationCircleCandidateFeatures(result.circle_candidates, runId, "markerboard"),
];

export const markerboardAlgorithm: AlgorithmDefinition = {
    id: "markerboard",
    title: "Marker Board",
    description: "Detect checkerboard corners and fiducial circle markers.",
    initialConfig,
    sampleDefaults: {
        markerboard: { ...initialConfig },
    },
    ConfigComponent: MarkerBoardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const c = config as MarkerBoardConfig;
        return detectCalibrationTarget({
            algorithm: "markerboard",
            key,
            storageMode,
            config: {
                layout: {
                    rows: c.boardRows,
                    cols: c.boardCols,
                    circles: c.circles,
                },
                chessboard: {
                    expectedRows: c.expectedRows,
                    expectedCols: c.expectedCols,
                    minCornerStrength: c.minCornerStrength,
                    completenessThreshold: c.completenessThreshold,
                },
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
};
