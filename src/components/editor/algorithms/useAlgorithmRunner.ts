import { useCallback, useState } from "react";

import { createUploadTicket, sha256Hex, uploadWithTicket } from "../../../lib/storage";
import { decodeImageUrl } from "../../../lib/wasm/imageDecoder";

import type { AlgorithmDefinition, AlgorithmRunResult, AlgorithmSummaryEntry, ExecutionMode, RequestedStorageMode } from "./types";

export type AlgorithmRunStage =
    | "idle"
    | "fetching-image"
    | "decoding-image"
    | "hashing"
    | "requesting-ticket"
    | "uploading"
    | "processing";

const corsMessage = "Cannot fetch current image bytes. Upload local image or choose CORS-enabled source.";

const fetchImageBlob = async (imageSrc: string): Promise<Blob> => {
    try {
        const response = await fetch(imageSrc);
        if (!response.ok) {
            throw new Error(`Image fetch failed: ${response.status}`);
        }
        return await response.blob();
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(corsMessage, { cause: error });
        }
        throw error;
    }
};

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
    storageMode: RequestedStorageMode;
}

interface UseAlgorithmRunnerResult {
    stage: AlgorithmRunStage;
    isRunning: boolean;
    error: string | null;
    summary: AlgorithmSummaryEntry[];
    executionMode: ExecutionMode | null;
    runAlgorithm: (params: RunAlgorithmParams) => Promise<AlgorithmRunResult | null>;
    clearError: () => void;
}

export const stageLabel = (stage: AlgorithmRunStage): string => {
    if (stage === "fetching-image") return "Reading current image...";
    if (stage === "decoding-image") return "Decoding image pixels...";
    if (stage === "hashing") return "Computing image hash...";
    if (stage === "requesting-ticket") return "Checking storage...";
    if (stage === "uploading") return "Uploading image...";
    if (stage === "processing") return "Running algorithm...";
    return "Idle";
};

function resolveExecutionMode(algorithm: AlgorithmDefinition): ExecutionMode {
    const modes = algorithm.executionModes ?? ["server"];
    if (modes.includes("wasm") && algorithm.runWasm) {
        return "wasm";
    }
    return "server";
}

export default function useAlgorithmRunner(): UseAlgorithmRunnerResult {
    const [stage, setStage] = useState<AlgorithmRunStage>("idle");
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<AlgorithmSummaryEntry[]>([]);
    const [executionMode, setExecutionMode] = useState<ExecutionMode | null>(null);

    const runAlgorithm = useCallback(async (params: RunAlgorithmParams): Promise<AlgorithmRunResult | null> => {
        const { algorithm, config, imageSrc, storageMode } = params;
        if (!imageSrc) {
            setError("No active image. Select an image in gallery first.");
            return null;
        }

        const mode = resolveExecutionMode(algorithm);
        setExecutionMode(mode);

        try {
            setError(null);

            if (mode === "wasm") {
                return await runWasmPath(algorithm, config, imageSrc);
            }
            return await runServerPath(algorithm, config, imageSrc, storageMode);
        } catch (rawError) {
            // If WASM failed, try server fallback
            if (mode === "wasm") {
                try {
                    setExecutionMode("server");
                    return await runServerPath(algorithm, config, imageSrc, storageMode);
                } catch (fallbackError) {
                    const message = fallbackError instanceof Error ? fallbackError.message : "Unknown algorithm pipeline error";
                    setError(message);
                    return null;
                }
            }
            const message = rawError instanceof Error ? rawError.message : "Unknown algorithm pipeline error";
            setError(message);
            return null;
        } finally {
            setStage("idle");
        }
    }, []);

    async function runWasmPath(
        algorithm: AlgorithmDefinition,
        config: unknown,
        imageSrc: string,
    ): Promise<AlgorithmRunResult | null> {
        setStage("decoding-image");
        const { pixels, width, height } = await decodeImageUrl(imageSrc);

        // Size guard: fall back to server for very large images
        if (width * height > WASM_MAX_PIXELS) {
            throw new Error("Image too large for client-side processing");
        }

        setStage("processing");
        const result = await algorithm.runWasm!({ pixels, width, height, config });

        const summaryEntries = algorithm.summary(result);
        setSummary(summaryEntries);

        return {
            runId: buildRunId(),
            resolvedStorageMode: "local",
            result,
        };
    }

    async function runServerPath(
        algorithm: AlgorithmDefinition,
        config: unknown,
        imageSrc: string,
        storageMode: RequestedStorageMode,
    ): Promise<AlgorithmRunResult | null> {
        setStage("fetching-image");
        const blob = await fetchImageBlob(imageSrc);
        const contentType = blob.type || "image/png";

        setStage("hashing");
        const hash = await sha256Hex(blob);

        setStage("requesting-ticket");
        const ticket = await createUploadTicket({
            sha256: hash,
            contentType,
            size: blob.size,
            storageMode: storageMode === "auto" ? undefined : storageMode,
        });

        if (!ticket.exists && ticket.upload) {
            setStage("uploading");
            await uploadWithTicket(blob, ticket.upload);
        }

        setStage("processing");
        const result = await algorithm.run({
            key: ticket.key,
            storageMode: ticket.storage_mode,
            config,
        });

        const summaryEntries = algorithm.summary(result);
        setSummary(summaryEntries);

        return {
            runId: buildRunId(),
            resolvedStorageMode: ticket.storage_mode,
            result,
        };
    }

    return {
        stage,
        isRunning: stage !== "idle",
        error,
        summary,
        executionMode,
        runAlgorithm,
        clearError: () => setError(null),
    };
}
