import { useImperativeHandle, type Ref } from "react";

import { usePixelSampler } from "../hooks/usePixelSampler";

/** What the stage tells the readout: where the pointer is over the image, in stage coordinates, or `null` off it. */
export interface PixelReadoutHandle {
    hover: (point: { x: number; y: number } | null) => void;
}

interface PixelReadoutProps {
    imageSrc: string | null;
    imageWidth: number;
    imageHeight: number;
    /** Hide the readout while something else owns the corner (a feature tooltip). */
    suppressed: boolean;
    ref: Ref<PixelReadoutHandle>;
}

/**
 * The pixel under the pointer: image x, y (the centre of pixel `i` is `i`) and its luma. It keeps its
 * own state and is driven through a handle, so a pointer move re-renders this box and not the canvas.
 */
export default function PixelReadout({ imageSrc, imageWidth, imageHeight, suppressed, ref }: PixelReadoutProps) {
    const { hoverPixel, sampleAt, clearPixel } = usePixelSampler(imageSrc, imageWidth, imageHeight);
    useImperativeHandle(ref, () => ({ hover: (point) => (point ? sampleAt(point) : clearPixel()) }));

    if (!hoverPixel || suppressed) return null;
    return (
        <div
            data-testid="editor-pixel-readout"
            className="absolute top-4 left-4 z-20 bg-ground/90 border border-line backdrop-blur-sm p-2 rounded-control shadow-xs text-xs font-mono flex items-center space-x-4 pointer-events-none"
        >
            <div>
                <span className="text-fg-muted">X:</span> {hoverPixel.x.toFixed(2)} <span className="text-fg-muted">Y:</span> {hoverPixel.y.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-fg-muted">|</span>
                <span>{Math.round(0.299 * hoverPixel.r + 0.587 * hoverPixel.g + 0.114 * hoverPixel.b)}</span>
            </div>
        </div>
    );
}
