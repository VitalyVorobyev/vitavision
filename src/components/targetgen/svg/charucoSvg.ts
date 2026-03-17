import type { CharucoConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { loadDictionary, decodeMarker } from "../aruco";
import { svgDocument, rect } from "./svgUtils";

/**
 * Generate a complete ChArUco board SVG with actual ArUco markers.
 *
 * Markers are placed in white squares (where (row + col) is odd),
 * numbered sequentially row by row left to right.
 */
export async function charucoSvg(
    config: CharucoConfig,
    page: PageDimensions,
): Promise<string> {
    const dict = await loadDictionary(config.dictionary);

    const sq = config.squareSizeMm;
    const boardW = config.cols * sq;
    const boardH = config.rows * sq;
    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const parts: string[] = [];
    // White background for the board
    parts.push(rect(ox, oy, boardW, boardH, "#ffffff"));

    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;
    let markerIdx = 0;

    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            const cellX = ox + c * sq;
            const cellY = oy + r * sq;

            if ((r + c) % 2 === 0) {
                // Black square
                parts.push(rect(cellX, cellY, sq, sq, "#000000"));
                if (innerSq > 0) {
                    const off = (sq - innerSq) / 2;
                    parts.push(rect(cellX + off, cellY + off, innerSq, innerSq, "#ffffff"));
                }
            } else {
                // White square — draw ArUco marker
                if (markerIdx < dict.codes.length) {
                    renderMarker(parts, dict.codes[markerIdx], dict.markerSize,
                        config.borderBits, cellX, cellY, sq, config.markerSizeRel);
                }
                markerIdx++;
            }
        }
    }

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}

function renderMarker(
    parts: string[],
    hexCode: string,
    markerSize: number,
    borderBits: number,
    cellX: number,
    cellY: number,
    squareSizeMm: number,
    markerSizeRel: number,
): void {
    const grid = decodeMarker(hexCode, markerSize);
    const totalCells = markerSize + 2 * borderBits;
    const markerMm = squareSizeMm * markerSizeRel;
    const cellMm = markerMm / totalCells;
    const offset = (squareSizeMm - markerMm) / 2;
    const mx = cellX + offset;
    const my = cellY + offset;

    // Draw marker background (black border)
    parts.push(rect(mx, my, markerMm, markerMm, "#000000"));

    // Draw inner cells — only white cells need to be drawn over the black background
    for (let r = 0; r < markerSize; r++) {
        for (let c = 0; c < markerSize; c++) {
            if (!grid[r][c]) {
                // White cell
                const cx = mx + (borderBits + c) * cellMm;
                const cy = my + (borderBits + r) * cellMm;
                parts.push(rect(cx, cy, cellMm, cellMm, "#ffffff"));
            }
        }
    }
}
