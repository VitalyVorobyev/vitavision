import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, Callout, Empty, Field, Panel, Select, Slider, Switch, type CalloutTone } from "@vitavision/ui";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { getLoadedAlgorithm } from "../algorithms/registry";
import type { AlgorithmSummaryEntry, DiagnosticEntry } from "../algorithms/types";
import { choiceProps, type ChoiceOption } from "../../../lib/fieldBindings";

function SummaryStrip({ entries }: { entries: AlgorithmSummaryEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="rounded-control border border-line bg-raised px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                {entries.map((entry) => (
                    <div key={entry.label} className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-fg-muted">{entry.label}</span>
                        <span className="text-sm font-semibold text-fg tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const DIAGNOSTIC_TONE: Record<DiagnosticEntry["level"], CalloutTone> = {
    info: "info",
    warning: "warning",
    error: "error",
};

function DiagnosticsList({ entries }: { entries: DiagnosticEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="space-y-1.5">
            {entries.map((entry) => (
                <Callout
                    key={`${entry.level}-${entry.message}`}
                    tone={DIAGNOSTIC_TONE[entry.level]}
                    title={entry.detail ? entry.message : undefined}
                    className="text-xs"
                >
                    {entry.detail ?? entry.message}
                </Callout>
            ))}
        </div>
    );
}

type HeatmapColormap = "magma" | "jet" | "hot";

const COLORMAP_OPTIONS: ChoiceOption<HeatmapColormap>[] = [
    { value: "magma", label: "Magma" },
    { value: "jet", label: "Jet" },
    { value: "hot", label: "Hot" },
];

export default function ResultsPanel() {
    const {
        lastAlgorithmResult, setPanelMode,
        heatmapData, heatmapVisible, setHeatmapVisible, heatmapOpacity, setHeatmapOpacity,
        heatmapColormap, setHeatmapColormap,
    } = useEditorStore(useShallow((s) => ({
        lastAlgorithmResult: s.lastAlgorithmResult,
        setPanelMode: s.setPanelMode,
        heatmapData: s.heatmapData,
        heatmapVisible: s.heatmapVisible,
        setHeatmapVisible: s.setHeatmapVisible,
        heatmapOpacity: s.heatmapOpacity,
        setHeatmapOpacity: s.setHeatmapOpacity,
        heatmapColormap: s.heatmapColormap,
        setHeatmapColormap: s.setHeatmapColormap,
    })));

    const algo = useMemo(() => {
        if (!lastAlgorithmResult) return null;
        return getLoadedAlgorithm(lastAlgorithmResult.algorithmId);
    }, [lastAlgorithmResult]);

    const summaryEntries = useMemo((): AlgorithmSummaryEntry[] => {
        if (!lastAlgorithmResult || !algo) return [];
        return algo.summary(lastAlgorithmResult.result);
    }, [lastAlgorithmResult, algo]);

    const diagnosticEntries = useMemo((): DiagnosticEntry[] => {
        if (!lastAlgorithmResult || !algo?.diagnostics) return [];
        return algo.diagnostics(lastAlgorithmResult.result);
    }, [lastAlgorithmResult, algo]);

    return (
        <>
            {/* Back to Configure */}
            <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setPanelMode("configure")}
                icon={<ArrowLeft />}
            >
                Configure
            </Button>

            {/* Diagnostics */}
            {diagnosticEntries.length > 0 && (
                <DiagnosticsList entries={diagnosticEntries} />
            )}

            {/* Run Summary */}
            {lastAlgorithmResult && (
                <Panel title={algo?.title ? `${algo.title} Results` : "Results"}>
                    <SummaryStrip entries={summaryEntries} />
                </Panel>
            )}

            {/* Heatmap overlay controls (radsym only) */}
            {lastAlgorithmResult?.algorithmId === "radsym" && heatmapData && (
                <Panel title="FRST Heatmap" bodyClassName="flex flex-col gap-2.5">
                    <Switch
                        label="Show heatmap"
                        checked={heatmapVisible}
                        onCheckedChange={setHeatmapVisible}
                    />
                    {heatmapVisible && (
                        <>
                            <Field label="Opacity" as="group">
                                <Slider
                                    aria-label="Opacity"
                                    value={heatmapOpacity}
                                    onValueChange={setHeatmapOpacity}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    readout={<span className="inline-block w-8 text-right">{Math.round(heatmapOpacity * 100)}%</span>}
                                />
                            </Field>
                            <Field label="Colormap">
                                <Select {...choiceProps(heatmapColormap, COLORMAP_OPTIONS, setHeatmapColormap)} />
                            </Field>
                        </>
                    )}
                </Panel>
            )}

            {/* Empty state */}
            {!lastAlgorithmResult && (
                <Empty
                    className="py-8"
                    action={
                        <Button size="sm" onClick={() => setPanelMode("configure")}>
                            Go to Configure
                        </Button>
                    }
                >
                    No results yet. Run an algorithm to see them here.
                </Empty>
            )}
        </>
    );
}
