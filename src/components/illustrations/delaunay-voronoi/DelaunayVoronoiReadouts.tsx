import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";

function MetricCell({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-lg border border-border/80 bg-background/80 px-2 py-2 min-w-0 ${accent ?? ""}`}
        >
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground leading-none">
                {label}
            </div>
            <div className="mt-1 font-mono text-sm font-semibold tracking-tight text-foreground leading-none truncate">
                {value}
            </div>
        </div>
    );
}

function angleAccent(deg: number): string {
    if (deg <= 0) return "";
    if (deg < 10) return "border-rose-500/30 bg-rose-500/10";
    if (deg < 20) return "border-amber-500/30 bg-amber-500/10";
    return "border-emerald-500/30 bg-emerald-500/10";
}

function angleDot(deg: number): string {
    if (deg <= 0) return "bg-muted-foreground";
    if (deg < 10) return "bg-rose-500";
    if (deg < 20) return "bg-amber-500";
    return "bg-emerald-500";
}

interface Props {
    demo: DelaunayVoronoiState;
}

export default function DelaunayVoronoiReadouts({ demo }: Props) {
    const { stats, state } = demo;
    const { hover } = state;
    const { points, triangles, edges, minAngleDeg } = stats;

    return (
        <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-1.5">
                <MetricCell label="Points" value={String(points)} />
                <MetricCell label="Triangles" value={String(triangles)} />
                <MetricCell label="Edges" value={String(edges)} />
                <div
                    className={`flex flex-col items-center justify-center rounded-lg border border-border/80 bg-background/80 px-2 py-2 min-w-0 ${angleAccent(minAngleDeg)}`}
                >
                    <div className="flex items-center gap-1.5">
                        {minAngleDeg > 0 && (
                            <span
                                className={`inline-block h-2 w-2 rounded-full shrink-0 ${angleDot(minAngleDeg)}`}
                            />
                        )}
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground leading-none">
                            Min angle
                        </div>
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold tracking-tight text-foreground leading-none">
                        {minAngleDeg > 0 ? `${minAngleDeg.toFixed(1)}°` : "—"}
                    </div>
                </div>
            </div>

            {/* Hover detail */}
            <div className="rounded-2xl border border-border/80 bg-muted/25 px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    Hover
                </div>
                {hover ? (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground capitalize">
                                {hover.kind} #{hover.index}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-muted-foreground">area</span>
                            <span className="text-[11px] font-mono text-foreground">
                                {hover.area.toFixed(4)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground/60 italic">
                        Hover a triangle or cell
                    </div>
                )}
            </div>

            {/* Interaction hint */}
            <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                <div className="text-[11px] text-muted-foreground/80 space-y-1 leading-relaxed">
                    <div>Click canvas — add point</div>
                    <div>Drag point — move it</div>
                    <div>Select + Delete — remove</div>
                    <div>Drag grid corners — warp perspective</div>
                </div>
            </div>
        </div>
    );
}
