// PeopleNetwork — interactive co-author network for the People view.
//
// Fetches its own data (`useScholarlyIndex` / `useAuthorsIndex`), resolves an
// alias id passed in `focusId` to its canonical id, and renders a
// self-contained panel: toolbar (search + Era + Labels) plus the pannable/
// zoomable SVG canvas with its overlays (legend, minimap, zoom buttons, and
// — when focused — a details card). Graph data derivation lives in
// `useNetworkLayout.ts`; pan/zoom + click/keyboard wiring lives in
// `NetworkCanvas.tsx`; pure layout/filter/search logic lives in
// `src/lib/atlas/peopleNetwork.ts`.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useScholarlyIndex } from "../../../lib/atlas/useScholarlyIndex.ts";
import { useAuthorsIndex } from "../../../lib/atlas/useAuthorsIndex.ts";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import { useViewport } from "../../../lib/graph/useViewport.ts";
import type { ViewportBounds } from "../../../lib/graph/useViewport.ts";
import {
    layoutLabels,
    reservedLabelBoxes,
    selectFocusLabelCandidates,
    selectOverviewLabelCandidates,
    type Era,
    type LabelMode,
} from "../../../lib/atlas/peopleNetwork.ts";
import { useNetworkLayout } from "./useNetworkLayout.ts";
import { NetworkCanvas } from "./NetworkCanvas.tsx";
import { NetworkToolbar } from "./NetworkToolbar.tsx";
import { FocusCard } from "./FocusCard.tsx";
import { Legend } from "./Legend.tsx";
import { Minimap } from "./Minimap.tsx";
import { ZoomButtons } from "./ZoomButtons.tsx";

export interface PeopleNetworkProps {
    /** Focused person (canonical author id) or undefined for the overview. */
    focusId: string | undefined;
    onFocusChange: (id: string | undefined) => void;
}

const FOCUS_MAX_SCALE = 3;

