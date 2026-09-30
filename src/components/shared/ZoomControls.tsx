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
        `rounded-control border border-line bg-ground/80 text-fg-muted backdrop-blur-sm transition-colors hover:bg-ground hover:text-fg ${
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
                className={`rounded-control border border-line bg-ground/80 font-medium text-fg-muted backdrop-blur-sm transition-colors hover:bg-ground hover:text-fg ${
                    touchFriendly ? "px-2.5 py-2 text-xs" : "px-1.5 py-1 text-[11px]"
                }`}
                title="Zoom to 100%"
            >
                1:1
            </button>
            {zoomPercent !== undefined && (
                <div className={`min-w-[3.5rem] rounded-control border border-line bg-ground/80 text-center text-fg-muted backdrop-blur-sm ${
                    touchFriendly ? "px-3 py-2 text-xs" : "px-2 py-1 text-[11px]"
                }`}>
                    {zoomPercent}%
                </div>
            )}
        </div>
    );
}
