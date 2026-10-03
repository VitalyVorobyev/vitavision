import type { AlgorithmDefinition, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectCharucoWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { calibrationCornerFeatures, calibrationMarkerFeatures, calibrationSummary } from "./shared";
import { createConfigForm } from "../createConfigForm";
import { initialConfig, presets } from "./charuco/config";
import { schema } from "./charuco/schema";
import { ui } from "./charuco/ui";

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
    executionModes: ["wasm"],
    sampleDefaults: {
        charuco: { ...initialConfig },
    },
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("ChArUco detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectCharucoWasm(pixels, width, height, config),
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
};
