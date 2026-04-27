import type { FC } from "react";
import DemoThumbnail from "./DemoThumbnail.tsx";

interface Props {
    slug: string;
    className?: string;
}

const bg = "bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--muted)))]";

function ChessResponseCover() {
    const cols = 4;
    const rows = 3;
    const cell = 36;
    const startX = (320 - cols * cell) / 2;
    const startY = (180 - rows * cell) / 2;

    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({
                x: startX + c * cell,
                y: startY + r * cell,
                filled: (r + c) % 2 === 0,
            });
        }
    }

    const saddles = [];
    for (let r = 1; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
            saddles.push({ x: startX + c * cell, y: startY + r * cell });
        }
    }

    return (
        <svg
            viewBox="0 0 320 180"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            aria-hidden="true"
        >
            {cells.map((c, i) => (
                <rect
                    key={i}
                    x={c.x}
                    y={c.y}
                    width={cell}
                    height={cell}
                    className={c.filled ? "text-foreground/55" : "text-foreground/8"}
                    fill="currentColor"
                />
            ))}
            {saddles.map((s, i) => (
                <g key={i}>
                    <circle cx={s.x} cy={s.y} r="20" className="text-brand" fill="currentColor" fillOpacity="0.12" />
                    <circle cx={s.x} cy={s.y} r="12" className="text-brand" fill="currentColor" fillOpacity="0.28" />
                    <circle cx={s.x} cy={s.y} r="6" className="text-brand" fill="currentColor" fillOpacity="0.85" />
                    <circle cx={s.x} cy={s.y} r="2" className="text-background" fill="currentColor" />
                </g>
            ))}
        </svg>
    );
}

function DelaunayVoronoiCover() {
    // Slightly perspective-warped 3x3 grid of seed points.
    const pts: { x: number; y: number }[] = [
        { x:  72, y:  44 }, { x: 162, y:  36 }, { x: 256, y:  44 },
        { x:  78, y:  92 }, { x: 162, y:  90 }, { x: 250, y:  92 },
        { x:  84, y: 138 }, { x: 162, y: 146 }, { x: 244, y: 138 },
    ];

    // Delaunay triangle indices: two triangles per grid cell, four cells.
    const tris: [number, number, number][] = [
        [0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4],
        [3, 4, 7], [3, 7, 6], [4, 5, 8], [4, 8, 7],
    ];

    // Voronoi-like tinted region around the centre seed (point 4).
    const centerCell =
        "M 116 60 L 209 60 L 235 115 L 209 165 L 116 165 L 92 115 Z";

    // Highlighted Delaunay edges around the centre, hinting at the dual graph.
    const dualEdges: [number, number][] = [
        [4, 1], [4, 3], [4, 5], [4, 7],
    ];

    return (
        <svg
            viewBox="0 0 320 180"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            aria-hidden="true"
        >
            {/* Voronoi cell tint (the dual region around the centre) */}
            <path
                d={centerCell}
                className="text-brand"
                fill="currentColor"
                fillOpacity="0.10"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="0.8"
            />

            {/* Delaunay triangulation outlines */}
            {tris.map(([a, b, c], i) => {
                const A = pts[a], B = pts[b], C = pts[c];
                return (
                    <polygon
                        key={i}
                        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
                        className="text-foreground"
                        stroke="currentColor"
                        strokeOpacity="0.25"
                        strokeWidth="0.7"
                        fill="none"
                    />
                );
            })}

            {/* Highlighted dual-graph spokes from the centre */}
            {dualEdges.map(([a, b], i) => {
                const A = pts[a], B = pts[b];
                return (
                    <line
                        key={i}
                        x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                        className="text-brand"
                        stroke="currentColor"
                        strokeOpacity="0.55"
                        strokeWidth="1.2"
                    />
                );
            })}

            {/* Seed points */}
            {pts.map((p, i) => (
                <g key={i}>
                    <circle
                        cx={p.x} cy={p.y} r="6"
                        className="text-brand"
                        fill="currentColor"
                        fillOpacity={i === 4 ? 0.22 : 0.14}
                    />
                    <circle
                        cx={p.x} cy={p.y} r={i === 4 ? 3.2 : 2.6}
                        className={i === 4 ? "text-brand" : "text-foreground"}
                        fill="currentColor"
                    />
                </g>
            ))}
        </svg>
    );
}

const COVERS: Record<string, FC> = {
    "chess-response":  ChessResponseCover,
    "delaunay-voronoi": DelaunayVoronoiCover,
};

export default function DemoCover({ slug, className }: Props) {
    const Cover = COVERS[slug];
    if (Cover) {
        return (
            <div className={`${bg} ${className ?? ""}`}>
                <Cover />
            </div>
        );
    }
    return <DemoThumbnail />;
}
