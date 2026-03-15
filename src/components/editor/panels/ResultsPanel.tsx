import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { useEditorStore } from "../../../store/editor/useEditorStore";
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

export default function ResultsPanel() {
    const { lastAlgorithmResult, setPanelMode } = useEditorStore();

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
        </>
    );
}
