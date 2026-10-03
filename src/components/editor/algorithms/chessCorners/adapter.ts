import type { AlgorithmDefinition, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { DirectedPointFeature, Feature } from "../../../../store/editor/useEditorStore";
import type { ChessCornersResult } from "../../../../lib/types";
import { detectChessCornersWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import { createConfigForm } from "../createConfigForm";
import { initialConfig, presets } from "./config";
import { schema } from "./schema";
import { ui } from "./ui";

const toDiagnostics = (result: ChessCornersResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.count === 0) {
        entries.push({ level: "warning", message: "No corners detected", detail: "Try lowering the threshold or check that the image contains X-junctions." });
    }
    return entries;
};

const toSummary = (result: ChessCornersResult): AlgorithmSummaryEntry[] => {
    return [
        { label: "Corners", value: `${result.summary.count}` },
        { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
    ];
};

const toFeatures = (result: ChessCornersResult, runId: string): Feature[] => {
    const features: DirectedPointFeature[] = result.corners.map((corner) => ({
        id: corner.id,
        type: "directed_point",
        source: "algorithm",
        algorithmId: "chess-corners",
        runId,
        readonly: true,
        // The detector's own frame: the centre of the top-left pixel is (0, 0), as on the stage.
        x: corner.x,
        y: corner.y,
        axes: [
            { dx: corner.axes[0].direction.dx, dy: corner.axes[0].direction.dy, angleRad: corner.axes[0].angle_rad, sigmaRad: corner.axes[0].sigma_rad },
            { dx: corner.axes[1].direction.dx, dy: corner.axes[1].direction.dy, angleRad: corner.axes[1].angle_rad, sigmaRad: corner.axes[1].sigma_rad },
        ],
        score: corner.confidence,
        label: `corner ${corner.id.slice(0, 8)}`,
    }));

    return features;
};

export const chessCornersAlgorithm: AlgorithmDefinition = {
    id: "chess-corners",
    title: "ChESS Corners",
    description: "Detect ChESS X-junction keypoints with subpixel positions and two-axis orientation descriptors.",
    blogSlug: "pyramidal-blur-aware-xcorner",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("ChESS corner detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectChessCornersWasm(pixels, width, height, config),
    toFeatures: (result, runId) => toFeatures(result as ChessCornersResult, runId),
    summary: (result) => toSummary(result as ChessCornersResult),
    diagnostics: (result) => toDiagnostics(result as ChessCornersResult),
};
