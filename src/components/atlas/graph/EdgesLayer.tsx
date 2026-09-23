// EdgesLayer — SVG overlay drawing every neighbor edge (line + label pill)
// against the center card. Extracted from GraphExplorer.tsx.

import { buildEdge } from "../../../lib/graph/edgeGeometry.ts";
import { GG, RELATION_V3, type Layout, type PositionedNode } from "../../../lib/atlas/graphLayout.ts";
import { EdgeMarkers } from "./EdgeMarkers.tsx";
import { EdgeLabelPill } from "./EdgeLabelPill.tsx";

export interface EdgesLayerProps {
    positions: PositionedNode[];
    layout:    Layout;
    hoverSlug: string | null;
}

export function EdgesLayer({ positions, layout, hoverSlug }: EdgesLayerProps) {
    const centerBox = { x: layout.cx - GG.centerW / 2, y: layout.cy - GG.centerH / 2, w: GG.centerW, h: GG.centerH };

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.canvasW}
            height={layout.canvasH}
            viewBox={`0 0 ${layout.canvasW} ${layout.canvasH}`}
        >
            <EdgeMarkers
                idPrefix="arr-"
                markers={Object.entries(RELATION_V3).map(([k, m]) => ({ key: k, color: m.color }))}
            />

            {/* Edge lines */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, { x: pos.x, y: pos.y, w: GG.nodeW, h: GG.nodeH });
                const meta = RELATION_V3[pos.rel];
                if (!meta) return null;
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug !== null && hoverSlug !== pos.slug;
                const opacity = isHover ? 1 : isDim ? 0.18 : 0.55;
                return (
                    <path
                        key={`e-${pos.slug}-${pos.rel}`}
                        d={edge.path}
                        fill="none"
                        stroke={meta.color}
                        strokeWidth={isHover ? 1.8 : 1.1}
                        strokeDasharray={meta.dashed ? "4 4" : undefined}
                        opacity={opacity}
                        markerEnd={meta.arrow === "out" ? `url(#arr-${pos.rel})` : undefined}
                        markerStart={meta.arrow === "in"  ? `url(#arr-${pos.rel})` : undefined}
                    />
                );
            })}

            {/* Edge label pills — drawn after lines so they sit on top */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, { x: pos.x, y: pos.y, w: GG.nodeW, h: GG.nodeH });
                const meta = RELATION_V3[pos.rel];
                if (!meta) return null;
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug !== null && hoverSlug !== pos.slug;
                const opacity = isHover ? 1 : isDim ? 0 : 0.95;
                const w = meta.short.length * 5.6 + 8;
                return (
                    <EdgeLabelPill
                        key={`lbl-${pos.slug}-${pos.rel}`}
                        label={meta.short}
                        width={w}
                        transform={`translate(${edge.labelX} ${edge.labelY})`}
                        opacity={opacity}
                        color={meta.color}
                    />
                );
            })}
        </svg>
    );
}
