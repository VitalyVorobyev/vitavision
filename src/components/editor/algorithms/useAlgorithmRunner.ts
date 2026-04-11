import { useCallback, useState } from "react";

import { decodeImageUrl } from "../../../lib/wasm/imageDecoder";

import type { AlgorithmDefinition, AlgorithmRunResult, AlgorithmSummaryEntry } from "./types";

export type AlgorithmRunStage =
    | "idle"
    | "decoding-image"
    | "processing";

const buildRunId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `run-${Date.now()}`;
};

/** Maximum pixel count for WASM execution (20 megapixels). */
const WASM_MAX_PIXELS = 20_000_000;

interface RunAlgorithmParams {
    algorithm: AlgorithmDefinition;
    config: unknown;
    imageSrc: string | null;
    imageName: string | null;
}

interface UseAlgorithmRunnerResult {
    stage: AlgorithmRunStage;
    isRunning: boolean;
    error: string | null;
    summary: AlgorithmSummaryEntry[];
    runAlgorithm: (params: RunAlgorithmParams) => Promise<AlgorithmRunResult | null>;
    clearError: () => void;
}

export const stageLabel = (stage: AlgorithmRunStage): string => {
    if (stage === "decoding-image") return "Decoding image pixels...";
    if (stage === "processing") return "Running algorithm...";
    return "Idle";
};

export default function useAlgorithmRunner(): UseAlgorithmRunnerResult {
    const [stage, setStage] = useState<AlgorithmRunStage>("idle");
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<AlgorithmSummaryEntry[]>([]);

    const runAlgorithm = useCallback(async (params: RunAlgorithmParams): Promise<AlgorithmRunResult | null> => {
        const { algorithm, config, imageSrc } = params;
        if (!imageSrc) {
            setError("No active image. Select an image in gallery first.");
            return null;
        }

        try {
            setError(null);

            setStage("decoding-image");
            const { pixels, width, height } = await decodeImageUrl(imageSrc);

            if (width * height > WASM_MAX_PIXELS) {
                throw new Error("Image too large for client-side processing (max 20 megapixels)");
            }

            setStage("processing");
            const result = await algorithm.runWasm!({ pixels, width, height, config });

            const summaryEntries = algorithm.summary(result);
            setSummary(summaryEntries);

            return { runId: buildRunId(), result };
        } catch (rawError) {
            const message = rawError instanceof Error ? rawError.message : "Unknown algorithm pipeline error";
            setError(message);
            return null;
        } finally {
            setStage("idle");
        }
    }, []);

    return {
        stage,
        isRunning: stage !== "idle",
        error,
        summary,
        runAlgorithm,
        clearError: () => setError(null),
    };
}
