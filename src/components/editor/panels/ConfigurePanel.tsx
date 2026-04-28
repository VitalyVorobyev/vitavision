import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { LoaderCircle, Sparkles, AlertCircle, Maximize2, ChevronDown, X } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import type { SampleId } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";

import { ALGORITHM_MANIFEST, loadAlgorithm } from "../algorithms/registry";
import type { AlgorithmDefinition } from "../algorithms/types";
import useAlgorithmRunner, { stageLabel } from "../algorithms/useAlgorithmRunner";
import { useDeepLinkSync } from "../../../hooks/useEditorDeepLink";

import RailSection from "./RailSection";
import ConfigModal from "./ConfigModal";

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
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
                {ALGORITHM_MANIFEST.map((algo) => (
                    <option key={algo.id} value={algo.id}>{algo.title}</option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
    );
}

export default function ConfigurePanel() {
    const {
        imageSrc,
        imageName,
        imageSampleId,
        galleryImages,
        selectedAlgorithmId,
        replaceAlgorithmFeatures,
        setSelectedFeatureId,
        setSelectedAlgorithmId,
        setPanelMode,
        setLastAlgorithmResult,
        addRunToHistory,
    } = useEditorStore(useShallow((s) => ({
        imageSrc: s.imageSrc,
        imageName: s.imageName,
        imageSampleId: s.imageSampleId,
        galleryImages: s.galleryImages,
        selectedAlgorithmId: s.selectedAlgorithmId,
        replaceAlgorithmFeatures: s.replaceAlgorithmFeatures,
        setSelectedFeatureId: s.setSelectedFeatureId,
        setSelectedAlgorithmId: s.setSelectedAlgorithmId,
        setPanelMode: s.setPanelMode,
        setLastAlgorithmResult: s.setLastAlgorithmResult,
        addRunToHistory: s.addRunToHistory,
    })));

    const { initialState, syncToUrl } = useDeepLinkSync();
    const configSampleId: SampleId = imageSrc === null && initialState.sampleId !== null
        ? initialState.sampleId
        : imageSampleId;

    // didSeedFromUrl: run once per mount (useRef instead of module-level variable
    // so it resets if the user navigates away and returns — URL may have changed).
    const didSeedFromUrl = useRef(false);
    useEffect(() => {
        if (!didSeedFromUrl.current) {
            didSeedFromUrl.current = true;
            if (initialState.algorithmId !== selectedAlgorithmId) {
                setSelectedAlgorithmId(initialState.algorithmId);
            }
        }
    // Empty deps: intentional — we only want this to run once on mount.
    // didSeedFromUrl is a ref (stable), and the initial* values from useDeepLinkSync
    // are derived from URL search params at construction time and do not change.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [configEntries, setConfigEntries] = useState<Record<string, ConfigEntry>>(() => {
        if (initialState.config !== null) {
            return { [initialState.algorithmId]: { value: initialState.config, sampleId: initialState.sampleId ?? imageSampleId } };
        }
        return {};
    });
    const [configModalOpen, setConfigModalOpen] = useState(false);

    // Loaded algorithm definition — null while the dynamic import is in flight.
    const [algorithm, setAlgorithm] = useState<AlgorithmDefinition | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadAlgorithm(selectedAlgorithmId).then((algo) => {
            if (!cancelled) setAlgorithm(algo);
        });
        return () => { cancelled = true; };
    }, [selectedAlgorithmId]);

    const runner = useAlgorithmRunner();

    const manifestEntry = useMemo(
        () => ALGORITHM_MANIFEST.find((e) => e.id === selectedAlgorithmId) ?? ALGORITHM_MANIFEST[0],
        [selectedAlgorithmId],
    );

    const ConfigComponent = algorithm?.ConfigComponent ?? null;
    const config = algorithm
        ? resolveConfig(configEntries, algorithm.id, configSampleId, algorithm.initialConfig, algorithm.sampleDefaults)
        : undefined;

    const handleConfigChange = useCallback((next: unknown) => {
        if (!algorithm) return;
        setConfigEntries((current) => ({
            ...current,
            [algorithm.id]: { value: next, sampleId: configSampleId },
        }));
        syncToUrl(algorithm.id, next);
    }, [algorithm, configSampleId, syncToUrl]);

    const activeGalleryImage = useMemo(
        () => galleryImages.find((img) => img.sampleId === imageSampleId && imageSrc !== null) ?? null,
        [galleryImages, imageSampleId, imageSrc],
    );

    const canRun = imageSrc !== null && !runner.isRunning && algorithm !== null;

    const handleSelectAlgorithm = (id: string) => {
        setSelectedAlgorithmId(id);
        runner.clearError();
        // Load the new algorithm and sync URL once it resolves.
        // We don't block the selection on the load — the picker updates immediately.
        loadAlgorithm(id).then((algo) => {
            syncToUrl(
                id,
                resolveConfig(configEntries, id, configSampleId, algo.initialConfig, algo.sampleDefaults),
            );
        });
    };

    const handleRun = async () => {
        if (!algorithm) return;
        const output = await runner.runAlgorithm({
            algorithm,
            config,
            imageSrc,
            imageName,
        });

        if (!output) return;

        try {
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
        } catch (err) {
            toast.error(`Failed to process algorithm results: ${err instanceof Error ? err.message : "unknown error"}`);
        }
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
                    {manifestEntry.description}
                    {manifestEntry.blogSlug && (
                        <>
                            {" "}
                            <Link
                                to={`/blog/${manifestEntry.blogSlug}`}
                                className="text-primary underline hover:text-primary/80"
                            >
                                Learn more
                            </Link>
                        </>
                    )}
                </p>
            </RailSection>

            {/* Section 3: Presets (if available) */}
            {algorithm?.presets && algorithm.presets.length > 0 && (
                <RailSection label="Presets">
                    <PresetPicker
                        presets={algorithm.presets}
                        onSelect={handleConfigChange}
                    />
                </RailSection>
            )}

            {/* Section 4: Config */}
            <RailSection
                label="Configuration"
                action={
                    <button
                        type="button"
                        onClick={() => setConfigModalOpen(true)}
                        className="text-muted-foreground/50 hover:text-foreground transition-colors"
                        title="Expand configuration"
                        disabled={algorithm === null}
                    >
                        <Maximize2 size={11} />
                    </button>
                }
            >
                {ConfigComponent && config !== undefined ? (
                    <ConfigComponent
                        config={config}
                        onChange={handleConfigChange}
                        disabled={runner.isRunning}
                    />
                ) : (
                    <p className="text-xs text-muted-foreground/60 animate-pulse">Loading…</p>
                )}
            </RailSection>

            {ConfigComponent && config !== undefined && (
                <ConfigModal
                    open={configModalOpen}
                    onClose={() => setConfigModalOpen(false)}
                    title={`${manifestEntry.title} Configuration`}
                    ConfigComponent={ConfigComponent}
                    config={config}
                    onChange={handleConfigChange}
                    disabled={runner.isRunning}
                />
            )}

            {/* Section 5: Run + status + summary */}
            <RailSection label="Run">
                <RunSection runner={runner} canRun={canRun} onRun={handleRun} />
            </RailSection>
        </>
    );
}

