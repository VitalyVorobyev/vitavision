// NetworkCanvas — the pannable/zoomable SVG canvas: two stacked SVG layers
// (edges, then nodes+labels) inside `PannableViewport`'s transformed plane,
// plus a thin hover-highlight layer. Owns click-vs-drag detection (a real
// drag pans; a plain tap/click on empty canvas clears focus), the
// Escape-clears-focus keyboard shortcut, and two-finger pinch-to-zoom.
//
// Adapter notes:
// - `PannableViewport`'s outer div doesn't accept extra props
//   (role/tabIndex/onKeyDown), so this component wraps it in its own div for
//   those, rather than editing the shared component other Atlas graph views
//   depend on.
// - `useViewport` has no pinch-to-zoom of its own — only single-pointer pan
//   and a desktop wheel handler — so a second concurrent touch pointer is
//   tracked here and drives `onPinchZoom` directly, bypassing the hook's
//   pan handlers entirely for the gesture's duration (forwarding both
//   fingers' move events to its single, pointer-id-unaware `panState` would
//   fight the pinch math and jitter the view).

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { PannableViewport } from "../../atlas/graph/PannableViewport.tsx";
import type { ViewportBounds, ViewportState } from "../../../lib/graph/useViewport.ts";
import { NetworkEdges } from "./NetworkEdges.tsx";
import { NetworkNodes, type RenderNode } from "./NetworkNodes.tsx";
import { HoverHighlight } from "./HoverHighlight.tsx";
import type { NetworkPoint } from "./networkTypes.ts";
import type { PlacedLabel } from "../../../lib/atlas/peopleNetwork.ts";

const DRAG_THRESHOLD_PX = 4;

export interface NetworkCanvasProps {
    viewportRef: RefObject<HTMLDivElement | null>;
    planeRef: RefObject<HTMLDivElement | null>;
    view: ViewportState;
    animate: boolean;
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
    bounds: ViewportBounds;
    edges: [string, string, number][];
    positions: Map<string, NetworkPoint>;
    renderNodes: RenderNode[];
    labels: PlacedLabel[];
    adjacency: Map<string, { peer: string; shared: number }[]>;
    ringIds: Set<string>;
    focusId: string | undefined;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
    onClear: () => void;
    /** Called with a scale multiplier (>1 zooms in) while a two-finger pinch is in progress. */
    onPinchZoom: (factor: number) => void;
    ariaLabel: string;
    overlays?: ReactNode;
}

export function NetworkCanvas({
    viewportRef,
    planeRef,
    view,
    animate,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    bounds,
    edges,
    positions,
    renderNodes,
    labels,
    adjacency,
    ringIds,
    focusId,
    hoveredId,
    onHover,
    onSelect,
    onClear,
    onPinchZoom,
    ariaLabel,
    overlays,
}: NetworkCanvasProps) {
    // `bounds` is already normalized to start at (0,0) by the container (see
    // PeopleNetwork's `nodes`/`bounds` comment) — plane-local pixels equal
    // content coordinates directly, matching `useViewport`'s assumption, so
    // the viewBox needs no offset.
    const planeWidth = bounds.maxX - bounds.minX;
    const planeHeight = bounds.maxY - bounds.minY;
    const viewBox = `0 0 ${planeWidth} ${planeHeight}`;

    const dragStart = useRef<{ x: number; y: number } | null>(null);

    // Two-finger pinch tracking — see the adapter note at the top of this file.
    const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchStartDist = useRef<number | null>(null);

    const handlePointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.pointerType === "touch") {
                activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (activeTouches.current.size === 2) {
                    // Second finger just landed — release any single-finger pan the
                    // hook may have started for the first, then start tracking pinch.
                    onPointerUp(e);
                    dragStart.current = null;
                    const [a, b] = [...activeTouches.current.values()];
                    pinchStartDist.current = Math.hypot(a.x - b.x, a.y - b.y);
                    return;
                }
                if (activeTouches.current.size > 2) return; // ignore a third touch point
            }
            const t = e.target as Element;
            const isBackground = t === viewportRef.current || t === planeRef.current;
            dragStart.current = isBackground ? { x: e.clientX, y: e.clientY } : null;
            onPointerDown(e);
        },
        [onPointerDown, onPointerUp, planeRef, viewportRef],
    );

    const handlePointerMove = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.pointerType === "touch" && activeTouches.current.has(e.pointerId)) {
                activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (activeTouches.current.size === 2 && pinchStartDist.current !== null) {
                    const [a, b] = [...activeTouches.current.values()];
                    const dist = Math.hypot(a.x - b.x, a.y - b.y);
                    const factor = dist / pinchStartDist.current;
                    if (Math.abs(factor - 1) > 0.015) {
                        onPinchZoom(factor);
                        pinchStartDist.current = dist;
                    }
                    return; // don't also forward to the hook's single-pointer pan
                }
            }
            onPointerMove(e);
        },
        [onPointerMove, onPinchZoom],
    );

    const endTouch = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "touch") {
            activeTouches.current.delete(e.pointerId);
            if (activeTouches.current.size < 2) pinchStartDist.current = null;
        }
    }, []);

    const handlePointerUp = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            endTouch(e);
            const start = dragStart.current;
            dragStart.current = null;
            onPointerUp(e);
            if (start) {
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) onClear();
            }
        },
        [onPointerUp, onClear, endTouch],
    );

    const handlePointerCancel = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            endTouch(e);
            dragStart.current = null;
            onPointerCancel(e);
        },
        [onPointerCancel, endTouch],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Escape" && focusId !== undefined) onClear();
        },
        [focusId, onClear],
    );

    return (
        <div
            role="application"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="relative w-full h-full outline-none"
        >
            <PannableViewport
                viewportRef={viewportRef}
                planeRef={planeRef}
                viewportClassName="relative w-full h-full overflow-hidden"
                planeClassName="absolute top-0 left-0"
                view={view}
                animate={animate}
                planeWidth={planeWidth}
                planeHeight={planeHeight}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                overlays={overlays}
            >
                <svg
                    width={planeWidth}
                    height={planeHeight}
                    viewBox={viewBox}
                    className="absolute inset-0"
                    style={{ pointerEvents: "none", overflow: "visible" }}
                    aria-hidden="true"
                >
                    <NetworkEdges edges={edges} positions={positions} focusId={focusId} ringIds={ringIds} />
                    <HoverHighlight hoveredId={hoveredId} adjacency={adjacency} positions={positions} />
                </svg>
                <svg
                    width={planeWidth}
                    height={planeHeight}
                    viewBox={viewBox}
                    className="absolute inset-0"
                    style={{ pointerEvents: "none", overflow: "visible" }}
                    aria-hidden="true"
                >
                    <NetworkNodes
                        nodes={renderNodes}
                        labels={labels}
                        hoveredId={hoveredId}
                        onHover={onHover}
                        onSelect={onSelect}
                        scale={view.scale}
                        twoTapToFocus={focusId !== undefined}
                    />
                </svg>
            </PannableViewport>
        </div>
    );
}
