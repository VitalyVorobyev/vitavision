import type { NarrativeEdgeType } from "../../lib/content/schema.ts";
import {
    NARRATIVE_EDGE_DASH,
    NARRATIVE_EDGE_LABEL,
    areaColor,
    narrativeEdgeColor,
} from "../../lib/narratives/narrativeLayout.ts";

interface NarrativeLegendProps {
    /** Edge types actually present in the narrative — types with no edges are omitted. */
    edgeTypes: NarrativeEdgeType[];
    areas: { id: string; label: string }[];
    /** `overlay` floats over the canvas; `block` sits in normal flow (mobile). */
    variant?: "overlay" | "block";
}

export default function NarrativeLegend({ edgeTypes, areas, variant = "overlay" }: NarrativeLegendProps) {
    if (edgeTypes.length === 0 && areas.length === 0) return null;

    const areaIds = areas.map((a) => a.id);

    const body = (
        <>
            {edgeTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {edgeTypes.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5">
                            <svg width="18" height="6" aria-hidden="true" className="shrink-0">
                                <line
                                    x1="0" y1="3" x2="18" y2="3"
                                    stroke={narrativeEdgeColor(t)}
                                    strokeWidth="1.6"
                                    strokeDasharray={NARRATIVE_EDGE_DASH[t]}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="text-[10.5px] text-muted-foreground">{NARRATIVE_EDGE_LABEL[t]}</span>
                        </span>
                    ))}
                </div>
            )}
            {areas.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {areas.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1.5">
                            <span
                                aria-hidden="true"
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: areaColor(areaIds, a.id) }}
                            />
                            <span className="text-[10.5px] text-muted-foreground">{a.label}</span>
                        </span>
                    ))}
                </div>
            )}
        </>
    );

    if (variant === "block") {
        return <div className="flex flex-col gap-2">{body}</div>;
    }

    return (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-lg border border-border bg-surface/90 backdrop-blur px-2.5 py-2 shadow-sm max-w-[min(420px,60%)]">
            {body}
        </div>
    );
}
