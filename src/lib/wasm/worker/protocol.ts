/**
 * Wire protocol between the main thread (`wasmWorkerProxy.ts`) and the WASM
 * Web Worker (`wasmWorker.ts`).
 *
 * `WorkerRequest` is a discriminated union: a `DetectionRequest` runs one of
 * the seven registered algorithms and carries `algorithm`; a `CommandRequest`
 * selects a non-detection operation (render/generate/measure) by `command`
 * alone and never carries `algorithm` — the worker dispatch never reads it
 * for those, so earlier revisions that filled it with a placeholder value
 * were carrying a field with no effect.
 */

export type AlgorithmType =
    | "chess-corners"
    | "chessboard"
    | "charuco"
    | "markerboard"
    | "ringgrid"
    | "radsym"
    | "puzzleboard";

export type WorkerCommand =
    | "radsym-heatmap"
    | "puzzleboard-gen-png"
    | "render-target-bundle"
    | "render-ringgrid-bundle"
    | "ringgrid-page-size";

/** Runs one of the seven registered algorithms against real pixel data. A
 * missing `command` (the common case) is equivalent to `"detect"`. */
export interface DetectionRequest {
    id: number;
    command?: "detect";
    algorithm: AlgorithmType;
    pixels: Uint8Array;
    width: number;
    height: number;
    config: unknown;
}

/** A non-detection command. `pixels`/`width`/`height` are real for commands
 * that process an actual image (e.g. `radsym-heatmap`) and dummy
 * (`new Uint8Array(0)`, 0, 0) for commands whose input is entirely inside
 * `config` (render/generate/measure). */
export interface CommandRequest {
    id: number;
    command: WorkerCommand;
    pixels: Uint8Array;
    width: number;
    height: number;
    config: unknown;
}

export type WorkerRequest = DetectionRequest | CommandRequest;

export interface WorkerResponse {
    id: number;
    result?: unknown;
    error?: string;
}
