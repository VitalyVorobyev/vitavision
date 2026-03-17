import type { MarkerBoardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect, circle } from "./svgUtils";

/** Derive circle fill from square color — always contrasting. */
function circleColor(i: number, j: number): string {
    return (i + j) % 2 === 0 ? "#ffffff" : "#000000";
}

export function markerboardSvg(
    config: MarkerBoardConfig,
    page: PageDimensions,
): string {
    const totalCols = config.innerCols + 1;
    const totalRows = config.innerRows + 1;
    const sq = config.squareSizeMm;
    const boardW = totalCols * sq;
    const boardH = totalRows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const parts: string[] = [];
    parts.push(rect(ox, oy, boardW, boardH, "#ffffff"));

    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if ((r + c) % 2 === 0) {
                const cellX = ox + c * sq;
                const cellY = oy + r * sq;
                parts.push(rect(cellX, cellY, sq, sq, "#000000"));
                if (innerSq > 0) {
                    const off = (sq - innerSq) / 2;
                    parts.push(rect(cellX + off, cellY + off, innerSq, innerSq, "#ffffff"));
                }
            }
        }
    }

    // Draw circles — polarity derived from square color
    const circR = (sq * config.circleDiameterRel) / 2;
    for (const circ of config.circles) {
        const cx = ox + circ.cell.j * sq + sq / 2;
        const cy = oy + circ.cell.i * sq + sq / 2;
        parts.push(circle(cx, cy, circR, circleColor(circ.cell.i, circ.cell.j)));
    }

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}
