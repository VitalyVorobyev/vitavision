import { useEffect } from "react";
import { Panel, PanelFlat, TinyBrow } from "./_shared/primitives";
import DelaunayVoronoiCanvas from "./delaunay-voronoi/DelaunayVoronoiCanvas";
import { useDelaunayVoronoi } from "./delaunay-voronoi/useDelaunayVoronoi";
import type { Layers, ActiveTool } from "./delaunay-voronoi/types";

const LAYER_LABELS: { key: keyof Layers; label: string; swatch: string }[] = [
    { key: "delaunay",      label: "Delaunay",      swatch: "hsl(var(--foreground))" },
    { key: "voronoi",       label: "Voronoi",       swatch: "hsl(180 60% 55%)" },
    { key: "circumcircles", label: "Circumcircles", swatch: "hsl(var(--primary))" },
];

const MODES: { tool: ActiveTool; label: string }[] = [
    { tool: "add",    label: "Add" },
    { tool: "move",   label: "Move" },
    { tool: "delete", label: "Erase" },
];

export interface DelaunayVoronoiInlineIllustrationProps {
    initialLayers?: Partial<Layers>;
    showLegend?: boolean;
}

export default function DelaunayVoronoiInlineIllustration({
    initialLayers,
    showLegend = false,
}: DelaunayVoronoiInlineIllustrationProps = {}) {
    const demo = useDelaunayVoronoi();
    const { state, toggleLayer, setTool, resetGrid, clearPoints } = demo;

    // Default the inline figure to grid-on so corners are visible immediately.
    useEffect(() => {
        const wantGrid = initialLayers?.grid ?? true;
        if (wantGrid && !demo.state.layers.grid) toggleLayer("grid");
        if (initialLayers?.delaunay === false && demo.state.layers.delaunay) toggleLayer("delaunay");
        if (initialLayers?.voronoi && !demo.state.layers.voronoi) toggleLayer("voronoi");
        if (initialLayers?.circumcircles && !demo.state.layers.circumcircles) toggleLayer("circumcircles");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = () => {
        clearPoints();
        resetGrid();
        setTool("add");
    };

    return (
        <div className="flex flex-col gap-3 my-6">
            {/* Toolbar */}
            <PanelFlat className="flex flex-wrap items-center gap-3 px-3 py-2">
                <div className="flex items-center gap-1">
                    <TinyBrow className="mr-1 hidden sm:inline">Mode</TinyBrow>
                    {MODES.map(({ tool, label }) => {
                        const on = state.activeTool === tool;
                        return (
                            <button
                                key={tool}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setTool(tool)}
                                className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
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
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="flex items-center gap-1">
                    <TinyBrow className="mr-1 hidden sm:inline">Layers</TinyBrow>
                    {LAYER_LABELS.map(({ key, label, swatch }) => {
                        const on = state.layers[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleLayer(key)}
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                                    on
                                        ? "border-primary/40 bg-primary/10 text-foreground"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <span
                                    className="inline-block w-2 h-2 rounded-sm shrink-0"
                                    style={{ background: swatch }}
                                />
                                {label}
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="ml-auto rounded-full px-3 py-1 text-[11px] border border-border text-muted-foreground hover:text-foreground"
                >
                    Reset
                </button>
            </PanelFlat>

            {/* Canvas */}
            <Panel className="relative overflow-hidden p-0" style={{ aspectRatio: "4/3" }}>
                <DelaunayVoronoiCanvas demo={demo} />
            </Panel>

            {showLegend && (
                <p className="text-[11px] text-muted-foreground">
                    Drag any corner handle to warp the grid. Drag a node to displace it. Switch to <em>Erase</em> and tap a node to remove it.
                </p>
            )}
        </div>
    );
}
