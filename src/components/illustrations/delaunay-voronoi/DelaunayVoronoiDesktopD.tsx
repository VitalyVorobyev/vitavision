import { useState } from "react";
import {
    Panel, FloatingPanel, TinyBrow, MetricCell, Kbd, Pill, Note,
} from "../_shared/primitives";
import DelaunayVoronoiCanvas from "./DelaunayVoronoiCanvas";
import PoseReadout from "./PoseReadout";
import HorizonViz from "./HorizonViz";
import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";
import type { ActiveTool, Layers } from "./types";

interface Props {
    demo: DelaunayVoronoiState;
}

// ── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({
    label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs">{label}</span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(min, value - 1))}
                    className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-border text-sm leading-none hover:bg-muted/40"
                >−</button>
                <input
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={1}
                    onChange={(e) => {
                        const v = Math.max(min, Math.min(max, Number(e.target.value)));
                        if (Number.isFinite(v)) onChange(v);
                    }}
                    className="w-11 text-center text-xs font-mono rounded border border-border bg-background py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                    type="button"
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-border text-sm leading-none hover:bg-muted/40"
                >+</button>
            </div>
        </div>
    );
}

// ── MinAngle tone ────────────────────────────────────────────────────────────
function minAngleTone(deg: number): "neutral" | "good" | "warn" | "bad" {
    if (deg <= 0) return "neutral";
    if (deg >= 20) return "good";
    if (deg >= 10) return "warn";
    return "bad";
}

// ── Layer chip colors ────────────────────────────────────────────────────────
const LAYER_SWATCHES: Record<keyof Layers, string> = {
    delaunay:      "hsl(var(--foreground))",
    voronoi:       "hsl(180 60% 55%)",
    circumcircles: "hsl(var(--primary))",
    grid:          "hsl(var(--muted-foreground))",
};
const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
    { key: "delaunay",      label: "Delaunay" },
    { key: "voronoi",       label: "Voronoi" },
    { key: "circumcircles", label: "Circumcircles" },
    { key: "grid",          label: "Grid" },
];

// ── Tool palette entries ─────────────────────────────────────────────────────
const TOOLS: { tool: ActiveTool; icon: string; title: string; key: string }[] = [
    { tool: "add",    icon: "+",  title: "Add point",   key: "A" },
    { tool: "move",   icon: "↔", title: "Move",         key: "V" },
    { tool: "delete", icon: "✕", title: "Delete",       key: "⌫" },
    { tool: "grid",   icon: "▦", title: "Grid warp",    key: "G" },
    { tool: "hover",  icon: "⊙", title: "Hover info",   key: "H" },
];

