import type { AlgorithmDefinition, AlgorithmPreset, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { Feature, PointFeature } from "../../../../store/editor/useEditorStore";
import type { RadsymResult } from "../../../../lib/types";
import { detectRadsymWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import RadsymConfigForm, { type RadsymConfig } from "./RadsymConfigForm";

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
    algorithm: "frst",
};

const presets: AlgorithmPreset[] = [
    { label: "Default", description: "Balanced detection for general use", config: { ...initialConfig } },
    { label: "Small features", description: "Detect small features (1-15px)", config: { ...initialConfig, minRadius: 1, maxRadius: 15, nmsRadius: 3 } },
    { label: "Large features", description: "Detect large features (20-100px)", config: { ...initialConfig, minRadius: 20, maxRadius: 100, nmsRadius: 15 } },
    { label: "Dark only", description: "Only dark centers on bright background", config: { ...initialConfig, polarity: "dark" as const } },
    { label: "Fast (RSD)", description: "RSD fused algorithm, ~2× faster", config: { ...initialConfig, algorithm: "rsd_fused" as const } },
];

const toSummary = (result: RadsymResult): AlgorithmSummaryEntry[] => [
    { label: "Proposals", value: `${result.summary.count}` },
    { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
];

const toDiagnostics = (result: RadsymResult): DiagnosticEntry[] => {
    if (result.summary.count === 0) {
        return [{ level: "warning", message: "No proposals found", detail: "Try widening the radius range or lowering the gradient threshold." }];
    }
    return [];
};

/** Map score [0,1] to a color for point rendering. */
function scoreColor(score: number): string {
    if (score >= 0.66) return "#22c55e";
    if (score >= 0.33) return "#f59e0b";
    return "#ef4444";
}

const toFeatures = (result: RadsymResult, runId: string): Feature[] => {
    return result.circles.map((c): PointFeature => ({
        id: c.id,
        type: "point",
        source: "algorithm",
        algorithmId: "radsym",
        runId,
        readonly: true,
        x: c.x + 0.5,
        y: c.y + 0.5,
        color: scoreColor(c.score),
        meta: { kind: "radsym_proposal", score: c.score },
    }));
};

export const radsymAlgorithm: AlgorithmDefinition = {
    id: "radsym",
    title: "Radial Symmetry",
    description: "Detect radial symmetry centers via response map voting (FRST / RSD).",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    ConfigComponent: RadsymConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("Radial Symmetry detection is only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as RadsymConfig;
        if (c.minRadius > c.maxRadius) {
            throw new Error(`Invalid radius range: minRadius (${c.minRadius}) > maxRadius (${c.maxRadius})`);
        }
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
            algorithm: c.algorithm,
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
            algorithm: c.algorithm,
        };
        return result;
    },
    toFeatures: (result, runId) => toFeatures(result as RadsymResult, runId),
    summary: (result) => toSummary(result as RadsymResult),
    diagnostics: (result) => toDiagnostics(result as RadsymResult),
};
