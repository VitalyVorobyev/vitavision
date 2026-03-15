import type { AlgorithmDefinition } from "../types";
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

const toFeatures = (result: CalibrationTargetResult, runId: string) => [
    ...calibrationCornerFeatures(result, runId, "charuco"),
    ...calibrationMarkerFeatures(result.markers, runId, "charuco"),
];

export const charucoAlgorithm: AlgorithmDefinition = {
    id: "charuco",
    title: "ChArUco",
    description: "Detect ChArUco board corners and embedded ArUco markers.",
    initialConfig,
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
    OverlayComponent: CharucoOverlay,
};
