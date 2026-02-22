import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";

import { ALGORITHM_REGISTRY, DEFAULT_ALGORITHM_ID, getAlgorithmById } from "../algorithms/registry";
import useAlgorithmRunner, { stageLabel } from "../algorithms/useAlgorithmRunner";
import type { RequestedStorageMode } from "../algorithms/types";

const buildInitialConfigs = (): Record<string, unknown> => {
    return Object.fromEntries(ALGORITHM_REGISTRY.map((algorithm) => [algorithm.id, algorithm.initialConfig]));
};

export default function AlgorithmPanel() {
    const {
        imageSrc,
        imageName,
        replaceAlgorithmFeatures,
        setSelectedFeatureId,
    } = useEditorStore();

    const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string>(DEFAULT_ALGORITHM_ID);
    const [requestedStorageMode, setRequestedStorageMode] = useState<RequestedStorageMode>("auto");
    const [configs, setConfigs] = useState<Record<string, unknown>>(() => buildInitialConfigs());

    const runner = useAlgorithmRunner();
    const algorithm = useMemo(() => getAlgorithmById(selectedAlgorithmId), [selectedAlgorithmId]);

    const ConfigComponent = algorithm.ConfigComponent;
    const config = configs[algorithm.id] ?? algorithm.initialConfig;

    const canRun = imageSrc !== null && !runner.isRunning;

    const handleRun = async () => {
        const output = await runner.runAlgorithm({
            algorithm,
            config,
            imageSrc,
            imageName,
            storageMode: requestedStorageMode,
        });

        if (!output) {
            return;
        }

        const mappedFeatures = algorithm.toFeatures(output.result, output.runId);
        replaceAlgorithmFeatures(algorithm.id, mappedFeatures);
        if (mappedFeatures.length > 0) {
            setSelectedFeatureId(mappedFeatures[0].id);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Algorithms</h2>

            <div className="space-y-4">
                <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Algorithm</span>
                    <select
                        className="rounded-md border border-border bg-background px-3 py-2"
                        value={selectedAlgorithmId}
                        onChange={(event) => {
                            setSelectedAlgorithmId(event.target.value);
                            runner.clearError();
                        }}
                    >
                        {ALGORITHM_REGISTRY.map((item) => (
                            <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                    </select>
                </label>

                <p className="text-xs text-muted-foreground">{algorithm.description}</p>

                <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Storage mode</span>
                    <select
                        className="rounded-md border border-border bg-background px-3 py-2"
                        value={requestedStorageMode}
                        onChange={(event) => setRequestedStorageMode(event.target.value as RequestedStorageMode)}
                    >
                        <option value="auto">Auto (prefer R2)</option>
                        <option value="r2">R2 only</option>
                        <option value="local">Local dev storage</option>
                    </select>
                </label>

                <ConfigComponent
                    config={config}
                    onChange={(next) => setConfigs((current) => ({
                        ...current,
                        [algorithm.id]: next,
                    }))}
                    disabled={runner.isRunning}
                />

                <button
                    type="button"
                    onClick={handleRun}
                    disabled={!canRun}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {runner.isRunning ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Run Algorithm
                </button>

                {!imageSrc && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                        No active image. Select an image in gallery first.
                    </div>
                )}

                <div className="text-xs text-muted-foreground">
                    Status: <span className="font-medium">{stageLabel(runner.stage)}</span>
                </div>

                {runner.error && (
                    <div className="text-sm text-red-600 dark:text-red-400">{runner.error}</div>
                )}
            </div>

            <div className="mt-5 pt-4 border-t border-border/70 overflow-y-auto">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Last Run Summary</h3>
                {runner.summary.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No runs yet.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {runner.summary.map((entry) => (
                            <div key={entry.label} className="rounded-md border border-border p-2 text-xs">
                                <div className="text-muted-foreground">{entry.label}</div>
                                <div className="font-medium">{entry.value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
