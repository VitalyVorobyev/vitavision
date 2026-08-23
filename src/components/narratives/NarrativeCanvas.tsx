import { useEffect, useMemo, useRef, useState } from "react";
import type { NarrativeEdgeType, NarrativeNode, ResolvedNarrative } from "../../lib/content/schema.ts";
import { buildEdge } from "../../lib/graph/edgeGeometry.ts";
import { GRAPH_CANVAS_GRADIENT, GRAPH_PILL_BG } from "../../lib/graph/graphTheme.ts";
import { useViewport, type ViewportBounds } from "../../lib/graph/useViewport.ts";
import { ZoomControls } from "../atlas/graph/ZoomControls.tsx";
import {
    NARRATIVE_EDGE_DASH,
    NARRATIVE_NODE_H,
    NARRATIVE_NODE_W,
    NARRATIVE_TOP_PAD,
    areaColor,
    narrativeEdgeColor,
    narrativeYearRange,
    nodeBox,
    scaleLensCoords,
    yearRulerTicks,
} from "../../lib/narratives/narrativeLayout.ts";
import NarrativeLegend from "./NarrativeLegend.tsx";

/** How long the chips take to slide to a new lens's coordinates. */
const LENS_TRANSITION_MS = 380;

interface NarrativeCanvasProps {
    narrative: ResolvedNarrative;
    lensId: string;
    /** Node ids the active walkthrough step focuses; `null` when not stepping (nothing dims). */
    focusIds: string[] | null;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

// ── Node chip ───────────────────────────────────────────────────────────────

interface NodeChipProps {
    node: NarrativeNode;
    pos: { x: number; y: number };
    areaIds: string[];
    dimmed: boolean;
    selected: boolean;
    onSelect: (id: string | null) => void;
}

function NodeChip({ node, pos, areaIds, dimmed, selected, onSelect }: NodeChipProps) {
    const accent = areaColor(areaIds, node.area);
    const meta =
        node.kind === "paper"
            ? [node.authorsShort, String(node.year)].filter(Boolean).join(" · ")
            : [node.pageKind, node.year != null ? String(node.year) : ""].filter(Boolean).join(" · ");

    return (
        <button
            type="button"
            aria-pressed={selected}
            data-narrative-node={node.id}
            onClick={() => onSelect(selected ? null : node.id)}
            className={`absolute left-0 top-0 flex flex-col justify-center gap-0.5 overflow-hidden rounded-lg bg-surface px-2.5 py-1.5 text-left shadow-sm ${
                node.kind === "paper" ? "border border-dashed" : "border"
            } ${selected ? "border-border-strong ring-2 ring-brand/50" : "border-border hover:border-border-strong"}`}
            style={{
                width:       NARRATIVE_NODE_W,
                height:      NARRATIVE_NODE_H,
                transform:   `translate3d(${pos.x}px, ${pos.y + NARRATIVE_TOP_PAD}px, 0)`,
                transition:  `transform ${LENS_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease`,
                opacity:     dimmed ? 0.26 : 1,
                touchAction: "none",
            }}
        >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
            <span className="text-[12px] font-semibold leading-tight text-foreground line-clamp-2 -tracking-[0.1px]">
                {node.title}
            </span>
            <span className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground truncate">
                {node.kind === "paper" && (
                    <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground/80">paper</span>
                )}
                <span className="truncate">{meta}</span>
            </span>
        </button>
    );
}

// ── Year ruler (timeline lens only) ─────────────────────────────────────────

function YearRuler({ minYear, maxYear, width }: { minYear: number; maxYear: number; width: number }) {
    const ticks = yearRulerTicks(minYear, maxYear);
    if (ticks.length === 0) return null;

    const left  = NARRATIVE_NODE_W / 2;
    const right = width - NARRATIVE_NODE_W / 2;
    const span  = maxYear - minYear;
    const at    = (year: number) => (span > 0 ? left + ((year - minYear) / span) * (right - left) : left);
    const baseY = NARRATIVE_TOP_PAD - 9;

    return (
        <svg
            className="absolute left-0 top-0 pointer-events-none"
            width={width}
            height={NARRATIVE_TOP_PAD}
            aria-hidden="true"
        >
            <line
                x1={left} y1={baseY} x2={right} y2={baseY}
                stroke="hsl(var(--border))" strokeWidth="1"
            />
            {ticks.map((year) => (
                <g key={year} transform={`translate(${at(year)} 0)`}>
                    <line x1={0} y1={baseY - 4} x2={0} y2={baseY} stroke="hsl(var(--border))" strokeWidth="1" />
                    <text
                        x={0} y={baseY - 8}
                        textAnchor="middle"
                        style={{
                            font: "500 9.5px ui-monospace, Geist Mono, monospace",
                            fill: "hsl(var(--muted-foreground))",
                        }}
                    >
                        {year}
                    </text>
                </g>
            ))}
        </svg>
    );
}

// ── Canvas ──────────────────────────────────────────────────────────────────

export default function NarrativeCanvas({
    narrative,
    lensId,
    focusIds,
    selectedId,
    onSelect,
}: NarrativeCanvasProps) {
    const lens = useMemo(
        () => narrative.lenses.find((l) => l.id === lensId) ?? narrative.lenses[0],
        [narrative.lenses, lensId],
    );

    const layout = useMemo(() => scaleLensCoords(lens?.coords ?? {}), [lens]);

    const nodes = useMemo(
        () => narrative.nodes.filter((n) => layout.positions[n.id] !== undefined),
        [narrative.nodes, layout],
    );

    const areaIds = useMemo(() => narrative.areas.map((a) => a.id), [narrative.areas]);

    const contentW = layout.width;
    const contentH = layout.height + NARRATIVE_TOP_PAD;

    const bounds = useMemo<ViewportBounds>(
        () => ({ minX: 0, minY: 0, maxX: contentW, maxY: contentH }),
        [contentW, contentH],
    );

    const {
        viewportRef,
        planeRef,
        view,
        animate,
        vp,
        fitView,
        fitBounds,
        zoomAroundCenter,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
    } = useViewport({ bounds, refitKey: lens?.id ?? "", fitPadding: 48 });

    // Walkthrough camera: frame the active step's focused chips; on leaving the
    // walkthrough, glide back out to the whole constellation.
    const hadFocusRef = useRef(false);
    useEffect(() => {
        if (vp.w === 0 || vp.h === 0) return;
        if (focusIds !== null && focusIds.length > 0) {
            const boxes = focusIds
                .map((id) => layout.positions[id])
                .filter((p): p is { x: number; y: number } => p !== undefined)
                .map(nodeBox);
            if (boxes.length === 0) return;
            hadFocusRef.current = true;
            fitBounds(
                {
                    minX: Math.min(...boxes.map((b) => b.x)),
                    minY: Math.min(...boxes.map((b) => b.y)),
                    maxX: Math.max(...boxes.map((b) => b.x + b.w)),
                    maxY: Math.max(...boxes.map((b) => b.y + b.h)),
                },
                true,
                1,
            );
        } else if (hadFocusRef.current) {
            hadFocusRef.current = false;
            fitView(true);
        }
    }, [focusIds, layout, vp.w, vp.h, fitBounds, fitView]);

    // Chips slide to their new coordinates on a lens switch; the bezier edges
    // can't tween their `d`, so they fade out and back in around the move
    // instead of lagging visibly behind the chips.
    const [settledLens, setSettledLens] = useState<string | null>(null);
    const [settling, setSettling] = useState(true);
    if (settledLens !== lensId) {
        // Render-time state reset (same pattern as the atlas post pages).
        setSettledLens(lensId);
        setSettling(true);
    }
    useEffect(() => {
        if (!settling) return;
        const t = setTimeout(() => setSettling(false), LENS_TRANSITION_MS);
        return () => clearTimeout(t);
    }, [settling]);

    const edgeTypes = useMemo(() => {
        const seen = new Set<NarrativeEdgeType>();
        for (const e of narrative.edges) seen.add(e.type);
        return [...seen];
    }, [narrative.edges]);

    const yearRange = useMemo(() => narrativeYearRange(nodes), [nodes]);
    const showRuler = lens?.id === "timeline" && yearRange !== null && yearRange.max > yearRange.min;

    if (!lens || nodes.length === 0) {
        return (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
                This narrative has no layout to draw.
            </div>
        );
    }

    const isDimmed = (id: string) => focusIds !== null && !focusIds.includes(id);

    return (
        <div
            ref={viewportRef}
            className="relative h-full w-full overflow-hidden rounded-xl border border-border"
            style={{ background: GRAPH_CANVAS_GRADIENT, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
        >
            <div
                ref={planeRef}
                className="absolute left-0 top-0"
                style={{
                    width:           contentW,
                    height:          contentH,
                    transform:       `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    transformOrigin: "0 0",
                    transition:      animate ? "transform 280ms ease" : "none",
                }}
            >
                {showRuler && (
                    <YearRuler minYear={yearRange.min} maxYear={yearRange.max} width={contentW} />
                )}

                {/* Edge layer */}
                <svg
                    className="absolute left-0 top-0 pointer-events-none"
                    width={contentW}
                    height={contentH}
                    style={{ opacity: settling ? 0 : 1, transition: "opacity 200ms ease" }}
                >
                    <defs>
                        {edgeTypes.map((t) => (
                            <marker
                                key={`mk-${t}`}
                                id={`narr-arr-${t}`}
                                viewBox="0 0 10 10"
                                refX="8.5"
                                refY="5"
                                markerWidth="5"
                                markerHeight="5"
                                orient="auto-start-reverse"
                            >
                                <path d="M0,1 L9,5 L0,9 Z" fill={narrativeEdgeColor(t)} />
                            </marker>
                        ))}
                    </defs>

                    {narrative.edges.map((edge, i) => {
                        const from = layout.positions[edge.from];
                        const to   = layout.positions[edge.to];
                        if (!from || !to) return null;
                        const geom = buildEdge(nodeBox(from), nodeBox(to));
                        const dim  = isDimmed(edge.from) || isDimmed(edge.to);
                        return (
                            <path
                                key={`e-${i}`}
                                d={geom.path}
                                fill="none"
                                stroke={narrativeEdgeColor(edge.type)}
                                strokeWidth="1.3"
                                strokeDasharray={NARRATIVE_EDGE_DASH[edge.type]}
                                opacity={dim ? 0.14 : 0.65}
                                markerEnd={`url(#narr-arr-${edge.type})`}
                            />
                        );
                    })}

                    {/* Edge label pills — after the lines so they sit on top */}
                    {narrative.edges.map((edge, i) => {
                        if (!edge.label) return null;
                        const from = layout.positions[edge.from];
                        const to   = layout.positions[edge.to];
                        if (!from || !to) return null;
                        const geom  = buildEdge(nodeBox(from), nodeBox(to));
                        const color = narrativeEdgeColor(edge.type);
                        const dim   = isDimmed(edge.from) || isDimmed(edge.to);
                        const w     = edge.label.length * 5.6 + 10;
                        return (
                            <g
                                key={`lbl-${i}`}
                                transform={`translate(${geom.labelX} ${geom.labelY})`}
                                opacity={dim ? 0.15 : 0.95}
                            >
                                <rect
                                    x={-w / 2} y={-7} width={w} height={14} rx={3}
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
                                    {edge.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {nodes.map((node) => (
                    <NodeChip
                        key={node.id}
                        node={node}
                        pos={layout.positions[node.id]}
                        areaIds={areaIds}
                        dimmed={isDimmed(node.id)}
                        selected={selectedId === node.id}
                        onSelect={onSelect}
                    />
                ))}
            </div>

            {/* Viewport overlays — not scaled or translated */}
            <NarrativeLegend edgeTypes={edgeTypes} areas={narrative.areas} />
            <ZoomControls
                onZoomIn={() => zoomAroundCenter(1.25)}
                onZoomOut={() => zoomAroundCenter(1 / 1.25)}
                onFit={() => fitView(true)}
            />
        </div>
    );
}
