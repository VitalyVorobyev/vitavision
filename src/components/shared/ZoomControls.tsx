import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onActual: () => void;
    zoomPercent?: number;
    touchFriendly?: boolean;
}

export default function ZoomControls({
    onZoomIn,
    onZoomOut,
    onFit,
    onActual,
    zoomPercent,
    touchFriendly = false,
}: ZoomControlsProps) {
    const btn =
        `rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground ${
            touchFriendly ? "p-2.5" : "p-1.5"
        }`;
    const iconSize = touchFriendly ? 18 : 14;

    return (
        <div className="flex items-center gap-1">
            <button type="button" onClick={onZoomIn} className={btn} title="Zoom In">
                <ZoomIn size={iconSize} />
            </button>
            <button type="button" onClick={onZoomOut} className={btn} title="Zoom Out">
                <ZoomOut size={iconSize} />
            </button>
            <button type="button" onClick={onFit} className={btn} title="Fit to Screen">
                <Maximize size={iconSize} />
            </button>
            <button
                type="button"
                onClick={onActual}
                className={`rounded-md border border-border bg-background/80 font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground ${
                    touchFriendly ? "px-2.5 py-2 text-xs" : "px-1.5 py-1 text-[11px]"
                }`}
                title="Zoom to 100%"
            >
                1:1
            </button>
            {zoomPercent !== undefined && (
                <div className={`min-w-[3.5rem] rounded-md border border-border bg-background/80 text-center text-muted-foreground backdrop-blur-sm ${
                    touchFriendly ? "px-3 py-2 text-xs" : "px-2 py-1 text-[11px]"
                }`}>
                    {zoomPercent}%
                </div>
            )}
        </div>
    );
}
