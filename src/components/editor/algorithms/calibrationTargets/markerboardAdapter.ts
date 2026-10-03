import type { AlgorithmDefinition, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectMarkerboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { calibrationCornerFeatures, calibrationCircleMatchFeatures, calibrationSummary } from "./shared";
import { createConfigForm } from "../createConfigForm";
import { initialConfig, presets } from "./markerboard/config";
import { schema } from "./markerboard/schema";
import { ui } from "./markerboard/ui";

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
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("Marker Board detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectMarkerboardWasm(pixels, width, height, config),
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
};
