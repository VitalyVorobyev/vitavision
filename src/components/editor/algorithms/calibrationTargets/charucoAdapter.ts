import type { AlgorithmDefinition } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/api";
import { detectCalibrationTarget } from "../../../../lib/api";
import { calibrationCornerFeatures, calibrationMarkerFeatures, calibrationSummary } from "./shared";
import CharucoConfigForm, { type CharucoConfig } from "./CharucoConfigForm";

const initialConfig: CharucoConfig = {
    rows: 22,
    cols: 22,
    cellSize: 4.8,
    markerSizeRel: 0.75,
    dictionary: "DICT_4X4_1000",
    pxPerSquare: 40,
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
        charuco: {
            rows: 22,
            cols: 22,
            cellSize: 4.8,
            markerSizeRel: 0.75,
            dictionary: "DICT_4X4_1000",
            pxPerSquare: 40,
        },
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
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
};
