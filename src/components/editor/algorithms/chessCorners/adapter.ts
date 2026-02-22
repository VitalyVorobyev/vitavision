import type { AlgorithmDefinition, AlgorithmSummaryEntry } from "../types";
import type { DirectedPointFeature, Feature } from "../../../../store/editor/useEditorStore";
import { detectChessCorners, type ChessCornersResult } from "../../../../lib/api";

import ChessCornersConfigForm, { type ChessCornersConfig } from "./ChessCornersConfigForm";

const initialConfig: ChessCornersConfig = {
    thresholdRel: 0.2,
    useMlRefiner: false,
};

const toSummary = (result: ChessCornersResult): AlgorithmSummaryEntry[] => {
    return [
        { label: "Corners", value: `${result.summary.count}` },
        { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
        {
            label: "Subpixel mean",
            value: result.summary.subpixel_mean_offset_px === null
                ? "n/a"
                : `${result.summary.subpixel_mean_offset_px.toFixed(3)} px`,
        },
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
    title: "Chess Corners",
    description: "Detect ChESS X-junction keypoints with subpixel positions and orientation vectors.",
    initialConfig,
    ConfigComponent: ChessCornersConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const typedConfig = config as ChessCornersConfig;
        return detectChessCorners({
            key,
            storageMode,
            useMlRefiner: typedConfig.useMlRefiner,
            config: {
                thresholdRel: typedConfig.thresholdRel,
            },
        });
    },
    toFeatures: (result, runId) => toFeatures(result as ChessCornersResult, runId),
    summary: (result) => toSummary(result as ChessCornersResult),
};
