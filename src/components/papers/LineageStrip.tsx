import { useEffect, useRef, useState } from "react";
import { computeLineageLayout } from "../../lib/atlas/lineage.ts";

export interface LineageEntry {
    id: string;
    year: number;
    title: string;
}

interface LineageStripProps {
    paperYear: number;
    cites: LineageEntry[];
    citedBy: LineageEntry[];
}

/** Layout width before the container has been measured (SSR, first paint). The
 *  strip is then re-laid-out at its real pixel width so dots and tick labels
 *  keep their size on a phone instead of being scaled down with the viewBox. */
const BASE_WIDTH = 680;

function useElementWidth<T extends HTMLElement>(fallback: number) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(([entry]) => {
            const w = Math.round(entry.contentRect.width);
            if (w > 0) setWidth(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width] as const;
}

function tickLabel(year: number): string {
    return `’${String(year).slice(-2)}`;
}

/**
 * The dot-histogram lineage strip. The "Built upon by / Builds on" labels are
 * plain HTML above/below the SVG rather than `<text>` inside it — a stack can
 * be arbitrarily deep (a heavily-cited paper stacks many dots in one year),
 * and an in-SVG label at a fixed y would collide with the topmost dot for a
 * shallow chart while a dynamic one adds complexity for no real benefit here.
 */
export default function LineageStrip({ paperYear, cites, citedBy }: LineageStripProps) {
    const [boxRef, width] = useElementWidth<HTMLDivElement>(BASE_WIDTH);
    const layout = computeLineageLayout({ paperYear, cites, citedBy, width });
    const titleById = new Map<string, string>();
    for (const e of [...cites, ...citedBy]) titleById.set(e.id, `${e.title} (${e.year})`);

    const bandTop = 4;
    const bandBottom = layout.height - 22;

    return (
        <div ref={boxRef} className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[hsl(var(--lineage-out))]">
                    Built upon by · {citedBy.length}
                </span>
            </div>
            <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                width="100%"
                height="auto"
                role="img"
                aria-label={`Citation lineage: ${cites.length} registry paper${cites.length === 1 ? "" : "s"} cited, ${citedBy.length} registry paper${citedBy.length === 1 ? "" : "s"} citing, by year`}
            >
                {/* Background bands: built-upon-by to the right of the paper's year, builds-on to the left. */}
                <rect
                    x={layout.paperX}
                    y={bandTop}
                    width={Math.max(0, layout.axisX2 - layout.paperX)}
                    height={Math.max(0, layout.axisY - bandTop)}
                    fill="hsl(var(--lineage-out) / 0.08)"
                    rx={4}
                />
                <rect
                    x={layout.axisX1 - 6}
                    y={layout.axisY + 4}
                    width={Math.max(0, layout.paperX - (layout.axisX1 - 6))}
                    height={Math.max(0, bandBottom - (layout.axisY + 4))}
                    fill="hsl(var(--lineage-in) / 0.08)"
                    rx={4}
                />

                {/* Axis */}
                <line
                    x1={layout.axisX1}
                    x2={layout.axisX2}
                    y1={layout.axisY}
                    y2={layout.axisY}
                    stroke="hsl(var(--border-strong))"
                    strokeWidth={1.5}
                />
                {layout.ticks.map((tick) => (
                    <g key={tick.year}>
                        <line
                            x1={tick.x}
                            x2={tick.x}
                            y1={layout.axisY - 3}
                            y2={layout.axisY + 3}
                            stroke="hsl(var(--border-strong))"
                        />
                        <text
                            x={tick.x}
                            y={layout.height - 8}
                            textAnchor="middle"
                            fontFamily="var(--font-mono, ui-monospace)"
                            fontSize={10}
                            fontWeight={tick.isPaperYear ? 600 : 400}
                            fill={tick.isPaperYear ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                        >
                            {tickLabel(tick.year)}
                        </text>
                    </g>
                ))}

                {/* Built-upon-by dots (filled, above the axis) */}
                {layout.citedBy.map((p) => (
                    <circle key={p.id} cx={p.x} cy={p.y} r={5} fill="hsl(var(--lineage-out))" stroke="hsl(var(--lineage-out))" strokeWidth={1.5}>
                        <title>{titleById.get(p.id) ?? p.id}</title>
                    </circle>
                ))}

                {/* Builds-on dots (hollow, below the axis) */}
                {layout.cites.map((p) => (
                    <circle key={p.id} cx={p.x} cy={p.y} r={5} fill="hsl(var(--surface))" stroke="hsl(var(--lineage-in))" strokeWidth={1.5}>
                        <title>{titleById.get(p.id) ?? p.id}</title>
                    </circle>
                ))}

                {/* The paper itself, on the axis */}
                <circle cx={layout.paperX} cy={layout.axisY} r={9} fill="hsl(var(--foreground))" />
                <circle cx={layout.paperX} cy={layout.axisY} r={14} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} />
            </svg>
            <div className="h-3" aria-hidden="true" />
        </div>
    );
}
