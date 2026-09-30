import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button, cn } from "@vitavision/ui";

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
    // Floating over the image: ui's secondary buttons, one size up for touch.
    const size = touchFriendly ? "md" : "sm";
    const iconOnly = touchFriendly ? "px-2" : "px-1.5";

    return (
        <div className="flex items-center gap-1">
            <Button size={size} className={iconOnly} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in" icon={<ZoomIn />} />
            <Button size={size} className={iconOnly} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out" icon={<ZoomOut />} />
            <Button size={size} className={iconOnly} onClick={onFit} aria-label="Fit to screen" title="Fit to screen" icon={<Maximize />} />
            <Button size={size} className="px-2 font-mono" onClick={onActual} aria-label="Zoom to 100%" title="Zoom to 100%">
                1:1
            </Button>
            {zoomPercent !== undefined && (
                <div
                    className={cn(
                        "flex min-w-[3.5rem] items-center justify-center rounded-control border border-line bg-surface font-mono text-fg-muted tabular-nums",
                        touchFriendly ? "h-8 px-3 text-xs" : "h-7 px-2 text-[11px]",
                    )}
                >
                    {zoomPercent}%
                </div>
            )}
        </div>
    );
}
