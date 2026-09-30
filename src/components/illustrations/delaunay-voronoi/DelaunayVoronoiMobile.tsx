import { useState } from "react";
import { Minus, MoreHorizontal, Plus, Redo2, RotateCcw, Undo2, X } from "lucide-react";
import { Button, cn, NumberInput, ToggleChip } from "@vitavision/ui";
import { Panel, PanelFlat, FloatingPanel, TinyBrow } from "../_shared/primitives";
import DelaunayVoronoiCanvas from "./DelaunayVoronoiCanvas";
import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";
import type { ActiveTool, Layers } from "./types";

interface Props {
    demo: DelaunayVoronoiState;
}

const DOCK_TOOLS: { tool: ActiveTool; icon: string; label: string }[] = [
    { tool: "add",     icon: "+",  label: "Add" },
    { tool: "move",    icon: "↔", label: "Move" },
    { tool: "inspect", icon: "⊙", label: "Inspect" },
    { tool: "delete",  icon: "✕", label: "Delete" },
    { tool: "grid",    icon: "▦", label: "Grid" },
];

const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
    { key: "delaunay",      label: "Delaunay" },
    { key: "voronoi",       label: "Voronoi" },
    { key: "circumcircles", label: "Circles" },
    { key: "grid",          label: "Grid" },
];

function minAngleColor(deg: number): string {
    if (deg <= 0) return "";
    if (deg >= 20) return "text-normal";
    if (deg >= 10) return "text-warn";
    return "text-defect";
}

function formatMinAngle(deg: number): string {
    return deg > 0 ? `${deg.toFixed(1)}°` : "—";
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

                {/* More kebab (top-right) — opens the bottom sheet */}
                <FloatingPanel className="absolute top-2.5 right-2.5 p-0.5">
                    <Button
                        variant="ghost"
                        aria-label="More options"
                        onClick={() => setTool("more")}
                        className="size-8 px-0"
                        icon={<MoreHorizontal />}
                    />
                </FloatingPanel>

                {/* Stats chip (top-right, below kebab) */}
                <FloatingPanel className="absolute top-12 right-2.5 px-2.5 py-1.5 font-mono text-[11px]">
                    {points} · {triangles} · {edges} · <span className={minAngleColor(minAngleDeg)}>{formatMinAngle(minAngleDeg)}</span>
                </FloatingPanel>

                {/* Reset corners chip — appears below stats when grid layer is on */}
                {layers.grid && (
                    <FloatingPanel className="absolute top-2.5 left-2.5 p-0.5">
                        <Button variant="ghost" size="sm" onClick={resetGrid} icon={<RotateCcw />}>
                            Reset corners
                        </Button>
                    </FloatingPanel>
                )}

                {/* Usage hint (bottom, dismissable) */}
                {hintVisible && (
                    <FloatingPanel className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-2 flex items-start gap-2">
                        <span className="text-[11px] leading-snug text-fg-muted">
                            Tap to add a point. Drag to move. Inspect tool: tap a triangle or cell to see its area.
                        </span>
                        <Button
                            variant="ghost"
                            aria-label="Dismiss hint"
                            onClick={() => setHintVisible(false)}
                            className="-mt-0.5 -mr-0.5 size-6 shrink-0 px-0"
                            icon={<X />}
                        />
                    </FloatingPanel>
                )}
            </Panel>

            {/* Tool dock */}
            <PanelFlat className="grid grid-cols-5 gap-1 p-2">
                {DOCK_TOOLS.map(({ tool, icon, label }) => {
                    const isActive = activeTool === tool;
                    return (
                        <Button
                            key={tool}
                            variant="ghost"
                            aria-pressed={isActive}
                            onClick={() => setTool(tool)}
                            className={cn(
                                "h-14 flex-col gap-1 px-0",
                                isActive && "bg-signal/15 text-signal ring-1 ring-inset ring-signal/40 hover:bg-signal/15 hover:text-signal",
                            )}
                        >
                            <span aria-hidden className="text-lg leading-none">{icon}</span>
                            <span className="text-[10px] leading-none">{label}</span>
                        </Button>
                    );
                })}
            </PanelFlat>

            {/* Layer pill row */}
            <div className="flex flex-wrap gap-2">
                {LAYER_LABELS.map(({ key, label }) => (
                    <ToggleChip
                        key={key}
                        checked={layers[key]}
                        onCheckedChange={() => toggleLayer(key)}
                        className="rounded-full px-3 py-1.5"
                    >
                        {label}
                    </ToggleChip>
                ))}
            </div>

            {/* More sheet */}
            {isMoreOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={() => setTool("add")}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line p-4 max-h-[60vh] overflow-y-auto bg-surface">
                        <TinyBrow className="mb-3">More options</TinyBrow>
                        <div className="flex flex-col gap-3">
                            {/* History */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={undo} disabled={!canUndo} icon={<Undo2 />}>
                                    Undo
                                </Button>
                                <Button onClick={redo} disabled={!canRedo} icon={<Redo2 />}>
                                    Redo
                                </Button>
                            </div>
                            {/* Grid size */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Rows</span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            className="size-8 px-0"
                                            aria-label="Fewer rows"
                                            onClick={() => setGridDims(Math.max(2, state.grid.rows - 1), undefined)}
                                            icon={<Minus />}
                                        />
                                        <span className="w-8 text-center font-mono text-sm">{state.grid.rows}</span>
                                        <Button
                                            className="size-8 px-0"
                                            aria-label="More rows"
                                            onClick={() => setGridDims(Math.min(20, state.grid.rows + 1), undefined)}
                                            icon={<Plus />}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Cols</span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            className="size-8 px-0"
                                            aria-label="Fewer cols"
                                            onClick={() => setGridDims(undefined, Math.max(2, state.grid.cols - 1))}
                                            icon={<Minus />}
                                        />
                                        <span className="w-8 text-center font-mono text-sm">{state.grid.cols}</span>
                                        <Button
                                            className="size-8 px-0"
                                            aria-label="More cols"
                                            onClick={() => setGridDims(undefined, Math.min(20, state.grid.cols + 1))}
                                            icon={<Plus />}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button onClick={resetGrid} icon={<RotateCcw />}>
                                Reset corners
                            </Button>
                            {/* Random N */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm flex-1">Random</span>
                                <NumberInput
                                    aria-label="Random point count"
                                    value={randomN}
                                    min={3}
                                    max={500}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        if (Number.isFinite(v) && v >= 3) setRandomN(v);
                                    }}
                                    className="w-16 text-center"
                                />
                                <Button onClick={() => randomPoints(randomN)}>Go</Button>
                            </div>
                            <Button variant="danger" onClick={clearPoints}>
                                Clear all
                            </Button>
                        </div>
                        <Button variant="ghost" className="mt-4 w-full" onClick={() => setTool("add")}>
                            Close
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
