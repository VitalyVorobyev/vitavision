import type { AlgorithmDefinition, AlgorithmPreset, DiagnosticEntry } from "../types";
import type { PuzzleBoardDetectResult } from "../../../../lib/types";
import { detectPuzzleboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import PuzzleboardConfigForm, { type PuzzleboardConfig } from "./PuzzleboardConfigForm";
import PuzzleboardOverlay from "./PuzzleboardOverlay";
import type { LabeledPointFeature } from "../../../../store/editor/useEditorStore";

const initialConfig: PuzzleboardConfig = {
    boardRows: 10,
    boardCols: 10,
    cellSize: 15,
    originRow: 0,
    originCol: 0,
    pxPerSquare: 60,
    decodeMinWindow: 4,
    decodeMinBitConfidence: 0.15,
    decodeMaxBitErrorRate: 0.30,
    decodeSampleRadiusRel: 1 / 6,
    decodeSearchAllComponents: true,
    chessMinCornerStrength: 0.1,
    chessCompletenessThreshold: 0.02,
    graphMinSpacingPix: 8,
    graphMaxSpacingPix: 600,
    decodeSearchMode: "full",
    decodeScoringMode: "soft_log_likelihood",
    decodeBitLikelihoodSlope: 12,
    decodePerBitFloor: -6,
    decodeAlignmentMinMargin: 0.02,
};

const presets: AlgorithmPreset[] = [
    { label: "Default", description: "Full master-pattern scan — works regardless of printed origin", config: { ...initialConfig } },
    { label: "Strict bit check", description: "Higher bit confidence, lower error tolerance", config: { ...initialConfig, decodeMinBitConfidence: 0.25, decodeMaxBitErrorRate: 0.15 } },
    { label: "Fixed board (fast)", description: "Restrict decode to the configured rows × cols at origin (fastest; requires correct origin_row/col)", config: { ...initialConfig, decodeSearchMode: "fixed_board" } },
];

const toFeatures = (result: PuzzleBoardDetectResult, runId: string): LabeledPointFeature[] => {
    return result.detection.corners
        .filter((c) => c.grid !== null && c.master_id !== null)
        .map((c) => ({
            id: c.id,
            type: "labeled_point" as const,
            source: "algorithm" as const,
            algorithmId: "puzzleboard",
            runId,
            readonly: true,
            x: c.x,
            y: c.y,
            score: c.score,
            gridIndex: c.grid!,
            masterId: c.master_id!,
            targetPosMm: c.target_position ?? undefined,
        }));
};

const toDiagnostics = (result: PuzzleBoardDetectResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.corner_count === 0) {
        entries.push({ level: "error", message: "No corners detected", detail: "Check board dimensions, image focus, and lighting." });
    }
    if (!result.alignment) {
        entries.push({ level: "error", message: "No alignment found", detail: "Board could not be located in the image." });
    }
    // Detection succeeded if we got here, so a moderately high bit-error rate paired
    // with high mean confidence is informational, not a problem worth flagging.
    const ber = result.summary.bit_error_rate;
    if (ber > 0.25 && result.summary.mean_confidence < 0.7) {
        entries.push({
            level: "warning",
            message: `High bit error rate: ${(ber * 100).toFixed(1)}%`,
            detail: "Many decoded bits did not match the master pattern. The image may be blurred, low-contrast, or partially occluded.",
        });
    }
    if (result.decode.edges_observed > 0 && result.decode.edges_matched / result.decode.edges_observed < 0.6) {
        entries.push({ level: "info", message: "Low edge match rate", detail: "Fewer than 60% of observed edges matched the master pattern." });
    }
    return entries;
};

export const puzzleboardAlgorithm: AlgorithmDefinition = {
    id: "puzzleboard",
    title: "PuzzleBoard",
    description: "Self-identifying checkerboard with absolute (u,v) grid via embedded edge-bit pattern.",
    blogSlug: "puzzleboard",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    ConfigComponent: PuzzleboardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("PuzzleBoard detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as PuzzleboardConfig;
        return detectPuzzleboardWasm(pixels, width, height, {
            board: {
                rows: c.boardRows,
                cols: c.boardCols,
                cell_size: c.cellSize,
                origin_row: c.originRow,
                origin_col: c.originCol,
            },
            px_per_square: c.pxPerSquare,
            decode: {
                min_window: c.decodeMinWindow,
                min_bit_confidence: c.decodeMinBitConfidence,
                max_bit_error_rate: c.decodeMaxBitErrorRate,
                sample_radius_rel: c.decodeSampleRadiusRel,
                search_all_components: c.decodeSearchAllComponents,
                search_mode: { kind: c.decodeSearchMode },
                scoring_mode: { kind: c.decodeScoringMode },
                bit_likelihood_slope: c.decodeBitLikelihoodSlope,
                per_bit_floor: c.decodePerBitFloor,
                alignment_min_margin: c.decodeAlignmentMinMargin,
            },
            chessboard: {
                min_corner_strength: c.chessMinCornerStrength,
                completeness_threshold: c.chessCompletenessThreshold,
                graph: {
                    min_spacing_pix: c.graphMinSpacingPix,
                    max_spacing_pix: c.graphMaxSpacingPix,
                },
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as PuzzleBoardDetectResult, runId),
    summary: (result) => {
        const r = result as PuzzleBoardDetectResult;
        return [
            { label: "Corners", value: `${r.summary.corner_count}` },
            { label: "Mean confidence", value: `${(r.summary.mean_confidence * 100).toFixed(1)}%` },
            { label: "Bit error rate", value: `${(r.summary.bit_error_rate * 100).toFixed(1)}%` },
            { label: "Master origin", value: `(${r.summary.master_origin[0]}, ${r.summary.master_origin[1]})` },
            { label: "Runtime", value: `${r.summary.runtime_ms.toFixed(2)} ms` },
        ];
    },
    diagnostics: (result) => toDiagnostics(result as PuzzleBoardDetectResult),
    OverlayComponent: PuzzleboardOverlay,
};
