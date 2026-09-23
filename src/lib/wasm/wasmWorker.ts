/**
 * Web Worker for running WASM-based CV algorithms off the main thread.
 *
 * Lazily loads WASM modules on first use. Accepts detection requests via
 * postMessage and returns results (or errors) with correlation IDs.
 *
 * This file is the Worker ENTRY POINT ONLY — the proxy spawns it via
 * `new Worker(new URL("./wasmWorker.ts", import.meta.url), { type: "module" })`,
 * so the filename must not change. All actual detection/adaptation logic
 * lives in `./worker/*`; those modules never touch `self`/`postMessage`.
 */

import type { CommandRequest, DetectionRequest, WorkerCommand, WorkerRequest, WorkerResponse } from "./worker/protocol";
import { handleChessCorners } from "./worker/chessCorners";
import { handleCalibTarget, handleRenderTargetBundle } from "./worker/calibTargets";
import { handlePuzzleboard, handlePuzzleboardGenPng } from "./worker/puzzleboard";
import { handleRinggrid, handleRenderRinggridBundle, handleRinggridPageSize } from "./worker/ringgrid";
import { handleRadsym, handleRadsymHeatmap } from "./worker/radsym";

export type { AlgorithmType, WorkerCommand, WorkerRequest, WorkerResponse } from "./worker/protocol";

async function runDetection(req: DetectionRequest): Promise<unknown> {
    const { algorithm, pixels, width, height } = req;
    const config = req.config as Record<string, unknown>;

    if (algorithm === "chess-corners") return handleChessCorners(pixels, width, height, config);
    if (algorithm === "ringgrid") return handleRinggrid(pixels, width, height, config);
    if (algorithm === "radsym") return handleRadsym(pixels, width, height, config);
    if (algorithm === "puzzleboard") return handlePuzzleboard(pixels, width, height, config);
    return handleCalibTarget(algorithm as "chessboard" | "charuco" | "markerboard", pixels, width, height, config);
}

interface Dispatched {
    result: unknown;
    transfer?: Transferable[];
}

const commandTable: Record<WorkerCommand, (req: CommandRequest) => Promise<Dispatched>> = {
    "radsym-heatmap": async (req) => {
        const heatmap = await handleRadsymHeatmap(req.pixels, req.width, req.height, req.config as Record<string, unknown>);
        return { result: heatmap, transfer: [heatmap.rgba.buffer] };
    },
    "puzzleboard-gen-png": async (req) => {
        const c = req.config as Record<string, unknown>;
        const rows = (c.rows as number) ?? 7;
        const cols = (c.cols as number) ?? 10;
        const cellSizeMm = (c.cellSizeMm as number) ?? 15;
        const dpi = (c.pngDpi as number) ?? 300;
        const genResult = await handlePuzzleboardGenPng(rows, cols, cellSizeMm, dpi);
        return { result: genResult, transfer: [genResult.png.buffer] };
    },
    "render-target-bundle": async (req) => {
        const bundleResult = await handleRenderTargetBundle(req.config);
        return { result: bundleResult, transfer: [bundleResult.png.buffer] };
    },
    "render-ringgrid-bundle": async (req) => {
        const { targetJson, optionsJson } = req.config as { targetJson: string; optionsJson: string };
        const bundleResult = await handleRenderRinggridBundle(targetJson, optionsJson);
        return { result: bundleResult, transfer: [bundleResult.png.buffer] };
    },
    "ringgrid-page-size": async (req) => {
        const { targetJson, optionsJson } = req.config as { targetJson: string; optionsJson: string };
        const sizeResult = await handleRinggridPageSize(targetJson, optionsJson);
        return { result: sizeResult };
    },
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const req = event.data;
    const { id } = req;

    try {
        // A request carries `algorithm` iff it is a detection request; a
        // missing `command` on that shape is equivalent to "detect". Commands
        // never carry `algorithm` (see worker/protocol.ts).
        const { result, transfer } = "algorithm" in req
            ? { result: await runDetection(req), transfer: undefined }
            : await commandTable[req.command](req);
        (self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse, transfer ?? []);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        (self as unknown as Worker).postMessage({ id, error: message } satisfies WorkerResponse);
    }
};
