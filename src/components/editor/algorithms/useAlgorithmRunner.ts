import { useCallback, useState } from "react";

import { createUploadTicket, uploadWithTicket } from "../../../lib/storage";

import type { AlgorithmDefinition, AlgorithmRunResult, AlgorithmSummaryEntry, RequestedStorageMode } from "./types";

export type AlgorithmRunStage = "idle" | "fetching-image" | "requesting-ticket" | "uploading" | "processing";

const corsMessage = "Cannot fetch current image bytes. Upload local image or choose CORS-enabled source.";

const extensionFromMime = (mime: string): string => {
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "image/bmp") return "bmp";
    return "png";
};

const buildUploadName = (imageName: string | null, mime: string): string => {
    if (imageName && imageName.trim().length > 0) {
        return imageName;
    }
    return `editor-image.${extensionFromMime(mime)}`;
};

const fetchImageBlob = async (imageSrc: string): Promise<Blob> => {
    try {
        const response = await fetch(imageSrc);
        if (!response.ok) {
            throw new Error(`Image fetch failed: ${response.status}`);
        }
        return await response.blob();
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(corsMessage);
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
    runAlgorithm: (params: RunAlgorithmParams) => Promise<AlgorithmRunResult | null>;
    clearError: () => void;
}

export const stageLabel = (stage: AlgorithmRunStage): string => {
    if (stage === "fetching-image") return "Reading current image...";
    if (stage === "requesting-ticket") return "Requesting upload ticket...";
    if (stage === "uploading") return "Uploading image...";
    if (stage === "processing") return "Running algorithm...";
    return "Idle";
};

export default function useAlgorithmRunner(): UseAlgorithmRunnerResult {
    const [stage, setStage] = useState<AlgorithmRunStage>("idle");
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<AlgorithmSummaryEntry[]>([]);

    const runAlgorithm = useCallback(async (params: RunAlgorithmParams): Promise<AlgorithmRunResult | null> => {
        const { algorithm, config, imageSrc, imageName, storageMode } = params;
        if (!imageSrc) {
            setError("No active image. Select an image in gallery first.");
            return null;
        }

        try {
            setError(null);
            setStage("fetching-image");

            const blob = await fetchImageBlob(imageSrc);
            const contentType = blob.type || "image/png";
            const filename = buildUploadName(imageName, contentType);

            setStage("requesting-ticket");
            const ticket = await createUploadTicket({
                filename,
                contentType,
                storageMode: storageMode === "auto" ? undefined : storageMode,
            });

            setStage("uploading");
            await uploadWithTicket(blob, ticket);

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
