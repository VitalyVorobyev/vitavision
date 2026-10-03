import type { AlgorithmDefinition, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectChessboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { calibrationCornerFeatures, calibrationSummary, definedOnly } from "./shared";
import ChessboardConfigForm, { type ChessboardConfig } from "./ChessboardConfigForm";
import ChessboardOverlay from "../../canvas/overlays/ChessboardOverlay";

// minLabeledCorners / maxComponents equal default_chessboard_params(); the
// worker deep-merges these over the library defaults and
// scripts/test-wasm-schemas.ts pins the equality. minCornerStrength 15 is the
// app's long-standing value (the library default is 33).
//
// No presets: they differed only in the expected board size, which is not a
// detector input (see ChessboardConfigForm).
const initialConfig: ChessboardConfig = {
    minCornerStrength: 15,
    minLabeledCorners: 8,
    maxComponents: 3,
};

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
    ConfigComponent: ChessboardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: () => Promise.reject(new Error("Chessboard detection is only available via client-side WASM.")),
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as ChessboardConfig;
        return detectChessboardWasm(pixels, width, height, {
            // calib-targets 0.11 collapsed the tagged
            // `threshold: { relative | absolute }` enum back to a plain f32,
            // dropping relative mode entirely — the value is now an ABSOLUTE
            // floor on the raw ChESS response (default_chess_config() ships 15).
            // Passing the old `{ relative: v }` object throws
            // "invalid type: JsValue(Object(...)), expected f32" at detect time.
            chessCfg: { threshold: c.minCornerStrength },
            params: {
                min_corner_strength: c.minCornerStrength,
                ...definedOnly({
                    min_labeled_corners: c.minLabeledCorners,
                    max_components: c.maxComponents,
                }),
            },
        });
    },
    toFeatures: (result, runId) =>
        calibrationCornerFeatures(result as CalibrationTargetResult, runId, "chessboard"),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: ChessboardOverlay,
};
