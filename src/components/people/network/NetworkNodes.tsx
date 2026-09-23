// NetworkNodes — node circles + their labels. Rendered as its own SVG layer
// (nodes are far cheaper to diff than the ~2.3k-edge layer, so this one can
// re-render on hover/focus without much cost). Circles carry the actual
// pointer handlers; the layer itself is `pointer-events: none` so clicks on
// empty canvas fall through to the pannable background (see NetworkCanvas).

import type { PlacedLabel } from "../../../lib/atlas/peopleNetwork.ts";

export interface RenderNode {
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
    isFocus: boolean;
}

export interface NetworkNodesProps {
    nodes: RenderNode[];
    labels: PlacedLabel[];
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
}

export function NetworkNodes({ nodes, labels, hoveredId, onHover, onSelect }: NetworkNodesProps) {
    return (
        <>
            {nodes.map((n) => (
                <circle
                    key={n.id}
                    cx={n.x}
                    cy={n.y}
                    r={n.isFocus ? n.radius + 1 : n.radius}
                    fill={n.color}
                    fillOpacity={n.opacity}
                    stroke={n.isFocus ? "currentColor" : "#ffffff"}
                    className={n.isFocus ? "text-foreground" : undefined}
                    strokeWidth={n.isFocus ? 2.5 : hoveredId === n.id ? 2 : 1}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    data-person-id={n.id}
                    onClick={() => onSelect(n.id)}
                    onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") onHover(n.id);
                    }}
                    onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") onHover(null);
                    }}
                >
                    <title>{n.name}</title>
                </circle>
            ))}
            {labels.map((l) => (
                <text
                    key={l.id}
                    x={l.x}
                    y={l.y}
                    fontSize={l.fontSize}
                    fontWeight={l.mandatory ? 600 : 500}
                    fill={l.mandatory ? "currentColor" : "#5b6b80"}
                    className={l.mandatory ? "text-foreground" : undefined}
                    paintOrder="stroke"
                    style={{ stroke: "hsl(var(--surface))" }}
                    strokeWidth={3.5}
                >
                    {l.text}
                </text>
            ))}
        </>
    );
}
