// RelationLegend — bottom-center pill row listing the relation types active
// in the current layout. Extracted from GraphExplorer.tsx.

import { LANES_V3, RELATION_V3 } from "../../../lib/atlas/graphLayout.ts";

export interface RelationLegendProps {
    activeRels: Set<string>;
}

export function RelationLegend({ activeRels }: RelationLegendProps) {
    const active = LANES_V3.filter((rel) => activeRels.has(rel));
    if (active.length === 0) return null;
    return (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-3 py-1.5 rounded-2xl max-w-[680px] bg-surface/90 backdrop-blur border border-border shadow-sm">
            {active.map((rel) => {
                const m = RELATION_V3[rel];
                return (
                    <span key={rel} className="inline-flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-foreground">{m.label}</span>
                    </span>
                );
            })}
        </div>
    );
}
