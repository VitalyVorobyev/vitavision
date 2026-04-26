import { useRef, useCallback, type PointerEvent, type KeyboardEvent, type ReactElement } from "react";
import { triangleArea } from "./geometry";
import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";

const W = 800;
const H = 600;

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return { x: inv.a * clientX + inv.c * clientY + inv.e, y: inv.b * clientX + inv.d * clientY + inv.f };
}

interface Props {
    demo: DelaunayVoronoiState;
}

export default function DelaunayVoronoiCanvas({ demo }: Props) {
    const { state, allPoints, delaunay, voronoi, triangles } = demo;
    const { layers, selectedId, hover } = state;
    const svgRef = useRef<SVGSVGElement>(null);
    const dragging = useRef<{ id: string } | null>(null);

    const onBgPointerDown = useCallback(
        (e: PointerEvent<SVGRectElement>) => {
            if (e.button !== 0) return;
            const svg = svgRef.current;
            if (!svg) return;
            const { x, y } = svgPoint(svg, e.clientX, e.clientY);
            demo.addPoint(x, y);
            demo.selectPoint(null);
        },
        [demo],
    );

    const onPointPointerDown = useCallback(
        (e: PointerEvent<SVGElement>, id: string) => {
            e.stopPropagation();
            if (e.button !== 0) return;
            dragging.current = { id };
            (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
            demo.selectPoint(id);
        },
        [demo],
    );

    const onPointerMove = useCallback(
        (e: PointerEvent<SVGSVGElement>) => {
            const svg = svgRef.current;
            if (!svg) return;
            const { x, y } = svgPoint(svg, e.clientX, e.clientY);

            if (dragging.current) {
                const cx = Math.max(0, Math.min(W, x));
                const cy = Math.max(0, Math.min(H, y));
                demo.movePoint(dragging.current.id, cx, cy);
                return;
            }

            // hover detection on triangles / voronoi cells
            if (layers.voronoi && voronoi && allPoints.length >= 3) {
                const cellIdx = delaunay?.find(x, y);
                if (cellIdx !== undefined && cellIdx >= 0) {
                    const poly = voronoi.cellPolygon(cellIdx);
                    if (poly) {
                        // compute polygon area (shoelace)
                        let area = 0;
                        for (let i = 0; i < poly.length - 1; i++) {
                            area += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
                        }
                        area = Math.abs(area) / 2;
                        // convert to normalised [0,1] area
                        const normArea = area / (W * H);
                        if (hover?.kind !== "cell" || hover.index !== cellIdx) {
                            demo.setHover({ kind: "cell", index: cellIdx, area: normArea });
                        }
                        return;
                    }
                }
            }

            if (layers.delaunay && triangles.length > 0) {
                for (let i = 0; i < triangles.length; i++) {
                    const { ai, bi, ci } = triangles[i];
                    const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
                    // fast bounding box check
                    const minX = Math.min(a.x, b.x, c.x);
                    const maxX = Math.max(a.x, b.x, c.x);
                    const minY = Math.min(a.y, b.y, c.y);
                    const maxY = Math.max(a.y, b.y, c.y);
                    if (x < minX || x > maxX || y < minY || y > maxY) continue;
                    const s1 = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
                    const s2 = (c.x - b.x) * (y - b.y) - (c.y - b.y) * (x - b.x);
                    const s3 = (a.x - c.x) * (y - c.y) - (a.y - c.y) * (x - c.x);
                    if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) {
                        const rawArea = triangleArea(a, b, c);
                        const normArea = rawArea / (W * H);
                        if (hover?.kind !== "triangle" || hover.index !== i) {
                            demo.setHover({ kind: "triangle", index: i, area: normArea });
                        }
                        return;
                    }
                }
            }

            if (hover !== null) demo.setHover(null);
        },
        [demo, layers, allPoints, delaunay, voronoi, triangles, hover],
    );

    const onPointerUp = useCallback(() => {
        dragging.current = null;
    }, []);

    const onKeyDown = useCallback(
        (e: KeyboardEvent<SVGSVGElement>) => {
            if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
                const isFree = state.points.some((p) => p.id === selectedId);
                if (isFree) demo.removePoint(selectedId);
            }
        },
        [demo, selectedId, state.points],
    );

    // Build hover highlight polygon points string
    let hoverPolygonPoints: string | null = null;
    if (hover !== null && allPoints.length >= 3) {
        if (hover.kind === "triangle" && hover.index < triangles.length) {
            const { ai, bi, ci } = triangles[hover.index];
            const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
            hoverPolygonPoints = `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`;
        } else if (hover.kind === "cell" && voronoi) {
            const poly = voronoi.cellPolygon(hover.index);
            if (poly) {
                hoverPolygonPoints = poly.map(([px, py]) => `${px},${py}`).join(" ");
            }
        }
    }

    return (
        <div className="flex h-full min-h-[24rem] w-full items-center justify-center">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                className="block h-full max-h-[78vh] w-full rounded-xl border border-border bg-background/40 outline-none focus-visible:ring-1 focus-visible:ring-primary"
                style={{ cursor: "crosshair", aspectRatio: `${W} / ${H}` }}
                tabIndex={0}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={onKeyDown}
                aria-label="Delaunay triangulation and Voronoi diagram canvas"
                role="img"
            >
                {/* Background hit target */}
                <rect
                    x={0}
                    y={0}
                    width={W}
                    height={H}
                    fill="transparent"
                    onPointerDown={onBgPointerDown}
                />

                {/* Layer 1: Voronoi cells */}
                {layers.voronoi && voronoi && allPoints.length >= 3 && (
                    <g aria-hidden="true" pointerEvents="none">
                        {allPoints.map((_, i) => {
                            const poly = voronoi.cellPolygon(i);
                            if (!poly) return null;
                            return (
                                <polygon
                                    key={i}
                                    points={poly.map(([px, py]) => `${px},${py}`).join(" ")}
                                    fill="hsl(var(--brand) / 0.08)"
                                    stroke="hsl(var(--border))"
                                    strokeWidth="0.75"
                                />
                            );
                        })}
                    </g>
                )}

                {/* Layer 2: Hover highlight */}
                {hoverPolygonPoints && (
                    <polygon
                        points={hoverPolygonPoints}
                        fill="hsl(var(--brand) / 0.22)"
                        stroke="hsl(var(--brand))"
                        strokeWidth="1.5"
                        strokeOpacity="0.7"
                        pointerEvents="none"
                        aria-hidden="true"
                    />
                )}

                {/* Layer 3: Circumcircles */}
                {layers.circumcircles && allPoints.length >= 3 && (
                    <g aria-hidden="true" pointerEvents="none">
                        {triangles.map(({ ai, bi, ci }, i) => {
                            const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
                            const ax = b.x - a.x, ay = b.y - a.y;
                            const bx = c.x - a.x, by = c.y - a.y;
                            const D = 2 * (ax * by - ay * bx);
                            if (Math.abs(D) < 1e-10) return null;
                            const ux = (by * (ax * ax + ay * ay) - ay * (bx * bx + by * by)) / D;
                            const uy = (ax * (bx * bx + by * by) - bx * (ax * ax + ay * ay)) / D;
                            const cx = a.x + ux, cy = a.y + uy;
                            const r = Math.hypot(ux, uy);
                            return (
                                <circle
                                    key={i}
                                    cx={cx}
                                    cy={cy}
                                    r={r}
                                    fill="none"
                                    stroke="hsl(var(--border))"
                                    strokeWidth="0.75"
                                    strokeDasharray="4 5"
                                    strokeOpacity="0.6"
                                />
                            );
                        })}
                    </g>
                )}

                {/* Layer 4: Delaunay edges */}
                {layers.delaunay && delaunay && allPoints.length >= 3 && (
                    <g aria-hidden="true" pointerEvents="none">
                        {(() => {
                            const lines: ReactElement[] = [];
                            const t = delaunay.triangles;
                            const rendered = new Set<string>();
                            for (let i = 0; i < t.length; i += 3) {
                                const pairs: [number, number][] = [
                                    [t[i], t[i + 1]], [t[i + 1], t[i + 2]], [t[i + 2], t[i]],
                                ];
                                for (const [u, v] of pairs) {
                                    const key = u < v ? `${u}-${v}` : `${v}-${u}`;
                                    if (rendered.has(key)) continue;
                                    rendered.add(key);
                                    const a = allPoints[u], b = allPoints[v];
                                    lines.push(
                                        <line
                                            key={key}
                                            x1={a.x} y1={a.y}
                                            x2={b.x} y2={b.y}
                                            stroke="hsl(var(--foreground))"
                                            strokeWidth="1"
                                            strokeOpacity="0.4"
                                        />,
                                    );
                                }
                            }
                            return lines;
                        })()}
                    </g>
                )}

                {/* Layer 5: Points */}
                <g>
                    {allPoints.map((p) => {
                        const isSelected = p.id === selectedId;
                        const isGrid = p.kind === "grid";
                        const isCorner = state.grid.corners.some((c) => c.id === p.id);
                        if (isCorner) return null; // corners rendered separately
                        if (isGrid) {
                            return (
                                <rect
                                    key={p.id}
                                    x={p.x - 4}
                                    y={p.y - 4}
                                    width={8}
                                    height={8}
                                    transform={`rotate(45, ${p.x}, ${p.y})`}
                                    fill="hsl(var(--foreground) / 0.7)"
                                    stroke={isSelected ? "hsl(var(--brand))" : "hsl(var(--background))"}
                                    strokeWidth={isSelected ? "2" : "1"}
                                    style={{ cursor: "grab" }}
                                    onPointerDown={(e) => onPointPointerDown(e, p.id)}
                                />
                            );
                        }
                        return (
                            <circle
                                key={p.id}
                                cx={p.x}
                                cy={p.y}
                                r={isSelected ? 6 : 4}
                                fill="hsl(var(--foreground) / 0.85)"
                                stroke={isSelected ? "hsl(var(--brand))" : "hsl(var(--background))"}
                                strokeWidth={isSelected ? "2.5" : "1.5"}
                                style={{ cursor: "grab" }}
                                onPointerDown={(e) => onPointPointerDown(e, p.id)}
                            />
                        );
                    })}
                </g>

                {/* Layer 6: Grid corner handles (always on top when grid enabled) */}
                {layers.grid && (
                    <g>
                        {state.grid.corners.map((c, i) => (
                            <rect
                                key={c.id}
                                x={c.x - 7}
                                y={c.y - 7}
                                width={14}
                                height={14}
                                rx={2}
                                fill="hsl(var(--brand))"
                                stroke="hsl(var(--background))"
                                strokeWidth="1.5"
                                style={{ cursor: "grab" }}
                                onPointerDown={(e) => onPointPointerDown(e, c.id)}
                                aria-label={`Grid corner ${i}`}
                            />
                        ))}
                    </g>
                )}
            </svg>
        </div>
    );
}
