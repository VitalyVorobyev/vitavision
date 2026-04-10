import { useMemo } from "react";
import { AlertCircle, AlertTriangle, ArrowLeft, Info } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { getAlgorithmById } from "../algorithms/registry";
import type { AlgorithmSummaryEntry, DiagnosticEntry } from "../algorithms/types";

import RailSection from "./RailSection";

function SummaryStrip({ entries }: { entries: AlgorithmSummaryEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                {entries.map((entry) => (
                    <div key={entry.label} className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-muted-foreground">{entry.label}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const diagnosticStyles: Record<DiagnosticEntry["level"], { icon: typeof Info; border: string; bg: string; text: string }> = {
    info: { icon: Info, border: "border-blue-400/30", bg: "bg-blue-500/5", text: "text-blue-600 dark:text-blue-400" },
    warning: { icon: AlertTriangle, border: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-600 dark:text-yellow-400" },
    error: { icon: AlertCircle, border: "border-destructive/30", bg: "bg-destructive/5", text: "text-destructive" },
};

function DiagnosticsList({ entries }: { entries: DiagnosticEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="space-y-1.5">
            {entries.map((entry) => {
                const style = diagnosticStyles[entry.level];
                const Icon = style.icon;
                return (
                    <div key={`${entry.level}-${entry.message}`} className={`flex items-start gap-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2`}>
                        <Icon size={13} className={`${style.text} shrink-0 mt-0.5`} />
                        <div>
                            <p className={`text-xs font-medium ${style.text}`}>{entry.message}</p>
                            {entry.detail && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{entry.detail}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

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
        return getAlgorithmById(lastAlgorithmResult.algorithmId);
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
            <button
                type="button"
                onClick={() => setPanelMode("configure")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={13} />
                Configure
            </button>

            {/* Diagnostics */}
            {diagnosticEntries.length > 0 && (
                <DiagnosticsList entries={diagnosticEntries} />
            )}

            {/* Run Summary */}
            {lastAlgorithmResult && (
                <RailSection label={algo?.title ? `${algo.title} Results` : "Results"}>
                    <SummaryStrip entries={summaryEntries} />
                </RailSection>
            )}

            {/* Heatmap overlay controls (radsym only) */}
            {lastAlgorithmResult?.algorithmId === "radsym" && heatmapData && (
                <RailSection label="FRST Heatmap">
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setHeatmapVisible(!heatmapVisible)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                heatmapVisible
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted/30"
                            }`}
                        >
                            {heatmapVisible ? "Hide heatmap" : "Show heatmap"}
                        </button>
                        {heatmapVisible && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Opacity</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={heatmapOpacity}
                                        onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                                        className="flex-1 h-1 accent-primary"
                                    />
                                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                                        {Math.round(heatmapOpacity * 100)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Colormap</span>
                                    <select
                                        value={heatmapColormap}
                                        onChange={(e) => setHeatmapColormap(e.target.value as "magma" | "jet" | "hot")}
                                        className="flex-1 appearance-none rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    >
                                        <option value="magma">Magma</option>
                                        <option value="jet">Jet</option>
                                        <option value="hot">Hot</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </RailSection>
            )}

            {/* Empty state */}
            {!lastAlgorithmResult && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-sm text-muted-foreground/60">No results yet</p>
                    <p className="text-xs text-muted-foreground/40">Run an algorithm to see results here.</p>
                    <button
                        type="button"
                        onClick={() => setPanelMode("configure")}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                        Go to Configure
                    </button>
                </div>
            )}
        </>
    );
}
