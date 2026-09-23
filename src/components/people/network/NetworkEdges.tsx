// NetworkEdges — the full co-author edge set (up to ~2.3k lines), memoized
// independently of hover so a hover-only re-render never rebuilds it. Focus
// changes DO require a rebuild (edge styling depends on which endpoints are
// hot/faded), but that only happens on an explicit focus action, not per
// pointer-move.

import { useMemo } from "react";
import type { NetworkPoint } from "./networkTypes.ts";

export interface NetworkEdgesProps {
    edges: [string, string, number][];
    positions: Map<string, NetworkPoint>;
    focusId: string | undefined;
    ringIds: Set<string>;
}

export function NetworkEdges({ edges, positions, focusId, ringIds }: NetworkEdgesProps) {
    const lines = useMemo(() => {
        return edges.map(([a, b, shared]) => {
            const pa = positions.get(a);
            const pb = positions.get(b);
            if (!pa || !pb) return null;
            const hot = focusId !== undefined && (a === focusId || b === focusId);
            const touchesRing = ringIds.has(a) || ringIds.has(b);
            const opacity = hot ? 0.75 : focusId !== undefined ? (touchesRing ? 0.12 : 0.3) : 0.35;
            const width = hot ? 1 + shared * 0.5 : 0.7;
            return (
                <line
                    key={`${a}-${b}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={hot ? "currentColor" : "#94a3b8"}
                    className={hot ? "text-foreground" : undefined}
                    strokeOpacity={opacity}
                    strokeWidth={width}
                />
            );
        });
    }, [edges, focusId, ringIds, positions]);

    return <>{lines}</>;
}
