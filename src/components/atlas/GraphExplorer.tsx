// GraphExplorer — graph view for the Atlas
//
// Above the lg breakpoint: visual graph canvas (desktop).
// Below lg: focused-entry hero card + grouped neighbor lists (mobile).
// Both shapes share the same trail state machine and navigation contract.
// Props: { focusSlug?: string }

import { useCallback, useMemo } from "react";
import useMediaQuery from "../../hooks/useMediaQuery.ts";
import { useViewport } from "../../lib/graph/useViewport.ts";
import type { ViewportBounds } from "../../lib/graph/useViewport.ts";
import {
    GG,
    LANES_V3,
    categorize,
    computeLayout,
    layoutBounds,
    resolveInitialSlug,
} from "../../lib/atlas/graphLayout.ts";
import { useGraphTrail } from "../../lib/atlas/graphTrail.ts";
import { FocusedEntryPanel } from "./FocusedEntryPanel.tsx";
import { ZoomControls } from "./graph/ZoomControls.tsx";
import { NodeFinder } from "./graph/NodeFinder.tsx";
import { nodeFinderSearch } from "./graph/nodeFinderSearch.tsx";
import { PannableViewport } from "./graph/PannableViewport.tsx";
import { LaneLabel } from "./graph/LaneLabel.tsx";
import { TrailStrip } from "./graph/TrailStrip.tsx";
import { RelationLegend } from "./graph/RelationLegend.tsx";
import { EdgesLayer } from "./graph/EdgesLayer.tsx";
import { CenterCard } from "./graph/CenterCard.tsx";
import { NeighborCard } from "./graph/NeighborCard.tsx";
import { MobileGraphView } from "./graph/MobileGraphView.tsx";

export interface GraphExplorerProps {
    focusSlug?: string;
}

export default function GraphExplorer({ focusSlug }: GraphExplorerProps) {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const initialSlug = useMemo(() => resolveInitialSlug(focusSlug), [focusSlug]);

    const { history, current, future, hover, setHover, back, forward, navigate, jumpToHistory } =
        useGraphTrail(initialSlug);

    // ── Graph data ─────────────────────────────────────────────────────────────

    const cat    = useMemo(() => (current ? categorize(current) : null), [current]);
    const layout = useMemo(() => (cat ? computeLayout(cat) : null),      [cat]);

    // ── Active rels (for legend filtering) ────────────────────────────────────

    const activeRels = useMemo<Set<string>>(() => {
        if (!cat) return new Set();
        const s = new Set<string>();
        for (const rel of LANES_V3) {
            if (cat[rel].length > 0) s.add(rel);
        }
        return s;
    }, [cat]);

    // ── Whiteboard pan/zoom state ──────────────────────────────────────────────

    const bounds = useMemo<ViewportBounds | null>(() => (layout ? layoutBounds(layout) : null), [layout]);

    const onPanStart = useCallback(() => setHover(null), [setHover]);

    const {
        viewportRef,
        planeRef,
        view,
        animate,
        fitView,
        zoomAroundCenter,
        onPointerDown:   handleViewportPointerDown,
        onPointerMove:   handleViewportPointerMove,
        onPointerUp:     handleViewportPointerUp,
        onPointerCancel: handleViewportPointerCancel,
    } = useViewport({ bounds, refitKey: current, onPanStart });

    // ── Empty state ────────────────────────────────────────────────────────────

    if (!initialSlug || !current) {
        return (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
                No graph data available.
            </div>
        );
    }

    // ── Mobile branch — focused-entry hero + grouped neighbor lists ────────────

    if (!isDesktop) {
        return (
            <MobileGraphView
                history={history}
                current={current}
                onBack={back}
                onNavigate={navigate}
            />
        );
    }

    // ── Desktop — visual graph canvas ──────────────────────────────────────────

    if (!layout) {
        return (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
                No graph data available.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[460px]">
            {/* Trail strip — full width */}
            <TrailStrip
                history={history}
                current={current}
                future={future}
                onBack={back}
                onForward={forward}
                onJump={jumpToHistory}
            />

            {/* Two-column row: viewport + right rail */}
            <div className="flex-1 flex min-h-0">
                <PannableViewport
                    viewportRef={viewportRef}
                    planeRef={planeRef}
                    viewportClassName="relative flex-1 min-w-0 overflow-hidden"
                    planeClassName="absolute top-0 left-0"
                    view={view}
                    animate={animate}
                    planeWidth={layout.canvasW}
                    planeHeight={layout.canvasH}
                    onPointerDown={handleViewportPointerDown}
                    onPointerMove={handleViewportPointerMove}
                    onPointerUp={handleViewportPointerUp}
                    onPointerCancel={handleViewportPointerCancel}
                    overlays={
                        <>
                            <NodeFinder search={nodeFinderSearch} onSelect={navigate} />
                            <RelationLegend activeRels={activeRels} />
                            <ZoomControls
                                onZoomIn={() => zoomAroundCenter(1.25)}
                                onZoomOut={() => zoomAroundCenter(1 / 1.25)}
                                onFit={() => fitView(true)}
                            />
                        </>
                    }
                >
                    {/* Lane labels */}
                    <LaneLabel side="W" top={layout.cy + 70}              left={-30} />
                    <LaneLabel side="E" top={layout.cy - 70}              left={layout.canvasW - 30} />
                    <LaneLabel side="N" top={GG.pad + GG.nodeH + 12}     left={layout.cx - 50} />
                    <LaneLabel side="S" top={layout.canvasH - GG.pad - GG.nodeH - 22} left={layout.cx - 70} />

                    <EdgesLayer positions={layout.positions} layout={layout} hoverSlug={hover} />
                    <CenterCard slug={current} layout={layout} />

                    {layout.positions.map((pos) => (
                        <NeighborCard
                            key={`n-${pos.slug}-${pos.rel}`}
                            pos={pos}
                            isHovered={hover === pos.slug}
                            isDimmed={hover !== null && hover !== pos.slug}
                            onClick={navigate}
                            onHover={setHover}
                        />
                    ))}
                </PannableViewport>

                {/* Right rail — focused entry details; previews hovered neighbour */}
                <aside className="w-[300px] shrink-0 border-l border-border overflow-y-auto p-5 bg-surface">
                    <FocusedEntryPanel
                        slug={hover ?? current}
                        isPreview={hover != null && hover !== current}
                    />
                </aside>
            </div>
        </div>
    );
}
