/**
 * Main-thread typed API for communicating with the WASM Web Worker.
 *
 * Spawns the Worker lazily on first call and uses Transferable ArrayBuffers
 * for zero-copy pixel transfer.
 */

import type { AlgorithmType, WorkerCommand, WorkerResponse } from "./wasmWorker";

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL("./wasmWorker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { id, result, error } = event.data;
            const entry = pending.get(id);
            if (!entry) return;
            pending.delete(id);
            if (error) {
                entry.reject(new Error(error));
            } else {
                entry.resolve(result);
            }
        };
        worker.onerror = (event) => {
            // Reject all pending requests on worker crash
            const err = new Error(`WASM Worker error: ${event.message}`);
            for (const entry of pending.values()) {
                entry.reject(err);
            }
            pending.clear();
            worker = null;
        };
    }
    return worker;
}

function postDetection(
    algorithm: AlgorithmType,
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
    command?: WorkerCommand,
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });

        const w = getWorker();
        w.postMessage(
            { id, command, algorithm, pixels, width, height, config },
            [pixels.buffer], // Transfer ownership for zero-copy
        );
    });
}

// ── Typed public API ─────────────────────────────────────────────────────────

export async function detectChessCornersWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("chess-corners", pixels, width, height, config);
}

export async function detectChessboardWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("chessboard", pixels, width, height, config);
}

export async function detectCharucoWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("charuco", pixels, width, height, config);
}

export async function detectMarkerboardWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("markerboard", pixels, width, height, config);
}

export async function detectRinggridWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("ringgrid", pixels, width, height, config);
}

export async function detectRadsymWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("radsym", pixels, width, height, config);
}

export async function detectPuzzleboardWasm(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<unknown> {
    return postDetection("puzzleboard", pixels, width, height, config);
}

export async function generatePuzzleboardPngWasm(
    rows: number,
    cols: number,
    cellSizeMm: number,
    pngDpi: number,
): Promise<{ png: Uint8Array; mimeType: string }> {
    return postDetection(
        "puzzleboard",
        new Uint8Array(0),
        0,
        0,
        { rows, cols, cellSizeMm, pngDpi },
        "puzzleboard-gen-png",
    ) as Promise<{ png: Uint8Array; mimeType: string }>;
}

export async function generateRadsymHeatmap(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: unknown,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    return postDetection("radsym", pixels, width, height, config, "radsym-heatmap") as Promise<{
        rgba: Uint8Array;
        width: number;
        height: number;
    }>;
}
