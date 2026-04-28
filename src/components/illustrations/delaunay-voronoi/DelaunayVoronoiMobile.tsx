import { useState } from "react";
import { Panel, PanelFlat, FloatingPanel, TinyBrow } from "../_shared/primitives";
import DelaunayVoronoiCanvas from "./DelaunayVoronoiCanvas";
import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";
import type { ActiveTool, Layers } from "./types";

interface Props {
    demo: DelaunayVoronoiState;
}

const DOCK_TOOLS: { tool: ActiveTool; icon: string; label: string }[] = [
    { tool: "add",    icon: "+",  label: "Add" },
    { tool: "move",   icon: "↔", label: "Move" },
    { tool: "delete", icon: "✕", label: "Delete" },
    { tool: "grid",   icon: "▦", label: "Grid" },
    { tool: "more",   icon: "⚙", label: "More" },
];

const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
    { key: "delaunay",      label: "Delaunay" },
    { key: "voronoi",       label: "Voronoi" },
    { key: "circumcircles", label: "Circles" },
    { key: "grid",          label: "Grid" },
];

function minAngleColor(deg: number): string {
    if (deg <= 0) return "";
    if (deg >= 20) return "text-emerald-400";
    if (deg >= 10) return "text-amber-400";
    return "text-rose-400";
}

function formatMinAngle(deg: number): string {
    if (deg <= 0) return "—";
    if (deg < 0.05) return "<0.1°";
    return `${deg.toFixed(1)}°`;
}

export default function DelaunayVoronoiMobile({ demo }: Props) {
    const { state, stats, toggleLayer, setGridDims, resetGrid, clearPoints, randomPoints, setTool, undo, redo, canUndo, canRedo } = demo;
    const { layers, activeTool } = state;
    const { points, triangles, edges, minAngleDeg } = stats;
    const [randomN, setRandomN] = useState(30);
    const [hintVisible, setHintVisible] = useState(true);

    const isMoreOpen = activeTool === "more";

    return (
        <div className="flex flex-col gap-3">
            {/* Canvas panel */}
            <Panel className="relative overflow-hidden p-0 w-full" style={{ aspectRatio: "4/3" }}>
                <DelaunayVoronoiCanvas demo={demo} />

                {/* Stats chip (top-right) */}
                <FloatingPanel className="absolute top-2.5 right-2.5 px-2.5 py-1.5 font-mono text-[11px]">
                    {points} · {triangles} · {edges} · <span className={minAngleColor(minAngleDeg)}>{formatMinAngle(minAngleDeg)}</span>
                </FloatingPanel>

                {/* Reset corners chip — appears below stats when grid layer is on */}
                {layers.grid && (
                    <FloatingPanel className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[11px]">
                        <button
                            type="button"
                            onClick={resetGrid}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >↺ Reset corners</button>
                    </FloatingPanel>
                )}

                {/* Usage hint (bottom, dismissable) */}
                {hintVisible && (
                    <FloatingPanel className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-2 flex items-start gap-2">
                        <span className="text-[11px] leading-snug text-muted-foreground">
                            Tap to add a point. Drag to move. Use the Delete tool to remove.
                        </span>
                        <button
                            type="button"
                            aria-label="Dismiss hint"
                            onClick={() => setHintVisible(false)}
                            className="-mt-0.5 -mr-0.5 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground shrink-0"
                        >×</button>
                    </FloatingPanel>
                )}
            </Panel>

            {/* Tool dock */}
            <PanelFlat className="grid grid-cols-5 gap-1 p-2">
                {DOCK_TOOLS.map(({ tool, icon, label }) => {
                    const isActive = activeTool === tool;
                    return (
                        <button
                            key={tool}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setTool(tool)}
                            className={`flex flex-col items-center justify-center min-h-[56px] gap-1 rounded-xl transition-colors ${
                                isActive
                                    ? "bg-primary/15 border border-primary/40 text-primary"
                                    : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <span style={{ fontSize: 18 }}>{icon}</span>
                            <span style={{ fontSize: 10 }}>{label}</span>
                        </button>
                    );
                })}
            </PanelFlat>

            {/* Layer pill row */}
            <div className="flex flex-wrap gap-2">
                {LAYER_LABELS.map(({ key, label }) => {
                    const on = layers[key];
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleLayer(key)}
                            className={`rounded-full px-3 py-1.5 text-[11px] border transition-colors ${
                                on
                                    ? "border-primary/40 bg-primary/10 text-foreground"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* More sheet */}
            {isMoreOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={() => setTool("add")}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border p-4 max-h-[60vh] overflow-y-auto bg-[hsl(var(--surface))]">
                        <TinyBrow className="mb-3">More options</TinyBrow>
                        <div className="flex flex-col gap-3">
                            {/* History */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={undo}
                                    disabled={!canUndo}
                                    className={`rounded-xl border border-border py-2.5 text-sm transition-colors ${
                                        canUndo
                                            ? "text-muted-foreground hover:text-foreground"
                                            : "opacity-40 cursor-not-allowed text-muted-foreground"
                                    }`}
                                >↶ Undo</button>
                                <button
                                    type="button"
                                    onClick={redo}
                                    disabled={!canRedo}
                                    className={`rounded-xl border border-border py-2.5 text-sm transition-colors ${
                                        canRedo
                                            ? "text-muted-foreground hover:text-foreground"
                                            : "opacity-40 cursor-not-allowed text-muted-foreground"
                                    }`}
                                >↷ Redo</button>
                            </div>
                            {/* Grid size */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Rows</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setGridDims(Math.max(2, state.grid.rows - 1), undefined)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 text-sm"
                                        >−</button>
                                        <span className="w-8 text-center font-mono text-sm">{state.grid.rows}</span>
                                        <button
                                            type="button"
                                            onClick={() => setGridDims(Math.min(20, state.grid.rows + 1), undefined)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 text-sm"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Cols</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setGridDims(undefined, Math.max(2, state.grid.cols - 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 text-sm"
                                        >−</button>
                                        <span className="w-8 text-center font-mono text-sm">{state.grid.cols}</span>
                                        <button
                                            type="button"
                                            onClick={() => setGridDims(undefined, Math.min(20, state.grid.cols + 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 text-sm"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={resetGrid}
                                className="rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:text-foreground"
                            >Reset corners</button>
                            {/* Random N */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm flex-1">Random</span>
                                <input
                                    type="number"
                                    value={randomN}
                                    min={3}
                                    max={500}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        if (Number.isFinite(v) && v >= 3) setRandomN(v);
                                    }}
                                    className="w-16 text-center text-sm font-mono rounded border border-border bg-background py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => randomPoints(randomN)}
                                    className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                >Go</button>
                            </div>
                            <button
                                type="button"
                                onClick={clearPoints}
                                className="rounded-xl border border-rose-500/40 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10"
                            >Clear all</button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTool("add")}
                            className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                            Close
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
