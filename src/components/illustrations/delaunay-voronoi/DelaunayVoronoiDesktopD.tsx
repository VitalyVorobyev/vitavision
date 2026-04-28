import { useState } from "react";
import {
    Panel, FloatingPanel, TinyBrow, MetricCell, Kbd, Pill, Note,
} from "../_shared/primitives";
import DelaunayVoronoiCanvas from "./DelaunayVoronoiCanvas";
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

function formatMinAngle(deg: number): string {
    if (deg <= 0) return "—";
    if (deg < 0.05) return "<0.1°";
    return `${deg.toFixed(1)}°`;
}

export default function DelaunayVoronoiDesktopD({ demo }: Props) {
    const { state, stats, toggleLayer, setGridDims, resetGrid, clearPoints, randomPoints, setTool, setGridPopoverOpen, undo, redo, canUndo, canRedo } = demo;
    const { layers, hover, pointer, activeTool, gridPopoverOpen } = state;
    const { points, triangles, edges, minAngleDeg } = stats;
    const [randomN, setRandomN] = useState(30);
    const [hintVisible, setHintVisible] = useState(true);

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
                        title="Undo (⌘Z)"
                        aria-label="Undo"
                        onClick={undo}
                        disabled={!canUndo}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-base transition-colors ${
                            canUndo
                                ? "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                : "opacity-40 cursor-not-allowed text-muted-foreground"
                        }`}
                    >↶</button>
                    <button
                        type="button"
                        title="Redo (⇧⌘Z)"
                        aria-label="Redo"
                        onClick={redo}
                        disabled={!canRedo}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-base transition-colors ${
                            canRedo
                                ? "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                : "opacity-40 cursor-not-allowed text-muted-foreground"
                        }`}
                    >↷</button>
                    <div className="h-px bg-border mx-1.5 my-0.5" />
                    <div className="flex flex-col items-center gap-1 py-0.5">
                        <input
                            type="number"
                            value={randomN}
                            min={3}
                            max={500}
                            onChange={(e) => {
                                const v = Math.max(3, Math.min(500, Number(e.target.value)));
                                if (Number.isFinite(v)) setRandomN(v);
                            }}
                            className="w-10 text-center text-[11px] font-mono rounded border border-border bg-background py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            aria-label="Random point count"
                            title="Random point count"
                        />
                        <button
                            type="button"
                            title={`Random ${randomN} points (R)`}
                            onClick={() => randomPoints(randomN)}
                            className="w-10 h-8 flex items-center justify-center rounded-xl text-base hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        >⚂</button>
                    </div>
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
                                onClick={() => toggleLayer(key)}
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

                {/* ── Reset corners chip (top-center, below layer chips, only when grid is on) ── */}
                {layers.grid && (
                    <FloatingPanel className="absolute top-[58px] left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] flex items-center">
                        <button
                            type="button"
                            onClick={resetGrid}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Reset grid corners to defaults"
                        >↺ Reset corners</button>
                    </FloatingPanel>
                )}

                {/* ── Coord readout (top-right) ── */}
                <FloatingPanel className="absolute top-4 right-4 px-2.5 py-1.5 text-[11px] font-mono rounded-xl">
                    {pointer
                        ? <><span className="text-muted-foreground">x</span> {pointer.x}&nbsp;&nbsp;<span className="text-muted-foreground">y</span> {pointer.y}</>
                        : <><span className="text-muted-foreground">x</span> —&nbsp;&nbsp;<span className="text-muted-foreground">y</span> —</>
                    }
                </FloatingPanel>

                {/* ── Stats HUD (bottom-right) ── */}
                <FloatingPanel className="absolute bottom-4 right-4 w-[200px] p-2.5 flex flex-col gap-2">
                    <TinyBrow>Stats</TinyBrow>
                    <div className="grid grid-cols-2 gap-1.5">
                        <MetricCell label="Points" value={String(points)} />
                        <MetricCell label="Tris" value={String(triangles)} />
                        <MetricCell label="Edges" value={String(edges)} />
                        <MetricCell
                            label="Min ∠"
                            value={formatMinAngle(minAngleDeg)}
                            tone={minAngleTone(minAngleDeg)}
                        />
                    </div>
                </FloatingPanel>

                {/* ── Usage hint (bottom-center, dismissable) ── */}
                {hintVisible && (
                    <FloatingPanel className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[480px] px-3 py-2 flex items-start gap-2.5">
                        <span className="text-[11px] leading-snug text-muted-foreground">
                            Click an empty area to add a point. Drag any point to move it. Select a point and press <Kbd>⌫</Kbd> to remove it.
                        </span>
                        <button
                            type="button"
                            aria-label="Dismiss hint"
                            onClick={() => setHintVisible(false)}
                            className="-mt-0.5 -mr-0.5 w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground shrink-0"
                        >×</button>
                    </FloatingPanel>
                )}

                {/* ── Hover tooltip (bottom-left) ── */}
                {hover && activeTool === "hover" && (
                    <FloatingPanel className="absolute bottom-4 p-2.5 w-[220px]" style={{ left: 80 }}>
                        <TinyBrow className="mb-1.5">Hover</TinyBrow>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{hover.kind} #{hover.index}</span>
                            <span className="font-mono">area {hover.area.toFixed(4)}</span>
                        </div>
                        {hover.kind === "triangle" && (() => {
                            const tone = minAngleTone(hover.minAngleDeg);
                            const toneClass = tone === "good"
                                ? "text-emerald-400"
                                : tone === "warn"
                                    ? "text-amber-400"
                                    : tone === "bad"
                                        ? "text-rose-400"
                                        : "text-muted-foreground";
                            return (
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-muted-foreground">min angle</span>
                                    <span className={`font-mono ${toneClass}`}>
                                        {formatMinAngle(hover.minAngleDeg)}
                                    </span>
                                </div>
                            );
                        })()}
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
                <Pill><Kbd>⌘Z</Kbd> undo</Pill>
                <Pill><Kbd>⇧⌘Z</Kbd> redo</Pill>
            </div>
            <Note>
                <strong className="text-primary">D — Floating tool palette.</strong> Modal tools, layer chips, HUD. The canvas owns the screen.
            </Note>
        </div>
    );
}
