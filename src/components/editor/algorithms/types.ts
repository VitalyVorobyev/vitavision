import type { ComponentType } from "react";

import type { StorageMode } from "../../../lib/storage";
import type { Feature } from "../../../store/editor/useEditorStore";

export type RequestedStorageMode = "auto" | StorageMode;

export interface AlgorithmSummaryEntry {
    label: string;
    value: string;
}

export interface AlgorithmConfigFormProps<TConfig = unknown> {
    config: TConfig;
    onChange: (next: TConfig) => void;
    disabled: boolean;
}

export interface AlgorithmDefinition {
    id: string;
    title: string;
    description: string;
    initialConfig: unknown;
    ConfigComponent: ComponentType<AlgorithmConfigFormProps<unknown>>;
    run: (args: {
        key: string;
        storageMode: StorageMode;
        config: unknown;
    }) => Promise<unknown>;
    toFeatures: (result: unknown, runId: string) => Feature[];
    summary: (result: unknown) => AlgorithmSummaryEntry[];
}

export interface AlgorithmRunResult {
    runId: string;
    resolvedStorageMode: StorageMode;
    result: unknown;
}
