import type { AlgorithmDefinition, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectChessboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { calibrationCornerFeatures, calibrationSummary } from "./shared";
import { createConfigForm } from "../createConfigForm";
import { initialConfig } from "./chessboard/config";
import { schema } from "./chessboard/schema";
import { ui } from "./chessboard/ui";
import ChessboardOverlay from "../../canvas/overlays/ChessboardOverlay";

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
    executionModes: ["wasm"],
    sampleDefaults: {
        chessboard: { ...initialConfig },
    },
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("Chessboard detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectChessboardWasm(pixels, width, height, config),
    toFeatures: (result, runId) =>
        calibrationCornerFeatures(result as CalibrationTargetResult, runId, "chessboard"),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: ChessboardOverlay,
};
