/**
 * Thin bridge from the app's `TargetConfig`/`PageConfig` to the library's
 * printable-target renderer, running in the WASM Web Worker.
 *
 * No geometry logic lives here — `toPrintableDocument` (`./printableDocument`)
 * does the schema mapping, and `renderTargetBundleWasm`
 * (`src/lib/wasm/wasmWorkerProxy.ts`) does the worker round-trip. This module
 * only wires the two together and draws the ring-grid exclusion line.
 */

import type { TargetConfig, PageConfig, TargetType } from "./types";
import { toPrintableDocument } from "./printableDocument";
import { renderTargetBundleWasm } from "../../lib/wasm/wasmWorkerProxy";

/**
 * True for every target kind except `"ringgrid"`, which has no printable
 * representation in `@vitavision/calib-targets` and stays on the TS
 * generator path (`svg/ringgridSvg.ts`, `dxf/ringgridDxf.ts`).
 */
export function isWasmRenderable(targetType: TargetType): boolean {
    return targetType !== "ringgrid";
}

export async function renderTargetViaWasm(
    target: TargetConfig,
    page: PageConfig,
): Promise<{ svg: string; dxf: string; json: string; png: Uint8Array }> {
    const doc = toPrintableDocument(target, page);
    return renderTargetBundleWasm(doc);
}
