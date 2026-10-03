import type { AlgorithmDefinition, AlgorithmSummaryEntry, DiagnosticEntry } from "../types";
import type { Feature, RingMarkerFeature } from "../../../../store/editor/useEditorStore";
import type { RinggridDetectResult } from "../../../../lib/types";
import { detectRinggridWasm } from "../../../../lib/wasm/wasmWorkerProxy";

import { createConfigForm } from "../createConfigForm";
import { initialConfig } from "./config";
import { schema } from "./schema";
import { ui } from "./ui";

const RAD_TO_DEG = 180 / Math.PI;

const toSummary = (result: RinggridDetectResult): AlgorithmSummaryEntry[] => [
    { label: "Markers", value: `${result.summary.marker_count}` },
    { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
];

const toDiagnostics = (result: RinggridDetectResult): DiagnosticEntry[] => {
    if (result.summary.marker_count === 0) {
        return [{ level: "warning", message: "No markers detected", detail: "Check that the board parameters match the target in the image." }];
    }
    return [];
};

const toFeatures = (result: RinggridDetectResult, runId: string): Feature[] => {
    return result.markers.map((marker, index): RingMarkerFeature => ({
        id: `rg-${index}-${runId}`,
        type: "ring_marker",
        source: "algorithm",
        algorithmId: "ringgrid",
        runId,
        readonly: true,
        x: marker.center.x,
        y: marker.center.y,
        outerEllipse: {
            cx: marker.ellipse_outer.cx,
            cy: marker.ellipse_outer.cy,
            a: marker.ellipse_outer.a,
            b: marker.ellipse_outer.b,
            angleDeg: marker.ellipse_outer.angle * RAD_TO_DEG,
        },
        innerEllipse: {
            cx: marker.ellipse_inner.cx,
            cy: marker.ellipse_inner.cy,
            a: marker.ellipse_inner.a,
            b: marker.ellipse_inner.b,
            angleDeg: marker.ellipse_inner.angle * RAD_TO_DEG,
        },
        meta: {
            kind: marker.decode ? "ringgrid_decoded" : "ringgrid_proposal",
            markerId: marker.id,
            score: marker.confidence,
            rotation: marker.decode?.best_rotation,
            hamming: marker.decode ? marker.decode.best_dist : undefined,
            targetPosition: marker.board_xy_mm
                ? { x: marker.board_xy_mm.x, y: marker.board_xy_mm.y }
                : undefined,
        },
    }));
};

export const ringgridAlgorithm: AlgorithmDefinition = {
    id: "ringgrid",
    title: "Ring Grid",
    description: "Detect concentric ring markers on a hex-lattice grid with binary code bands.",
    initialConfig,
    sampleDefaults: {
        ringgrid: { ...initialConfig },
    },
    executionModes: ["wasm"],
    ConfigComponent: createConfigForm({ schema, ui }),
    run: () => Promise.reject(new Error("Ring Grid detection is only available via client-side WASM.")),
    runWasm: ({ pixels, width, height, config }) => detectRinggridWasm(pixels, width, height, config),
    toFeatures: (result, runId) => toFeatures(result as RinggridDetectResult, runId),
    summary: (result) => toSummary(result as RinggridDetectResult),
    diagnostics: (result) => toDiagnostics(result as RinggridDetectResult),
};