export default function DelaunayVoronoiDesktopD({ demo }: Props) {
    const { state, stats, pose, toggleLayer, setGridDims, resetGrid, clearPoints, randomPoints, setTool, setGridPopoverOpen } = demo;
    const { layers, hover, pointer, activeTool, gridPopoverOpen } = state;
    const { points, triangles, edges, minAngleDeg } = stats;
    const [randomN] = useState(30);

    return (
        <div className="flex flex-col gap-3">
            {/* Canvas panel — position:relative so overlays can be absolute */}
            <Panel className="relative overflow-hidden p-0" style={{ minHeight: 480 }}>
                {/* Canvas fills the panel, aspect 4:3 */}
                <div className="w-full" style={{ aspectRatio: "4/3", minHeight: 480, maxHeight: "min(720px, 78vh)" }}>
                    <DelaunayVoronoiCanvas demo={demo} />
                </div>

                {/* ── Tool palette (top-left) ── */}
                <FloatingPanel className="absolute top-4 left-4 flex flex-col gap-1 p-1.5">
                    {TOOLS.map(({ tool, icon, title, key }) => {
                        const isActive = activeTool === tool;
                        return (
                            <button
                                key={tool}
                                type="button"
                                title={`${title} (${key})`}
                                aria-pressed={isActive}
                                onClick={() => setTool(tool)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl text-base transition-colors ${
                                    isActive
                                        ? "bg-primary/15 border border-primary/40 text-primary"
                                        : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {icon}
                            </button>
                        );
                    })}
                    <div className="h-px bg-border mx-1.5 my-0.5" />
                    <button
                        type="button"
                        title="Random N points (R)"
                        onClick={() => randomPoints(randomN)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-base hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    >⚂</button>
                    <button
                        type="button"
                        title="Clear all points"
                        onClick={clearPoints}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-base hover:bg-muted/40 text-muted-foreground hover:text-rose-400"
                    >⌫</button>
                </FloatingPanel>

                {/* ── Grid config popover (anchored right of Grid tool) ── */}
                {gridPopoverOpen && layers.grid && (
                    <FloatingPanel
                        className="absolute top-4 w-56 p-3"
                        style={{ left: 72, border: "1px solid hsl(var(--primary)/0.4)" }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <TinyBrow>Grid · {state.grid.rows} × {state.grid.cols}</TinyBrow>
                            <button
                                type="button"
                                onClick={() => setGridPopoverOpen(false)}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted/40 text-muted-foreground"
                            >×</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Stepper
                                label="Rows"
                                value={state.grid.rows}
                                min={2}
                                max={20}
                                onChange={(v) => setGridDims(v, undefined)}
                            />
                            <Stepper
                                label="Cols"
                                value={state.grid.cols}
                                min={2}
                                max={20}
                                onChange={(v) => setGridDims(undefined, v)}
                            />
                            <button
                                type="button"
                                onClick={resetGrid}
                                className="text-xs rounded-md border border-border py-1 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            >Reset corners</button>
                        </div>
                    </FloatingPanel>
                )}

                {/* ── Layer chips (top-center) ── */}
                <FloatingPanel className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 rounded-full">
                    {LAYER_LABELS.map(({ key, label }) => {
                        const on = layers[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => {
                                    if (key === "grid" && on) {
                                        // turning off grid: close popover via toggleLayer which handles it
                                    }
                                    toggleLayer(key);
                                }}
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                                    on
                                        ? "border border-primary/40 bg-primary/10 text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <span
                                    className="inline-block w-2 h-2 rounded-sm shrink-0"
                                    style={{ background: LAYER_SWATCHES[key] }}
                                />
                                {label}
                            </button>
                        );
                    })}
                </FloatingPanel>

                {/* ── Coord readout (top-right) ── */}
                <FloatingPanel className="absolute top-4 right-4 px-2.5 py-1.5 text-[11px] font-mono rounded-xl">
                    {pointer
                        ? <><span className="text-muted-foreground">x</span> {pointer.x}&nbsp;&nbsp;<span className="text-muted-foreground">y</span> {pointer.y}</>
                        : <><span className="text-muted-foreground">x</span> —&nbsp;&nbsp;<span className="text-muted-foreground">y</span> —</>
                    }
                </FloatingPanel>

                {/* ── Stats + Pose HUD (bottom-right) ── */}
                <FloatingPanel className="absolute bottom-4 right-4 w-[260px] p-2.5 flex flex-col gap-2">
                    <TinyBrow>Stats</TinyBrow>
                    <div className="grid grid-cols-2 gap-1.5">
                        <MetricCell label="Points" value={String(points)} />
                        <MetricCell label="Tris" value={String(triangles)} />
                        <MetricCell label="Edges" value={String(edges)} />
                        <MetricCell
                            label="Min ∠"
                            value={minAngleDeg > 0 ? `${minAngleDeg.toFixed(1)}°` : "—"}
                            tone={minAngleTone(minAngleDeg)}
                        />
                    </div>
                    <TinyBrow className="mt-1">Camera pose</TinyBrow>
                    <PoseReadout pose={pose} />
                    <HorizonViz pose={pose} />
                </FloatingPanel>

                {/* ── Hover tooltip (bottom-left) ── */}
                {hover && activeTool === "hover" && (
                    <FloatingPanel className="absolute bottom-4 p-2.5 w-[220px]" style={{ left: 80 }}>
                        <TinyBrow className="mb-1.5">Hover</TinyBrow>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{hover.kind} #{hover.index}</span>
                            <span className="font-mono">area {hover.area.toFixed(4)}</span>
                        </div>
                        {hover.kind === "triangle" && (
                            <div className="flex justify-between text-xs mt-1">
                                <span className="text-muted-foreground">min angle</span>
                                <span className={`font-mono ${minAngleTone(minAngleDeg) === "good" ? "text-emerald-400" : minAngleTone(minAngleDeg) === "warn" ? "text-amber-400" : "text-rose-400"}`}>
                                    {minAngleDeg > 0 ? `${minAngleDeg.toFixed(1)}°` : "—"}
                                </span>
                            </div>
                        )}
                    </FloatingPanel>
                )}
            </Panel>

            {/* Shortcut pills + note */}
            <div className="flex flex-wrap gap-2 items-center">
                <Pill><Kbd>A</Kbd> add</Pill>
                <Pill><Kbd>V</Kbd> move</Pill>
                <Pill><Kbd>⌫</Kbd> delete selected</Pill>
                <Pill><Kbd>G</Kbd> grid warp</Pill>
                <Pill><Kbd>R</Kbd> random N</Pill>
            </div>
            <Note>
                <strong className="text-primary">D — Floating tool palette.</strong> Modal tools, layer chips, HUD. The canvas owns the screen.
            </Note>
        </div>
    );
}
