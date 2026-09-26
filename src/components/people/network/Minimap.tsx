// Minimap — "whole network" overview (desktop only), top-left overlay.
// Plots every node as a dot (faded when it's outside the current focus) plus
// a rectangle for the current viewport, derived from the live pan/zoom state.

import { useMemo } from "react";
import type { ScholarlyNetworkNode, ScholarlyGroup } from "../../../lib/atlas/scholarlyTypes.ts";
import { GROUP_COLOR } from "../../../lib/atlas/peopleNetwork.ts";
import type { ViewportBounds, ViewportState } from "../../../lib/graph/useViewport.ts";

const MW = 148;
const MH = 112;
const PAD = 6;

export interface MinimapProps {
    nodes: ScholarlyNetworkNode[];
    groupOf: (id: string) => ScholarlyGroup;
    bounds: ViewportBounds;
    view: ViewportState;
    vp: { w: number; h: number };
    dimId: (id: string) => boolean;
}

export function Minimap({ nodes, groupOf, bounds, view, vp, dimId }: MinimapProps) {
    const boundsW = bounds.maxX - bounds.minX || 1;
    const boundsH = bounds.maxY - bounds.minY || 1;
    const scale = Math.min((MW - PAD * 2) / boundsW, (MH - PAD * 2) / boundsH);

    const toMini = (x: number, y: number) => ({
        x: PAD + (x - bounds.minX) * scale,
        y: PAD + (y - bounds.minY) * scale,
    });

    const dots = useMemo(
        () =>
            nodes.map((n) => {
                const p = toMini(n.x, n.y);
                return { id: n.id, ...p, color: GROUP_COLOR[groupOf(n.id)] ?? GROUP_COLOR.other, dim: dimId(n.id) };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nodes, groupOf, dimId, bounds],
    );

    // Visible content box, inverted from the plane's translate/scale transform.
    const visMinX = -view.x / view.scale;
    const visMinY = -view.y / view.scale;
    const visW = vp.w / view.scale;
    const visH = vp.h / view.scale;
    const rectTL = toMini(visMinX, visMinY);
    const rectBR = toMini(visMinX + visW, visMinY + visH);

    return (
        <div className="absolute left-3 top-3 hidden md:flex flex-col gap-1 rounded-md border border-border bg-surface/95 backdrop-blur px-2 py-1.5 shadow-sm">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Whole network</span>
            <svg width={MW} height={MH} viewBox={`0 0 ${MW} ${MH}`} role="img" aria-label="Overview of the whole co-author network">
                {dots.map((d) => (
                    <circle key={d.id} cx={d.x} cy={d.y} r={1.2} fill={d.color} fillOpacity={d.dim ? 0.35 : 0.9} />
                ))}
                <rect
                    x={Math.max(PAD, rectTL.x)}
                    y={Math.max(PAD, rectTL.y)}
                    width={Math.max(2, Math.min(MW - PAD, rectBR.x) - Math.max(PAD, rectTL.x))}
                    height={Math.max(2, Math.min(MH - PAD, rectBR.y) - Math.max(PAD, rectTL.y))}
                    fill="none"
                    stroke="currentColor"
                    className="text-foreground"
                    strokeWidth={1.2}
                    rx={2}
                />
            </svg>
        </div>
    );
}
