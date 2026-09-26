// EdgeLabelPill — small rounded-rect + monospace label sitting on an edge,
// drawn after the edge lines so it sits on top. Shared by GraphExplorer's
// EdgesLayer and NarrativeCanvas; callers compute `width` themselves since
// the two use slightly different padding formulas.

import type { CSSProperties } from "react";
import { GRAPH_PILL_BG } from "../../../lib/graph/graphTheme.ts";

export interface EdgeLabelPillProps {
    label:     string;
    width:     number;
    transform: string;
    opacity:   number;
    color:     string;
    style?:    CSSProperties;
}

export function EdgeLabelPill({ label, width, transform, opacity, color, style }: EdgeLabelPillProps) {
    return (
        <g transform={transform} opacity={opacity} style={style}>
            <rect
                x={-width / 2} y={-7} width={width} height={14} rx={3}
                fill={GRAPH_PILL_BG}
                stroke={color}
                strokeOpacity="0.7"
                strokeWidth="0.8"
            />
            <text
                x={0} y={3}
                textAnchor="middle"
                style={{
                    font: "500 9.5px ui-monospace, Geist Mono, monospace",
                    letterSpacing: "0.04em",
                    fill: color,
                }}
            >
                {label}
            </text>
        </g>
    );
}
