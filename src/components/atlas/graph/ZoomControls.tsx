// Zoom in / zoom out / fit-to-view button stack — extracted from GraphExplorer.tsx.

import { Maximize2 } from "lucide-react";

export interface ZoomControlsProps {
    onZoomIn:  () => void;
    onZoomOut: () => void;
    onFit:     () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
    const btnCls = "w-7 h-7 grid place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm transition-colors";
    return (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button type="button" onClick={onZoomIn}  className={btnCls} title="Zoom in">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button type="button" onClick={onZoomOut} className={btnCls} title="Zoom out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button type="button" onClick={onFit}     className={btnCls} title="Fit to view">
                <Maximize2 size={13} />
            </button>
        </div>
    );
}
