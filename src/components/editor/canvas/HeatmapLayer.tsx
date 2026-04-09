import { useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import { useShallow } from "zustand/react/shallow";

import { useEditorStore } from "../../../store/editor/useEditorStore";

function buildCanvas(rgba: Uint8Array, width: number, height: number): HTMLCanvasElement | null {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const clamped = new Uint8ClampedArray(width * height * 4);
    clamped.set(rgba);
    ctx.putImageData(new ImageData(clamped, width, height), 0, 0);
    return canvas;
}

export default function HeatmapLayer() {
    const { heatmapData, heatmapVisible, heatmapOpacity } = useEditorStore(useShallow((s) => ({
        heatmapData: s.heatmapData,
        heatmapVisible: s.heatmapVisible,
        heatmapOpacity: s.heatmapOpacity,
    })));

    const canvasImage = useMemo(
        () => heatmapData ? buildCanvas(heatmapData.rgba, heatmapData.width, heatmapData.height) : null,
        [heatmapData],
    );

    if (!canvasImage || !heatmapVisible) return null;

    return (
        <KonvaImage
            image={canvasImage}
            width={canvasImage.width}
            height={canvasImage.height}
            opacity={heatmapOpacity}
            listening={false}
        />
    );
}
