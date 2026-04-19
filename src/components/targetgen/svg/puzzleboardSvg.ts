import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument } from "./svgUtils";
import { generatePuzzleboardPngWasm } from "../../../lib/wasm/wasmWorkerProxy";

/** Fixed upstream: 5mm margin on each side; dot diameter = 1/3 of square edge. */
const MARGIN_MM = 5;

/**
 * Encode a Uint8Array as base64 without hitting the call-stack limit that
 * `btoa(String.fromCharCode(...bytes))` hits for large arrays.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

/**
 * Returns an SVG string with the board PNG embedded as a base64 data URI.
 *
 * The wrapper SVG uses mm units so the downstream rasterizer (`rasterizeSvgToPng`)
 * sizes the output correctly. The embedded PNG already has its own resolution
 * (controlled by `config.pngDpi`); the wrapper's raster DPI sets the bounding-box
 * pixel density for the SVG shell, not the pattern itself.
 */
export async function puzzleboardSvg(config: PuzzleboardConfig, page: PageDimensions): Promise<string> {
    const { png } = await generatePuzzleboardPngWasm(config.rows, config.cols, config.cellSizeMm, config.pngDpi);

    const boardW = config.cols * config.cellSizeMm + 2 * MARGIN_MM;
    const boardH = config.rows * config.cellSizeMm + 2 * MARGIN_MM;

    const printW = page.widthMm - 2 * page.marginMm;
    const printH = page.heightMm - 2 * page.marginMm;

    // Centre the board on the printable area
    const scale = Math.min(printW / boardW, printH / boardH, 1);
    const imgW = boardW * scale;
    const imgH = boardH * scale;
    const x = page.marginMm + (printW - imgW) / 2;
    const y = page.marginMm + (printH - imgH) / 2;

    const b64 = uint8ArrayToBase64(png);
    const dataUri = `data:image/png;base64,${b64}`;

    const image = `<image x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${imgW.toFixed(3)}" height="${imgH.toFixed(3)}" preserveAspectRatio="xMidYMid meet" href="${dataUri}"/>`;

    return svgDocument(page.widthMm, page.heightMm, image);
}