export default function PeopleNetwork({ focusId, onFocusChange }: PeopleNetworkProps) {
    const { index: scholarly, status } = useScholarlyIndex();
    const authorsIdx = useAuthorsIndex();
    const isPhone = useMediaQuery("(max-width: 767px)");

    const [era, setEra] = useState<Era>("all");
    const [labelMode, setLabelMode] = useState<LabelMode>("top20");
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const {
        effectiveFocusId,
        activeFocusId,
        focusPerson,
        nodes,
        edges,
        bounds,
        ties,
        ringIds,
        hotIds,
        positions,
        adjacency,
        renderNodes,
        labelPeople,
        cameraBounds,
    } = useNetworkLayout({ scholarly, authorsIdx, focusId, era });

    // Keep the URL/parent in sync when focusId turns out to be an alias.
    useEffect(() => {
        if (focusId && effectiveFocusId && effectiveFocusId !== focusId) onFocusChange(effectiveFocusId);
    }, [focusId, effectiveFocusId, onFocusChange]);

    // ── Pan/zoom ─────────────────────────────────────────────────────────────
    //
    // The camera target IS the `bounds` fed to `useViewport` (`cameraBounds`
    // from `useNetworkLayout`). Its own auto-fit effect (keyed on `refitKey`)
    // then does all the fitting — animated on a focus transition, instant on
    // resize. This (rather than a second effect calling `fitBounds`
    // manually) avoids a race between two effects fighting over view state.
    const viewportBounds = scholarly ? cameraBounds : null;
    const fitScaleMax = activeFocusId ? FOCUS_MAX_SCALE : 1.6;

    const {
        viewportRef,
        planeRef,
        view,
        animate,
        vp,
        fitView,
        zoomAroundCenter,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
    } = useViewport({
        bounds: viewportBounds,
        refitKey: activeFocusId ?? "overview",
        fitScaleMin: 0.25,
        fitScaleMax,
        zoomScaleMin: 0.2,
        zoomScaleMax: 4,
    });

    // Overlays (legend, minimap, focus card) have a FIXED screen-pixel size,
    // but label placement works in content units — so convert using the fit
    // scale this camera box will render at (mirrors `useViewport.fitBounds`'s
    // own `min(vpW/bboxW, vpH/bboxH)`, clamped the same way) rather than a
    // fraction of the box, which would drastically over/under-reserve space
    // between the overview's wide box and a focused person's tight one.
    const contentPerScreenPx = useMemo(() => {
        if (vp.w === 0 || vp.h === 0) return 1;
        const bboxW = cameraBounds.maxX - cameraBounds.minX + 128;
        const bboxH = cameraBounds.maxY - cameraBounds.minY + 128;
        const approxScale = Math.min(fitScaleMax, Math.max(0.25, Math.min(vp.w / bboxW, vp.h / bboxH)));
        return 1 / approxScale;
    }, [vp, cameraBounds, fitScaleMax]);

    const labels = useMemo(() => {
        // Inset the placement canvas a little further than the fitted camera
        // box so labels don't land right at the edge the viewport clips to.
        const margin = 24 * contentPerScreenPx;
        const canvas: ViewportBounds = {
            minX: cameraBounds.minX + margin,
            minY: cameraBounds.minY + margin,
            maxX: cameraBounds.maxX - margin,
            maxY: cameraBounds.maxY - margin,
        };
        const reserved = reservedLabelBoxes(canvas, Boolean(activeFocusId), contentPerScreenPx);
        const candidates = activeFocusId
            ? selectFocusLabelCandidates(labelPeople, activeFocusId, ties, labelMode)
            : selectOverviewLabelCandidates(labelPeople, labelMode);
        return layoutLabels(candidates, canvas, reserved);
    }, [labelPeople, activeFocusId, ties, labelMode, cameraBounds, contentPerScreenPx]);

    const nameOf = useCallback((id: string) => authorsIdx.authors[id]?.name ?? id, [authorsIdx]);
    const groupOf = useCallback((id: string) => scholarly?.authors[id]?.group ?? ("other" as const), [scholarly]);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="w-full h-[min(72vh,620px)] md:h-[700px] rounded-lg border border-border bg-surface overflow-hidden flex flex-col">
            <NetworkToolbar
                scholarly={{ authors: scholarly?.authors ?? {} }}
                authorsIdx={{ authors: authorsIdx.authors }}
                onSelectPerson={onFocusChange}
                era={era}
                onEraChange={setEra}
                labelMode={labelMode}
                onLabelModeChange={setLabelMode}
            />
            <div className="relative flex-1 min-h-0">
                {/*
                 * NetworkCanvas (and the PannableViewport/viewportRef it owns) is ALWAYS
                 * mounted, even before data loads — `useViewport`'s one-time ResizeObserver
                 * mount effect measures `viewportRef.current` synchronously on first commit,
                 * and an element that doesn't exist yet on that first commit never gets
                 * measured (the effect has an empty dep array, so it never gets a second
                 * chance). Swapping the canvas out for a loading placeholder and back in
                 * once `status` flips to "ready" would leave `vp` permanently {w:0,h:0},
                 * silently no-opping every future fit. The loading/error state is instead a
                 * transparent overlay on top of the (empty) canvas.
                 */}
                <NetworkCanvas
                    viewportRef={viewportRef}
                    planeRef={planeRef}
                    view={view}
                    animate={animate}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    bounds={bounds}
                    edges={edges}
                    positions={positions}
                    renderNodes={renderNodes}
                    labels={labels}
                    adjacency={adjacency}
                    ringIds={ringIds}
                    focusId={activeFocusId}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    onSelect={onFocusChange}
                    onClear={() => onFocusChange(undefined)}
                    onPinchZoom={zoomAroundCenter}
                    ariaLabel={
                        activeFocusId
                            ? `Co-author network focused on ${nameOf(activeFocusId)}, coloured by community`
                            : "Co-author network across the Atlas, coloured by community"
                    }
                    overlays={
                        <>
                            {!isPhone && (
                                <Minimap
                                    nodes={nodes}
                                    groupOf={groupOf}
                                    bounds={bounds}
                                    view={view}
                                    vp={vp}
                                    dimId={(id) => Boolean(activeFocusId) && !hotIds.has(id)}
                                />
                            )}
                            <Legend isPhone={isPhone} />
                            <ZoomButtons onZoomIn={() => zoomAroundCenter(1.25)} onZoomOut={() => zoomAroundCenter(1 / 1.25)} onFit={() => fitView(true)} />
                            {activeFocusId && focusPerson && (
                                <FocusCard
                                    id={activeFocusId}
                                    name={nameOf(activeFocusId)}
                                    paperCount={authorsIdx.authors[activeFocusId]?.papers.length ?? 0}
                                    pageCount={focusPerson.pageCount}
                                    ties={ties}
                                    nameOf={nameOf}
                                    isPhone={isPhone}
                                    onClose={() => onFocusChange(undefined)}
                                />
                            )}
                        </>
                    }
                />
                {status === "error" && (
                    <div className="absolute inset-0 grid place-items-center bg-surface/80 text-sm text-muted-foreground">
                        Couldn&apos;t load the co-author network.
                    </div>
                )}
                {status !== "ready" && status !== "error" && (
                    <div className="absolute inset-0 grid place-items-center bg-surface/80 text-sm text-muted-foreground">
                        Loading co-author network…
                    </div>
                )}
            </div>
        </div>
    );
}
