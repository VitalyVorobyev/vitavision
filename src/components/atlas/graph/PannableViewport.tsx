// PannableViewport — the pan/zoom viewport + transformed content plane
// shared by GraphExplorer and NarrativeCanvas. Wraps a `useViewport()`
// binding into the DOM structure both canvases render identically
// (background gradient + touch-action: none on the viewport div, the
// translate/scale transform on the plane div). Callers own their exact
// className strings so each canvas's rendered markup is unchanged.

import type { PointerEvent, ReactNode, RefObject } from "react";
import { GRAPH_CANVAS_GRADIENT } from "../../../lib/graph/graphTheme.ts";
import type { ViewportState } from "../../../lib/graph/useViewport.ts";

export interface PannableViewportProps {
    viewportRef: RefObject<HTMLDivElement | null>;
    planeRef:    RefObject<HTMLDivElement | null>;
    /** Exact className for the outer (viewport) div — callers differ here, so no default. */
    viewportClassName: string;
    /** Exact className for the inner (plane) div — callers differ here, so no default. */
    planeClassName: string;
    view:    ViewportState;
    animate: boolean;
    planeWidth:  number;
    planeHeight: number;
    onPointerDown:   (e: PointerEvent<HTMLDivElement>) => void;
    onPointerMove:   (e: PointerEvent<HTMLDivElement>) => void;
    onPointerUp:     (e: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
    /** Rendered inside the transformed plane. */
    children: ReactNode;
    /** Rendered as siblings of the plane, inside the viewport — not scaled/translated. */
    overlays?: ReactNode;
}

export function PannableViewport({
    viewportRef,
    planeRef,
    viewportClassName,
    planeClassName,
    view,
    animate,
    planeWidth,
    planeHeight,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    children,
    overlays,
}: PannableViewportProps) {
    return (
        <div
            ref={viewportRef}
            className={viewportClassName}
            style={{
                background:  GRAPH_CANVAS_GRADIENT,
                touchAction: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
        >
            <div
                ref={planeRef}
                className={planeClassName}
                style={{
                    width:           planeWidth,
                    height:          planeHeight,
                    transform:       `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    transformOrigin: "0 0",
                    transition:      animate ? "transform 280ms ease" : "none",
                }}
            >
                {children}
            </div>

            {overlays}
        </div>
    );
}