// --- Sub-components to keep ConfigurePanel render body under 40 lines ---

import type { AlgorithmPreset } from "../algorithms/types";

function PresetPicker({
    presets,
    onSelect,
}: {
    presets: AlgorithmPreset[];
    onSelect: (config: unknown) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
                <button
                    key={preset.label}
                    type="button"
                    onClick={() => onSelect(preset.config)}
                    title={preset.description}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
}

function HintCardInner({
    image,
    onSelectAlgorithm,
}: {
    image: { name: string; description?: string; recommendedAlgorithms?: string[] };
    onSelectAlgorithm: (id: string) => void;
}) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-foreground leading-tight">
                    {image.name}
                </p>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0 -mt-0.5 -mr-0.5 p-0.5"
                    title="Dismiss"
                >
                    <X size={14} />
                </button>
            </div>
            {image.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {image.description}
                </p>
            )}
            {(image.recommendedAlgorithms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="text-[10px] text-muted-foreground self-center">Try:</span>
                    {image.recommendedAlgorithms!.map((name) => {
                        const match = ALGORITHM_MANIFEST.find((a) => a.title === name);
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

/** Wrapper that resets dismissed state when the image changes via key prop. */
function HintCard(props: {
    image: { name: string; description?: string; recommendedAlgorithms?: string[] };
    onSelectAlgorithm: (id: string) => void;
}) {
    return <HintCardInner key={props.image.name} {...props} />;
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

            {!canRun && !runner.isRunning && (
                <p className="text-[10px] text-center text-muted-foreground/50">Load an image to run</p>
            )}

            {!runner.isRunning && canRun && (
                <p className="text-[10px] text-center text-muted-foreground/50">
                    Client-side (WASM)
                </p>
            )}

            {runner.error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive leading-relaxed">{runner.error}</p>
                </div>
            )}

            {runner.summary.length > 0 && (
                <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                        Last Run
                    </span>
                    <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                            {runner.summary.map((entry) => (
                                <div key={entry.label} className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] text-muted-foreground">{entry.label}</span>
                                    <span className="text-sm font-semibold text-foreground tabular-nums">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
