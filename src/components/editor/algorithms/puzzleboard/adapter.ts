import type { AlgorithmDefinition, DiagnosticEntry } from "../types";
import type { PuzzleBoardDetectResult } from "../../../../lib/types";
import { detectPuzzleboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { createConfigForm } from "../createConfigForm";
import { initialConfig, presets } from "./config";
import { schema } from "./schema";
import { ui } from "./ui";
import type { LabeledPointFeature } from "../../../../store/editor/useEditorStore";

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
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("PuzzleBoard detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectPuzzleboardWasm(pixels, width, height, config),
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
};
