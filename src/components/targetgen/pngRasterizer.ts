/**
 * Rasterizes an SVG string (with mm units) to a PNG Blob via an offscreen canvas.
 */
export async function rasterizeSvgToPng(
    svg: string,
    dpi = 300,
): Promise<Blob> {
    // Extract mm dimensions from the SVG
    const wMatch = svg.match(/width="([\d.]+)mm"/);
    const hMatch = svg.match(/height="([\d.]+)mm"/);
    if (!wMatch || !hMatch) throw new Error("Could not parse SVG dimensions");

    const widthMm = parseFloat(wMatch[1]);
    const heightMm = parseFloat(hMatch[1]);
    const widthPx = Math.round((widthMm * dpi) / 25.4);
    const heightPx = Math.round((heightMm * dpi) / 25.4);

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, widthPx, heightPx);
        ctx.drawImage(img, 0, 0, widthPx, heightPx);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
                "image/png",
            );
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}
