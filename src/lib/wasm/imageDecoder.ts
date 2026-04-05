/** Decode an image URL to raw RGBA pixel data using OffscreenCanvas. */

export interface DecodedImage {
    pixels: Uint8Array;
    width: number;
    height: number;
}

export async function decodeImageUrl(imageSrc: string): Promise<DecodedImage> {
    const response = await fetch(imageSrc);
    if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    return decodeImageBlob(blob);
}

export async function decodeImageBlob(blob: Blob): Promise<DecodedImage> {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create OffscreenCanvas 2D context");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    return { pixels: new Uint8Array(imageData.data.buffer), width, height };
}
