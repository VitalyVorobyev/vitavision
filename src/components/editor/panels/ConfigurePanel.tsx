import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles, AlertCircle } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import type { SampleId } from "../../../store/editor/useEditorStore";

import { ALGORITHM_REGISTRY, DEFAULT_ALGORITHM_ID, getAlgorithmById } from "../algorithms/registry";
import useAlgorithmRunner, { stageLabel } from "../algorithms/useAlgorithmRunner";

import RailSection from "./RailSection";

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

function AlgorithmPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
    return (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/70">
            {ALGORITHM_REGISTRY.map((algo) => (
                <button
                    key={algo.id}
                    type="button"
                    onClick={() => onChange(algo.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        value === algo.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "bg-background hover:bg-muted/60 text-foreground"
                    }`}
                >
                    {algo.title}
                </button>
            ))}
        </div>
    );
}

export default function ConfigurePanel() {
    const {
        imageSrc,
        imageName,
        imageSampleId,
        galleryImages,
        replaceAlgorithmFeatures,
        setSelectedFeatureId,
        setPanelMode,
        setLastAlgorithmResult,
        addRunToHistory,
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

    const handleSelectAlgorithm = (id: string) => {
        setSelectedAlgorithmId(id);
        runner.clearError();
    };

    const handleRun = async () => {
        const output = await runner.runAlgorithm({
            algorithm,
            config,
            imageSrc,
            imageName,
            storageMode: "auto",
        });

        if (!output) return;

        const mappedFeatures = algorithm.toFeatures(output.result, output.runId);
        replaceAlgorithmFeatures(algorithm.id, mappedFeatures);
        if (mappedFeatures.length > 0) {
            setSelectedFeatureId(mappedFeatures[0].id);
        }

        const summaryEntries = algorithm.summary(output.result);
        setLastAlgorithmResult(algorithm.id, output.result);
        addRunToHistory({
            runId: output.runId,
            algorithmId: algorithm.id,
            algorithmTitle: algorithm.title,
            summary: summaryEntries,
            featureCount: mappedFeatures.length,
            timestamp: Date.now(),
        });
        setPanelMode("results");
    };

    const hasHint = activeGalleryImage !== null && imageSrc !== null &&
        (activeGalleryImage.description || (activeGalleryImage.recommendedAlgorithms?.length ?? 0) > 0);

    return (
        <>
            {/* Section 1: No-image hint OR sample context card */}
            {imageSrc === null ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-background/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Open an image from the gallery to get started.
                    </p>
                </div>
            ) : hasHint && (
                <HintCard
                    image={activeGalleryImage!}
                    onSelectAlgorithm={handleSelectAlgorithm}
                />
            )}

            {/* Section 2: Algorithm selector */}
            <RailSection label="Algorithm">
                <AlgorithmPicker value={selectedAlgorithmId} onChange={handleSelectAlgorithm} />
                <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
                    {algorithm.description}
                </p>
            </RailSection>

            {/* Section 3: Config */}
            <RailSection label="Configuration">
                <ConfigComponent
                    config={config}
                    onChange={(next) => setConfigEntries((current) => ({
                        ...current,
                        [algorithm.id]: { value: next, sampleId: imageSampleId },
                    }))}
                    disabled={runner.isRunning}
                />
            </RailSection>

            {/* Section 4: Run + status + summary */}
            <RailSection label="Run">
                <RunSection runner={runner} canRun={canRun} onRun={handleRun} />
            </RailSection>
        </>
    );
}

// --- Sub-components to keep ConfigurePanel render body under 40 lines ---

function HintCard({
    image,
    onSelectAlgorithm,
}: {
    image: { name: string; description?: string; recommendedAlgorithms?: string[] };
    onSelectAlgorithm: (id: string) => void;
}) {
    return (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground leading-tight">
                {image.name}
            </p>
            {image.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {image.description}
                </p>
            )}
            {(image.recommendedAlgorithms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="text-[10px] text-muted-foreground self-center">Try:</span>
                    {image.recommendedAlgorithms!.map((name) => {
                        const match = ALGORITHM_REGISTRY.find((a) => a.title === name);
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => match && onSelectAlgorithm(match.id)}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                            >
                                {name}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function RunSection({
    runner,
    canRun,
    onRun,
}: {
    runner: ReturnType<typeof useAlgorithmRunner>;
    canRun: boolean;
    onRun: () => void;
}) {
    return (
        <div className="space-y-2.5">
            <button
                type="button"
                onClick={onRun}
                disabled={!canRun}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-primary/90 transition-colors shadow-sm"
            >
                {runner.isRunning
                    ? <LoaderCircle size={14} className="animate-spin" />
                    : <Sparkles size={14} />
                }
                {runner.isRunning ? "Running…" : "Run Algorithm"}
            </button>

            {runner.isRunning && (
                <p className="text-[11px] text-center text-muted-foreground">
                    {stageLabel(runner.stage)}
                </p>
            )}

            {runner.error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive leading-relaxed">{runner.error}</p>
                </div>
            )}

            {runner.summary.length > 0 && (
                <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                        Last Run
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {runner.summary.map((entry) => (
                            <div key={entry.label} className="rounded-md border border-border bg-background/70 px-2.5 py-2">
                                <div className="text-sm font-semibold text-foreground leading-tight">{entry.value}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{entry.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
