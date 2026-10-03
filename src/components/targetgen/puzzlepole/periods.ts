import { puzzlepolePeriodsWasm } from "../../../lib/wasm/wasmWorkerProxy";
import type { PuzzlepolePeriod } from "./geometry";

let cached: Promise<PuzzlepolePeriod[]> | null = null;

/**
 * The library's supported `[circumference_squares, start_row]` pairs, fetched
 * once through the WASM worker and shared by validation and the config panel.
 * Kept out of `geometry.ts` and the panels: this module reaches the worker
 * proxy, which design-synced components must not import.
 */
export function loadPuzzlepolePeriods(): Promise<PuzzlepolePeriod[]> {
    cached ??= puzzlepolePeriodsWasm().catch((error: unknown) => {
        cached = null; // do not cache a failure
        throw error;
    });
    return cached;
}
