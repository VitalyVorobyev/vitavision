import { useEffect } from "react";
import { Button, DensityProvider, SegmentedControl, ToggleChip } from "@vitavision/ui";
import { Panel, PanelFlat, TinyBrow } from "./_shared/primitives";
import DelaunayVoronoiCanvas from "./delaunay-voronoi/DelaunayVoronoiCanvas";
import { useDelaunayVoronoi } from "./delaunay-voronoi/useDelaunayVoronoi";
import type { Layers, ActiveTool } from "./delaunay-voronoi/types";

const LAYER_LABELS: { key: keyof Layers; label: string; swatch: string }[] = [
    { key: "delaunay",      label: "Delaunay",      swatch: "var(--fg)" },
    { key: "voronoi",       label: "Voronoi",       swatch: "hsl(180 60% 55%)" },
    { key: "circumcircles", label: "Circumcircles", swatch: "var(--signal)" },
];

const MODES: { tool: ActiveTool; label: string }[] = [
    { tool: "add",    label: "Add" },
    { tool: "move",   label: "Move" },
    { tool: "delete", label: "Erase" },
];

const MODE_OPTIONS = MODES.map(({ tool, label }) => ({ value: tool, label }));

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
        <DensityProvider value="compact">
        <div className="flex flex-col gap-3 my-6">
            {/* Toolbar */}
            <PanelFlat className="flex flex-wrap items-center gap-3 px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <TinyBrow className="hidden sm:inline">Mode</TinyBrow>
                    <SegmentedControl
                        aria-label="Mode"
                        value={state.activeTool}
                        options={MODE_OPTIONS}
                        onValueChange={(next) => {
                            const mode = MODES.find(({ tool }) => tool === next);
                            if (mode) setTool(mode.tool);
                        }}
                    />
                </div>
                <div className="hidden sm:block w-px h-4 bg-line" />
                <div className="flex items-center gap-1.5">
                    <TinyBrow className="hidden sm:inline">Layers</TinyBrow>
                    {LAYER_LABELS.map(({ key, label, swatch }) => (
                        <ToggleChip
                            key={key}
                            checked={state.layers[key]}
                            onCheckedChange={() => toggleLayer(key)}
                            swatch={swatch}
                        >
                            {label}
                        </ToggleChip>
                    ))}
                </div>
                <Button variant="ghost" className="ml-auto" onClick={reset}>
                    Reset
                </Button>
            </PanelFlat>

            {/* Canvas */}
            <Panel className="relative overflow-hidden p-0" style={{ aspectRatio: "4/3" }}>
                <DelaunayVoronoiCanvas demo={demo} />
            </Panel>

            {showLegend && (
                <p className="text-[11px] text-fg-muted">
                    Drag any corner handle to warp the grid. Drag a node to displace it. Switch to <em>Erase</em> and tap a node to remove it.
                </p>
            )}
        </div>
        </DensityProvider>
    );
}
