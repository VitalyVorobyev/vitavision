import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Sparkles, Maximize2, X } from "lucide-react";
import { Button, Callout, Dialog, DialogClose, Panel, Select, SkeletonRows } from "@vitavision/ui";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import type { SampleId } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";

import { ALGORITHM_MANIFEST, loadAlgorithm, getLoadedAlgorithm } from "../algorithms/registry";
import useAlgorithmRunner, { stageLabel } from "../algorithms/useAlgorithmRunner";
import { useDeepLinkSync } from "../../../hooks/useEditorDeepLink";


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

/**
 * Focuses the element once, when it mounts. Module-level so the ref is stable: an inline
 * callback would be called again on every render and pull focus out of the fields.
 */
const focusOnMount = (node: HTMLElement | null) => node?.focus();

const ALGORITHM_OPTIONS = ALGORITHM_MANIFEST.map((algo) => ({ value: algo.id, label: algo.title }));

function AlgorithmPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
    return (
        <Select
            aria-label="Algorithm"
            value={value}
            options={ALGORITHM_OPTIONS}
            onValueChange={onChange}
        />
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
    const didSeedFromUrlRef = useRef(false);
    useEffect(() => {
        if (!didSeedFromUrlRef.current) {
            didSeedFromUrlRef.current = true;
            if (initialState.algorithmId !== selectedAlgorithmId) {
                setSelectedAlgorithmId(initialState.algorithmId);
            }
        }
    // Empty deps: intentional — we only want this to run once on mount.
    // didSeedFromUrlRef is a ref (stable), and the initial* values from useDeepLinkSync
    // are derived from URL search params at construction time and do not change.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [configEntries, setConfigEntries] = useState<Record<string, ConfigEntry>>(() => {
        if (initialState.config !== null) {
            return { [initialState.algorithmId]: { value: initialState.config, sampleId: initialState.sampleId ?? imageSampleId } };
        }
        return {};
    });
    const [configModalOpen, setConfigModalOpen] = useState(false);

    // Algorithm definition is derived from the registry cache + the current
    // selection. Always in sync with selectedAlgorithmId — never stale, so
    // handleRun and handleConfigChange can't act on the wrong algorithm.
    // Returns null while the chunk for the current selection is still loading.
    const algorithm = getLoadedAlgorithm(selectedAlgorithmId);

    // Trigger counter so the component re-renders when a deferred load resolves
    // and getLoadedAlgorithm starts returning the freshly-cached entry.
    const [, bumpLoadTick] = useReducer((tick: number) => tick + 1, 0);

    useEffect(() => {
        let cancelled = false;
        void loadAlgorithm(selectedAlgorithmId).then(() => {
            if (!cancelled) bumpLoadTick();
        });
        return () => { cancelled = true; };
    }, [selectedAlgorithmId]);

    const runner = useAlgorithmRunner();

    const manifestEntry = useMemo(
        // ALGORITHM_MANIFEST is a non-empty static list, so index 0 always exists.
        () => ALGORITHM_MANIFEST.find((e) => e.id === selectedAlgorithmId) ?? ALGORITHM_MANIFEST[0]!,
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
        void loadAlgorithm(id).then((algo) => {
            // If the user has since picked a different algorithm, don't let
            // this stale resolution overwrite the URL with the older selection.
            // Reading from the store at resolution time avoids the closure
            // capturing a stale `selectedAlgorithmId`.
            if (id !== useEditorStore.getState().selectedAlgorithmId) return;
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
            const firstFeature = mappedFeatures[0];
            if (firstFeature) {
                setSelectedFeatureId(firstFeature.id);
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
                <div className="rounded-panel border border-dashed border-line p-4 text-center">
                    <p className="text-xs text-fg-muted leading-relaxed">
                        Open an image from the gallery to get started.
                    </p>
                </div>
            ) : hasHint && (
                <HintCard
                    image={activeGalleryImage}
                    onSelectAlgorithm={handleSelectAlgorithm}
                />
            )}

            {/* Section 2: Algorithm selector */}
            <Panel title="Algorithm" bodyClassName="space-y-2">
                <AlgorithmPicker value={selectedAlgorithmId} onChange={handleSelectAlgorithm} />
                <p className="text-xs text-fg-muted leading-relaxed">
                    {manifestEntry.description}
                    {manifestEntry.blogSlug && (
                        <>
                            {" "}
                            <Link
                                to={`/blog/${manifestEntry.blogSlug}`}
                                className="text-signal underline hover:text-signal-strong"
                            >
                                Learn more
                            </Link>
                        </>
                    )}
                </p>
            </Panel>

            {/* Section 3: Presets (if available) */}
            {algorithm?.presets && algorithm.presets.length > 0 && (
                <Panel title="Presets">
                    <PresetPicker
                        presets={algorithm.presets}
                        onSelect={handleConfigChange}
                    />
                </Panel>
            )}

            {/* Section 4: Config */}
            <Panel
                title="Configuration"
                bodyClassName="flex flex-col gap-3"
                actions={
                    <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 px-0"
                        onClick={() => setConfigModalOpen(true)}
                        aria-label="Expand configuration"
                        disabled={algorithm === null}
                        icon={<Maximize2 />}
                    />
                }
            >
                {ConfigComponent && config !== undefined ? (
                    <ConfigComponent
                        config={config}
                        onChange={handleConfigChange}
                        disabled={runner.isRunning}
                    />
                ) : (
                    <SkeletonRows rows={4} />
                )}
            </Panel>

            {/* The same form with room for two columns: it edits the same config, so every
                change applies at once and closing is the only action. */}
            {ConfigComponent && config !== undefined && (
                <Dialog
                    open={configModalOpen}
                    onOpenChange={setConfigModalOpen}
                    title={`${manifestEntry.title} Configuration`}
                    description="Changes apply as you make them."
                    className="w-[min(42rem,calc(100vw-2rem))]"
                    footer={
                        <DialogClose asChild>
                            <Button variant="primary">Done</Button>
                        </DialogClose>
                    }
                >
                    {/* Focus lands on the form itself, not on its first field's help mark: a
                        tooltip opening with the dialog would cover the description, and the
                        first Escape would close the tooltip instead of the dialog. */}
                    <div
                        ref={focusOnMount}
                        tabIndex={-1}
                        className="mt-4 flex flex-col gap-3 pr-1 outline-none"
                    >
                        <ConfigComponent
                            config={config}
                            onChange={handleConfigChange}
                            disabled={runner.isRunning}
                            modal
                        />
                    </div>
                </Dialog>
            )}

            {/* Section 5: Run + status + summary */}
            <Panel title="Run">
                <RunSection runner={runner} canRun={canRun} onRun={() => void handleRun()} />
            </Panel>
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
                <Button
                    key={preset.label}
                    size="sm"
                    onClick={() => onSelect(preset.config)}
                    title={preset.description}
                >
                    {preset.label}
                </Button>
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
        <div className="rounded-panel border border-line bg-surface p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-fg leading-tight">
                    {image.name}
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="-mt-1 -mr-1 size-6 px-0"
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss"
                    icon={<X />}
                />
            </div>
            {image.description && (
                <p className="text-xs text-fg-muted leading-relaxed">
                    {image.description}
                </p>
            )}
            {(image.recommendedAlgorithms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="text-[10px] text-fg-muted self-center">Try:</span>
                    {image.recommendedAlgorithms!.map((name) => {
                        const match = ALGORITHM_MANIFEST.find((a) => a.title === name);
                        return (
                            <Button
                                key={name}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-signal hover:text-signal-strong"
                                onClick={() => match && onSelectAlgorithm(match.id)}
                                disabled={!match}
                            >
                                {name}
                            </Button>
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
            <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={onRun}
                disabled={!canRun}
                loading={runner.isRunning}
                icon={<Sparkles />}
            >
                {runner.isRunning ? "Running…" : "Run Algorithm"}
            </Button>

            {runner.isRunning && (
                <p className="text-[11px] text-center text-fg-muted">
                    {stageLabel(runner.stage)}
                </p>
            )}

            {!canRun && !runner.isRunning && (
                <p className="text-[10px] text-center text-fg-muted">Load an image to run</p>
            )}

            {!runner.isRunning && canRun && (
                <p className="text-[10px] text-center text-fg-muted">
                    Client-side (WASM)
                </p>
            )}

            {runner.error && (
                <Callout tone="error" className="text-xs">{runner.error}</Callout>
            )}

            {runner.summary.length > 0 && (
                <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                        Last Run
                    </span>
                    <div className="rounded-panel border border-line bg-raised px-3 py-2">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                            {runner.summary.map((entry) => (
                                <div key={entry.label} className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] text-fg-muted">{entry.label}</span>
                                    <span className="text-sm font-semibold text-fg tabular-nums">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
