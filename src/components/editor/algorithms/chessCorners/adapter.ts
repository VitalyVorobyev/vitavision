import type { AlgorithmDefinition, AlgorithmPreset, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { DirectedPointFeature, Feature } from "../../../../store/editor/useEditorStore";
import type { ChessCornersResult } from "../../../../lib/types";
import { detectChessCornersWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import ChessCornersConfigForm, { type ChessCornersConfig } from "./ChessCornersConfigForm";

const initialConfig: ChessCornersConfig = {
    thresholdRel: 0.2,
    useMlRefiner: false,
};

const presets: AlgorithmPreset[] = [
    { label: "Sensitive", description: "Lower threshold, more corners", config: { thresholdRel: 0.08, useMlRefiner: false } },
    { label: "Balanced", description: "Default detection settings", config: { thresholdRel: 0.2, useMlRefiner: false } },
    { label: "Precise", description: "ML-refined subpixel accuracy", config: { thresholdRel: 0.2, useMlRefiner: true } },
];

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
        // Detector origin is center of top-left pixel; canvas origin is its top-left corner.
        x: corner.x + 0.5,
        y: corner.y + 0.5,
        direction: {
            dx: corner.direction.dx,
            dy: corner.direction.dy,
        },
        score: corner.confidence,
        orientationRad: corner.orientation_rad,
        label: `corner ${corner.id.slice(0, 8)}`,
    }));

    return features;
};

export const chessCornersAlgorithm: AlgorithmDefinition = {
    id: "chess-corners",
    title: "ChESS Corners",
    description: "Detect ChESS X-junction keypoints with subpixel positions and orientation vectors.",
    blogSlug: "01-chess",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    ConfigComponent: ChessCornersConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("ChESS corner detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const typedConfig = config as ChessCornersConfig;
        if (typedConfig.useMlRefiner) {
            throw new Error("ML refiner requires server-side execution");
        }
        return detectChessCornersWasm(pixels, width, height, {
            thresholdRel: typedConfig.thresholdRel,
        });
    },
    toFeatures: (result, runId) => toFeatures(result as ChessCornersResult, runId),
    summary: (result) => toSummary(result as ChessCornersResult),
    diagnostics: (result) => toDiagnostics(result as ChessCornersResult),
};
