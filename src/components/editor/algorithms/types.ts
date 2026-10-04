import type { ComponentType } from "react";

import type { Feature, SampleId } from "../../../store/editor/useEditorStore";

export interface AlgorithmSummaryEntry {
    label: string;
    value: string;
}

export interface DiagnosticEntry {
    level: "info" | "warning" | "error";
    message: string;
    detail?: string;
}

/**
 * An algorithm's stored config: the JSON document its WASM package takes (or, where the
 * call takes several documents, a small object holding them side by side), in the
 * package's own snake_case shape. `AlgorithmConfigFormProps` is generic over it only so
 * a form can be typed more tightly; the editor treats it as opaque JSON.
 */
export type ConfigDocument = Record<string, unknown>;

export interface AlgorithmPreset {
    label: string;
    description?: string;
    config: unknown;
}

export interface AlgorithmConfigFormProps<TConfig = unknown> {
    config: TConfig;
    onChange: (next: TConfig) => void;
    disabled: boolean;
    modal?: boolean;
}

export interface AlgorithmDefinition {
    id: string;
    title: string;
    description: string;
    blogSlug?: string;
    initialConfig: unknown;
    sampleDefaults?: Partial<Record<SampleId, unknown>>;
    ConfigComponent: ComponentType<AlgorithmConfigFormProps<unknown>>;
    executionModes?: ["wasm"];
    /** Server-side stub — always throws. Kept for interface compatibility. */
    run: (args: {
        key: string;
        storageMode: string;
        config: unknown;
    }) => Promise<unknown>;
    /** Client-side WASM execution path. Called with decoded image pixels. */
    runWasm?: (args: {
        pixels: Uint8Array;
        width: number;
        height: number;
        config: unknown;
    }) => Promise<unknown>;
    toFeatures: (result: unknown, runId: string) => Feature[];
    summary: (result: unknown) => AlgorithmSummaryEntry[];
    diagnostics?: (result: unknown) => DiagnosticEntry[];
    presets?: AlgorithmPreset[];
}

export interface AlgorithmRunResult {
    runId: string;
    result: unknown;
}
