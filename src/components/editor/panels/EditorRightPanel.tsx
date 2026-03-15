import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles, AlertCircle } from "lucide-react";

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

function RailSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 shrink-0">
                    {label}
                </span>
                <div className="h-px flex-1 bg-border/50" />
            </div>
            {children}
        </div>
    );
}

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
    };

    const hasHint = activeGalleryImage !== null && imageSrc !== null &&
        (activeGalleryImage.description || (activeGalleryImage.recommendedAlgorithms?.length ?? 0) > 0);

    return (
        <div className="w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">

                {/* Section 1: No-image hint OR sample context card */}
                {imageSrc === null ? (
                    <div className="rounded-lg border border-dashed border-border/80 bg-background/40 p-4 text-center">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Open an image from the gallery to get started.
                        </p>
                    </div>
                ) : hasHint && (
                    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                            {activeGalleryImage!.name}
                        </p>
                        {activeGalleryImage!.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {activeGalleryImage!.description}
                            </p>
                        )}
                        {(activeGalleryImage!.recommendedAlgorithms?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                                <span className="text-[10px] text-muted-foreground self-center">Try:</span>
                                {activeGalleryImage!.recommendedAlgorithms!.map((name) => {
                                    const match = ALGORITHM_REGISTRY.find((a) => a.title === name);
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => match && handleSelectAlgorithm(match.id)}
                                            className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
                    <div className="space-y-2.5">
                        <button
                            type="button"
                            onClick={handleRun}
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
                </RailSection>

                {/* Section 5: Features */}
                <RailSection label="Features">
                    <FeatureListPanel />
                </RailSection>

            </div>
        </div>
    );
}
