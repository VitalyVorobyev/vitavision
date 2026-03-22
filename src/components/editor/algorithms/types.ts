import type { ComponentType } from "react";

import type { StorageMode } from "../../../lib/storage";
import type { Feature, OverlayToggles, SampleId } from "../../../store/editor/useEditorStore";

export type RequestedStorageMode = "auto" | StorageMode;

export interface AlgorithmSummaryEntry {
    label: string;
    value: string;
}

export interface DiagnosticEntry {
    level: "info" | "warning" | "error";
    message: string;
    detail?: string;
}

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
    run: (args: {
        key: string;
        storageMode: StorageMode;
        config: unknown;
    }) => Promise<unknown>;
    toFeatures: (result: unknown, runId: string) => Feature[];
    summary: (result: unknown) => AlgorithmSummaryEntry[];
    diagnostics?: (result: unknown) => DiagnosticEntry[];
    presets?: AlgorithmPreset[];
    OverlayComponent?: ComponentType<{
        result: unknown;
        zoom: number;
        toggles: OverlayToggles;
    }>;
}

export interface AlgorithmRunResult {
    runId: string;
    resolvedStorageMode: StorageMode;
    result: unknown;
}
