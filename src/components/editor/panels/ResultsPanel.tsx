import { useMemo } from "react";
import { AlertCircle, AlertTriangle, ArrowLeft, Info } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { getAlgorithmById } from "../algorithms/registry";
import type { AlgorithmSummaryEntry, DiagnosticEntry } from "../algorithms/types";

import RailSection from "./RailSection";

function SummaryGrid({ entries }: { entries: AlgorithmSummaryEntry[] }) {
    if (entries.length === 0) return null;
    return (
        <div className="grid grid-cols-2 gap-1.5">
            {entries.map((entry) => (
                <div key={entry.label} className="rounded-md border border-border bg-background/70 px-2.5 py-2">
                    <div className="text-sm font-semibold text-foreground leading-tight">{entry.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{entry.label}</div>
                </div>
            ))}
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
            {entries.map((entry, i) => {
                const style = diagnosticStyles[entry.level];
                const Icon = style.icon;
                return (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2`}>
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
    const { lastAlgorithmResult, setPanelMode } = useEditorStore(useShallow((s) => ({
        lastAlgorithmResult: s.lastAlgorithmResult,
        setPanelMode: s.setPanelMode,
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
                    <SummaryGrid entries={summaryEntries} />
                </RailSection>
            )}
        </>
    );
}
