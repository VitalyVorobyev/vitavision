import type { AlgorithmDefinition, AlgorithmPreset, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { DirectedPointFeature, Feature } from "../../../../store/editor/useEditorStore";
import type { ChessCornersResult } from "../../../../lib/types";
import { detectChessCornersWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import ChessCornersConfigForm, { type ChessCornersConfig } from "./ChessCornersConfigForm";

const initialConfig: ChessCornersConfig = {
    thresholdRel: 0.2,
    nmsRadius: 2,
    minClusterSize: 2,
    broadMode: false,
    pyramidLevels: 4,
    pyramidMinSize: 128,
    upscaleFactor: 0,
    refiner: "center_of_mass",
};

const presets: AlgorithmPreset[] = [
    {
        label: "Sensitive",
        description: "Lower threshold, broad mode, more pyramid levels",
        config: { thresholdRel: 0.1, nmsRadius: 2, minClusterSize: 2, broadMode: true, pyramidLevels: 5, pyramidMinSize: 128, upscaleFactor: 0, refiner: "center_of_mass" },
    },
    {
        label: "Balanced",
        description: "Default detection settings",
        config: { ...initialConfig },
    },
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
        axes: [
            { dx: corner.axes[0].direction.dx, dy: corner.axes[0].direction.dy, angleRad: corner.axes[0].angle_rad, sigmaRad: corner.axes[0].sigma_rad },
            { dx: corner.axes[1].direction.dx, dy: corner.axes[1].direction.dy, angleRad: corner.axes[1].angle_rad, sigmaRad: corner.axes[1].sigma_rad },
        ],
        score: corner.confidence,
        contrast: corner.contrast,
        fitRms: corner.fit_rms,
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
    ConfigComponent: ChessCornersConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("ChESS corner detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const typedConfig = config as ChessCornersConfig;
        return detectChessCornersWasm(pixels, width, height, {
            thresholdRel: typedConfig.thresholdRel,
            nmsRadius: typedConfig.nmsRadius,
            minClusterSize: typedConfig.minClusterSize,
            broadMode: typedConfig.broadMode,
            pyramidLevels: typedConfig.pyramidLevels,
            pyramidMinSize: typedConfig.pyramidMinSize,
            upscaleFactor: typedConfig.upscaleFactor,
            refiner: typedConfig.refiner,
        });
    },
    toFeatures: (result, runId) => toFeatures(result as ChessCornersResult, runId),
    summary: (result) => toSummary(result as ChessCornersResult),
    diagnostics: (result) => toDiagnostics(result as ChessCornersResult),
};
