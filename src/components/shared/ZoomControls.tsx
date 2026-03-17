import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onActual: () => void;
    zoomPercent?: number;
}

const btn =
    "rounded-md bg-background/80 backdrop-blur-sm border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-background transition-colors";

export default function ZoomControls({
    onZoomIn,
    onZoomOut,
    onFit,
    onActual,
    zoomPercent,
}: ZoomControlsProps) {
    return (
        <div className="flex items-center gap-1">
            <button type="button" onClick={onZoomIn} className={btn} title="Zoom In">
                <ZoomIn size={14} />
            </button>
            <button type="button" onClick={onZoomOut} className={btn} title="Zoom Out">
                <ZoomOut size={14} />
            </button>
            <button type="button" onClick={onFit} className={btn} title="Fit to Screen">
                <Maximize size={14} />
            </button>
            <button
                type="button"
                onClick={onActual}
                className="rounded-md bg-background/80 backdrop-blur-sm border border-border px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                title="Zoom to 100%"
            >
                1:1
            </button>
            {zoomPercent !== undefined && (
                <div className="rounded-md bg-background/80 backdrop-blur-sm border border-border px-2 py-1 text-[11px] text-muted-foreground min-w-[3.5rem] text-center">
                    {zoomPercent}%
                </div>
            )}
        </div>
    );
}
