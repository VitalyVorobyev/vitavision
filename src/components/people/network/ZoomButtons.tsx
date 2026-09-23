// ZoomButtons — 44px zoom in / out / fit stack for the People network canvas.
//
// A local sibling of `src/components/atlas/graph/ZoomControls.tsx` rather than
// a reuse of it: that component hardcodes 28px (`w-7 h-7`) buttons, which is
// below the 44px touch-target minimum this canvas needs (it supports pinch/
// drag pan and tap-to-focus on phones, unlike the desktop-only GraphExplorer).
// Same callback shape (`onZoomIn`/`onZoomOut`/`onFit`) for consistency.

import { Maximize2, Minus, Plus } from "lucide-react";

export interface ZoomButtonsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
}

export function ZoomButtons({ onZoomIn, onZoomOut, onFit }: ZoomButtonsProps) {
    const btnCls =
        "w-11 h-11 grid place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm transition-colors";
    return (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
            <button type="button" onClick={onZoomIn} className={btnCls} aria-label="Zoom in" title="Zoom in">
                <Plus size={16} />
            </button>
            <button type="button" onClick={onZoomOut} className={btnCls} aria-label="Zoom out" title="Zoom out">
                <Minus size={16} />
            </button>
            <button type="button" onClick={onFit} className={btnCls} aria-label="Fit to view" title="Fit to view">
                <Maximize2 size={16} />
            </button>
        </div>
    );
}
