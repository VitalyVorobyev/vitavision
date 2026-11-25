/**
 * Bridge from the app's `TargetConfig` / `ScreenSettings` to the native-resolution
 * screen renderers, running in the WASM Web Worker. Mirrors `renderViaWasm.ts`
 * (print); the schema mapping lives in `screenTarget.ts`, the worker round trip
 * in `wasmWorkerProxy.ts`. Rejects with the library's own message on invalid
 * input (the caller surfaces it as a validation error).
 */

import type { RingGridConfig, ScreenRenderResult, ScreenSettings, TargetConfig } from "./types";
import {
    buildRinggridSidecar,
    geometryFromCalibSidecar,
    geometryFromRinggridMetadata,
    toRinggridScreenOptions,
    toRinggridScreenTargetJson,
    toScreenOptions,
    toScreenRenderResult,
    toScreenTargetSpec,
    type RinggridScreenMetadata,
} from "./screenTarget";
import { renderRinggridScreenTargetWasm, renderScreenTargetWasm } from "../../lib/wasm/wasmWorkerProxy";

async function renderRinggridScreen(c: RingGridConfig, screen: ScreenSettings): Promise<ScreenRenderResult> {
    const bundle = await renderRinggridScreenTargetWasm(
        toRinggridScreenTargetJson(c),
        JSON.stringify(toRinggridScreenOptions(c, screen)),
    );
    const metadata = bundle.metadata as RinggridScreenMetadata;
    return toScreenRenderResult(
        bundle.png,
        buildRinggridSidecar(metadata, bundle.json),
        geometryFromRinggridMetadata(metadata),
        screen,
    );
}

export async function renderScreenViaWasm(target: TargetConfig, screen: ScreenSettings): Promise<ScreenRenderResult> {
    if (target.targetType === "ringgrid") return renderRinggridScreen(target.config, screen);
    const bundle = await renderScreenTargetWasm(toScreenTargetSpec(target), toScreenOptions(screen));
    return toScreenRenderResult(bundle.png, bundle.json, geometryFromCalibSidecar(bundle.json), screen);
}
