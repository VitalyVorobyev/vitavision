import { useEffect, useRef, useState } from "react";

export interface PixelInfo {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
}

export function usePixelSampler(
    imageSrc: string | null,
    imageWidth: number,
    imageHeight: number,
) {
    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoverPixel, setHoverPixel] = useState<PixelInfo | null>(null);

    useEffect(() => {
        if (!imageSrc || !imageWidth || !imageHeight) {
            hiddenCanvasRef.current = null;
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            hiddenCanvasRef.current = null;
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            hiddenCanvasRef.current = canvas;
        };
        img.src = imageSrc;
    }, [imageSrc, imageWidth, imageHeight]);

    const sampleAt = (pos: { x: number; y: number }) => {
        if (hiddenCanvasRef.current && pos.x >= 0 && pos.x < imageWidth && pos.y >= 0 && pos.y < imageHeight) {
            const ctx = hiddenCanvasRef.current.getContext("2d");
            if (ctx) {
                const px = Math.floor(pos.x);
                const py = Math.floor(pos.y);
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                setHoverPixel({ x: pos.x, y: pos.y, r: pixel[0], g: pixel[1], b: pixel[2] });
                return;
            }
        }
        setHoverPixel(null);
    };

    const clearPixel = () => setHoverPixel(null);

    return { hoverPixel, sampleAt, clearPixel };
}
