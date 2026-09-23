// Legend — group colours + node/edge encoding note, bottom-left overlay.
// Collapsible on phones (a tap-to-expand disclosure) so it doesn't eat scarce
// canvas height; always open on desktop.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GROUPS } from "../../../lib/atlas/scholarlyGroups.ts";

export interface LegendProps {
    isPhone: boolean;
}

export function Legend({ isPhone }: LegendProps) {
    const [expanded, setExpanded] = useState(!isPhone);
    const open = !isPhone || expanded;

    return (
        <div className="absolute left-3 bottom-3 max-w-[calc(100%-5rem)] rounded-md border border-border bg-surface/95 backdrop-blur px-3 py-2 text-[11px] shadow-sm">
            {isPhone && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1 text-muted-foreground font-medium"
                    aria-expanded={expanded}
                >
                    Legend
                    {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
            )}
            {open && (
                <div className="flex flex-col gap-1 mt-1 first:mt-0">
                    {GROUPS.map((g) => (
                        <span key={g.group} className="flex items-center gap-1.5 text-foreground">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                            {g.label}
                        </span>
                    ))}
                    <span className="text-muted-foreground pt-0.5">Node size = Atlas pages · edge = shared papers</span>
                </div>
            )}
        </div>
    );
}
