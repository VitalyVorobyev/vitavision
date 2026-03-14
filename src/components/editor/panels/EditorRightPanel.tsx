import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import type { SampleId } from "../../../store/editor/useEditorStore";

import { ALGORITHM_REGISTRY, DEFAULT_ALGORITHM_ID, getAlgorithmById } from "../algorithms/registry";
import useAlgorithmRunner, { stageLabel } from "../algorithms/useAlgorithmRunner";

import FeatureListPanel from "./FeatureListPanel";

type ConfigEntry = { value: unknown; sampleId: SampleId };

const resolveConfig = (
    entries: Record<string, ConfigEntry>,
    algorithmId: string,
    sampleId: SampleId,
    initialConfig: unknown,
    sampleDefaults: Partial<Record<SampleId, unknown>> | undefined,
): unknown => {
    const entry = entries[algorithmId];
    if (entry?.sampleId === sampleId) {
        return entry.value;
    }
    const defaults = sampleDefaults?.[sampleId];
    return defaults !== undefined ? { ...initialConfig as object, ...defaults as object } : initialConfig;
};

export default function EditorRightPanel() {
    const {
        imageSrc,
        imageName,
        imageSampleId,
        galleryImages,
        replaceAlgorithmFeatures,
        setSelectedFeatureId,
    } = useEditorStore();

    const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string>(DEFAULT_ALGORITHM_ID);
    const [configEntries, setConfigEntries] = useState<Record<string, ConfigEntry>>({});

    const runner = useAlgorithmRunner();
    const algorithm = useMemo(() => getAlgorithmById(selectedAlgorithmId), [selectedAlgorithmId]);

    const ConfigComponent = algorithm.ConfigComponent;
    const config = resolveConfig(
        configEntries,
        algorithm.id,
        imageSampleId,
        algorithm.initialConfig,
        algorithm.sampleDefaults,
    );

    const activeGalleryImage = useMemo(
        () => galleryImages.find((img) => img.sampleId === imageSampleId && imageSrc !== null) ?? null,
        [galleryImages, imageSampleId, imageSrc],
    );

    const canRun = imageSrc !== null && !runner.isRunning;

    const handleRun = async () => {
        const output = await runner.runAlgorithm({
            algorithm,
            config,
            imageSrc,
            imageName,
            storageMode: "auto",
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
        <div className="w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">

                {/* Section 1: Sample hint */}
                {imageSrc === null ? (
                    <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                        Open an image from the gallery to get started.
                    </div>
                ) : (
                    activeGalleryImage && (activeGalleryImage.description || (activeGalleryImage.recommendedAlgorithms?.length ?? 0) > 0) && (
                        <div className="rounded-md border border-border bg-background p-3 space-y-2">
                            <div className="text-xs font-semibold text-foreground">{activeGalleryImage.name}</div>
                            {activeGalleryImage.description && (
                                <p className="text-xs text-muted-foreground">{activeGalleryImage.description}</p>
                            )}
                            {(activeGalleryImage.recommendedAlgorithms?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    <span className="text-[11px] text-muted-foreground">Recommended:</span>
                                    {activeGalleryImage.recommendedAlgorithms!.map((name) => (
                                        <span
                                            key={name}
                                            className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* Section 2: Algorithm choice */}
                <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Algorithm</span>
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

                {/* Section 3: Config */}
                <ConfigComponent
                    config={config}
                    onChange={(next) => setConfigEntries((current) => ({
                        ...current,
                        [algorithm.id]: { value: next, sampleId: imageSampleId },
                    }))}
                    disabled={runner.isRunning}
                />

                {/* Section 4: Run + status + summary */}
                <div className="space-y-3">
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

                    {runner.summary.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Last Run Summary</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {runner.summary.map((entry) => (
                                    <div key={entry.label} className="rounded-md border border-border p-2 text-xs">
                                        <div className="text-muted-foreground">{entry.label}</div>
                                        <div className="font-medium">{entry.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 5: Features */}
                <div className="pt-2 border-t border-border/70">
                    <FeatureListPanel />
                </div>

            </div>
        </div>
    );
}
