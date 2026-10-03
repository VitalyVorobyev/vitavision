import type { AlgorithmDefinition, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { Feature, PointFeature } from "../../../../store/editor/useEditorStore";
import { readCanvasTokens, scoreTone } from "../../../../lib/canvasTokens";
import type { RadsymResult } from "../../../../lib/types";
import { detectRadsymWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import { createConfigForm } from "../createConfigForm";
import { initialConfig, presets } from "./config";
import { renderRadsymField } from "./RadiusRange";
import { schema } from "./schema";
import { ui } from "./ui";

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

/**
 * The verdict colour of a proposal's score, stored on the point it becomes: the ui verdict
 * tokens as the image well resolves them (the point is drawn on the photograph).
 */
function scoreColor(score: number): string {
    return readCanvasTokens("well")[scoreTone(score)];
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
    ConfigComponent: createConfigForm({ schema, ui, renderField: renderRadsymField }),
    run: () => Promise.reject(new Error("Radial Symmetry detection is only available via client-side WASM.")),
    runWasm: async ({ pixels, width, height, config }) => {
        const result = await detectRadsymWasm(pixels, width, height, config);
        // The heatmap overlay is computed from the same config, so it shows the response the
        // proposals were taken from.
        (result as Record<string, unknown>)._heatmapConfig = config;
        return result;
    },
    toFeatures: (result, runId) => toFeatures(result as RadsymResult, runId),
    summary: (result) => toSummary(result as RadsymResult),
    diagnostics: (result) => toDiagnostics(result as RadsymResult),
};
