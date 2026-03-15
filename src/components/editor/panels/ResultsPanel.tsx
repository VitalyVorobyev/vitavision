import { useMemo } from "react";
import { ArrowLeft, Clock, Info } from "lucide-react";

import { useEditorStore, type RunHistoryEntry } from "../../../store/editor/useEditorStore";
import { getAlgorithmById } from "../algorithms/registry";
import type { AlgorithmSummaryEntry } from "../algorithms/types";

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

function DiagnosticsPlaceholder() {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-3">
            <Info size={13} className="text-muted-foreground/50 shrink-0" />
            <p className="text-xs text-muted-foreground">No diagnostics available.</p>
        </div>
    );
}

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function RunHistoryItem({ entry }: { entry: RunHistoryEntry }) {
    return (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border/70 bg-background text-xs">
            <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">{entry.algorithmTitle}</span>
                <span className="text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground shrink-0">
                    {entry.featureCount} feat
                </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0 flex items-center gap-1">
                <Clock size={9} />
                {formatTimeAgo(entry.timestamp)}
            </span>
        </div>
    );
}

function RunHistoryList({ entries }: { entries: RunHistoryEntry[] }) {
    if (entries.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border/60 py-4 text-center">
                <p className="text-xs text-muted-foreground">No runs yet</p>
            </div>
        );
    }
    return (
        <div className="space-y-1">
            {entries.map((entry) => (
                <RunHistoryItem key={entry.runId} entry={entry} />
            ))}
        </div>
    );
}

export default function ResultsPanel() {
    const { lastAlgorithmResult, runHistory, setPanelMode } = useEditorStore();

    const summaryEntries = useMemo((): AlgorithmSummaryEntry[] => {
        if (!lastAlgorithmResult) return [];
        const algo = getAlgorithmById(lastAlgorithmResult.algorithmId);
        return algo.summary(lastAlgorithmResult.result);
    }, [lastAlgorithmResult]);

    const algorithmTitle = useMemo(() => {
        if (!lastAlgorithmResult) return null;
        return getAlgorithmById(lastAlgorithmResult.algorithmId).title;
    }, [lastAlgorithmResult]);

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

            {/* Run Summary */}
            {lastAlgorithmResult && (
                <RailSection label={algorithmTitle ? `${algorithmTitle} Results` : "Results"}>
                    <SummaryGrid entries={summaryEntries} />
                </RailSection>
            )}

            {/* Diagnostics placeholder */}
            <RailSection label="Diagnostics">
                <DiagnosticsPlaceholder />
            </RailSection>

            {/* Run History */}
            <RailSection label="Run History">
                <RunHistoryList entries={runHistory} />
            </RailSection>
        </>
    );
}
