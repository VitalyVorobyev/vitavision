// HoverHighlight — thin overlay drawing just the hovered node's direct edges
// (mouse only). Kept as its own tiny SVG layer, separate from the full
// ~2.3k-edge NetworkEdges layer, so hovering never triggers a rebuild of the
// whole edge set — only this handful of lines re-renders per pointer-move.

import { useMemo } from "react";
import type { NetworkPoint } from "./networkTypes.ts";

export interface HoverHighlightProps {
    hoveredId: string | null;
    adjacency: Map<string, { peer: string; shared: number }[]>;
    positions: Map<string, NetworkPoint>;
}

export function HoverHighlight({ hoveredId, adjacency, positions }: HoverHighlightProps) {
    const lines = useMemo(() => {
        if (!hoveredId) return [];
        const p0 = positions.get(hoveredId);
        if (!p0) return [];
        const neighbors = adjacency.get(hoveredId) ?? [];
        return neighbors.flatMap(({ peer, shared }) => {
            const p1 = positions.get(peer);
            if (!p1) return [];
            return [
                <line
                    key={peer}
                    x1={p0.x}
                    y1={p0.y}
                    x2={p1.x}
                    y2={p1.y}
                    stroke="currentColor"
                    className="text-foreground"
                    strokeOpacity={0.85}
                    strokeWidth={1 + shared * 0.4}
                />,
            ];
        });
    }, [hoveredId, adjacency, positions]);

    if (lines.length === 0) return null;
    return <>{lines}</>;
}
