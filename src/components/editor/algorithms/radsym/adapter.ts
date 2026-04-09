import type { AlgorithmDefinition, AlgorithmPreset, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { CircleFeature, Feature } from "../../../../store/editor/useEditorStore";
import type { RadsymResult } from "../../../../lib/types";
import { detectRadsymWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import RadsymConfigForm, { type RadsymConfig } from "./RadsymConfigForm";
import RadsymOverlay from "./RadsymOverlay";

const initialConfig: RadsymConfig = {
    minRadius: 5,
    maxRadius: 40,
    alpha: 2.0,
    gradientThreshold: 0,
    smoothingFactor: 0.5,
    nmsRadius: 5,
    nmsThreshold: 0,
    maxDetections: 50,
    polarity: "both",
    gradientOperator: "sobel",
};

const presets: AlgorithmPreset[] = [
    { label: "Default", description: "Balanced detection for general use", config: { ...initialConfig } },
    { label: "Small circles", description: "Detect small features (1-15px)", config: { ...initialConfig, minRadius: 1, maxRadius: 15, nmsRadius: 3 } },
    { label: "Large circles", description: "Detect large features (20-100px)", config: { ...initialConfig, minRadius: 20, maxRadius: 100, nmsRadius: 15 } },
    { label: "Dark only", description: "Only dark circles on bright background", config: { ...initialConfig, polarity: "dark" as const } },
];

const toSummary = (result: RadsymResult): AlgorithmSummaryEntry[] => [
    { label: "Circles", value: `${result.summary.count}` },
    { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
];

const toDiagnostics = (result: RadsymResult): DiagnosticEntry[] => {
    if (result.summary.count === 0) {
        return [{ level: "warning", message: "No circles detected", detail: "Try widening the radius range or lowering the gradient threshold." }];
    }
    return [];
};

const toFeatures = (result: RadsymResult, runId: string): Feature[] => {
    return result.circles.map((circle): CircleFeature => ({
        id: circle.id,
        type: "circle",
        source: "algorithm",
        algorithmId: "radsym",
        runId,
        readonly: true,
        x: circle.x + 0.5,
        y: circle.y + 0.5,
        radius: circle.radius,
        score: circle.score,
        label: `circle ${circle.id.slice(0, 8)}`,
    }));
};

export const radsymAlgorithm: AlgorithmDefinition = {
    id: "radsym",
    title: "Radial Symmetry",
    description: "Detect circular features via Fast Radial Symmetry Transform (FRST).",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    ConfigComponent: RadsymConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("Radial Symmetry detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as RadsymConfig;
        const radii = new Uint32Array(c.maxRadius - c.minRadius + 1);
        for (let i = 0; i < radii.length; i++) {
            radii[i] = c.minRadius + i;
        }
        const wasmConfig = {
            radii,
            alpha: c.alpha,
            gradientThreshold: c.gradientThreshold,
            smoothingFactor: c.smoothingFactor,
            nmsRadius: c.nmsRadius,
            nmsThreshold: c.nmsThreshold,
            maxDetections: c.maxDetections,
            polarity: c.polarity,
            gradientOperator: c.gradientOperator,
        };
        const result = await detectRadsymWasm(pixels, width, height, wasmConfig);
        // Attach config for heatmap generation with matching parameters
        (result as Record<string, unknown>)._heatmapConfig = {
            radii,
            alpha: c.alpha,
            gradientThreshold: c.gradientThreshold,
            smoothingFactor: c.smoothingFactor,
            polarity: c.polarity,
            gradientOperator: c.gradientOperator,
        };
        return result;
    },
    toFeatures: (result, runId) => toFeatures(result as RadsymResult, runId),
    summary: (result) => toSummary(result as RadsymResult),
    diagnostics: (result) => toDiagnostics(result as RadsymResult),
    OverlayComponent: RadsymOverlay,
};
