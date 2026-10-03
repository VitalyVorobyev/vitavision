import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button, cn } from "@vitavision/ui";

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    /** Omit to hide the 1:1 button (canvases that have no pixel scale). */
    onActual?: () => void;
    zoomPercent?: number;
    touchFriendly?: boolean;
    /** `column` stacks the buttons, for a canvas corner overlay. Defaults to `row`. */
    orientation?: "row" | "column";
    /** Placement and spacing of the group, merged into its own classes (e.g. `absolute bottom-3 right-3`). */
    className?: string;
    /** Merged into every button, e.g. `size-11` for a 44px touch target. */
    buttonClassName?: string;
}

export default function ZoomControls({
    onZoomIn,
    onZoomOut,
    onFit,
    onActual,
    zoomPercent,
    touchFriendly = false,
    orientation = "row",
    className,
    buttonClassName,
}: ZoomControlsProps) {
    // Floating over the image: ui's secondary buttons, one size up for touch.
    const size = touchFriendly ? "md" : "sm";
    const iconOnly = cn(touchFriendly ? "px-2" : "px-1.5", buttonClassName);

    return (
        <div className={cn("flex gap-1", orientation === "column" ? "flex-col" : "items-center", className)}>
            <Button size={size} className={iconOnly} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in" icon={<ZoomIn />} />
            <Button size={size} className={iconOnly} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out" icon={<ZoomOut />} />
            <Button size={size} className={iconOnly} onClick={onFit} aria-label="Fit to screen" title="Fit to screen" icon={<Maximize />} />
            {onActual && (
                <Button size={size} className={cn("px-2 font-mono", buttonClassName)} onClick={onActual} aria-label="Zoom to 100%" title="Zoom to 100%">
                    1:1
                </Button>
            )}
            {zoomPercent !== undefined && (
                <div
                    data-testid="zoom-readout"
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
