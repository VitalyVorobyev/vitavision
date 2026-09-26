/**
 * Thin bridge from the app's `TargetConfig`/`PageConfig` to
 * `@vitavision/calib-targets`'s printable-target renderer, running in the
 * WASM Web Worker.
 *
 * Covers every target kind except `"ringgrid"`, which renders through
 * `@vitavision/ringgrid`'s own renderer instead (`ringgridTarget.ts`,
 * `svg/index.ts`, `dxf/index.ts`) — a different WASM module with a different
 * target schema, not a printable kind in calib-targets.
 *
 * No geometry logic lives here — `toPrintableDocument` (`./printableDocument`)
 * does the schema mapping, and `renderTargetBundleWasm`
 * (`src/lib/wasm/wasmWorkerProxy.ts`) does the worker round-trip. This module
 * only wires the two together.
 */

import type { TargetConfig, PageConfig } from "./types";
import { toPrintableDocument } from "./printableDocument";
import { renderTargetBundleWasm } from "../../lib/wasm/wasmWorkerProxy";

export async function renderTargetViaWasm(
    target: TargetConfig,
    page: PageConfig,
): Promise<{ svg: string; dxf: string; json: string; png: Uint8Array }> {
    const doc = toPrintableDocument(target, page);
    return renderTargetBundleWasm(doc);
}
