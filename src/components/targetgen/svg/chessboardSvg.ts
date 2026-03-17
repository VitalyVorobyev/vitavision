import type { ChessboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect } from "./svgUtils";

export function chessboardSvg(
    config: ChessboardConfig,
    page: PageDimensions,
): string {
    const totalCols = config.innerCols + 1;
    const totalRows = config.innerRows + 1;
    const sq = config.squareSizeMm;
    const boardW = totalCols * sq;
    const boardH = totalRows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const rects: string[] = [];
    // White background for the board area
    rects.push(rect(ox, oy, boardW, boardH, "#ffffff"));

    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if ((r + c) % 2 === 0) {
                const cx = ox + c * sq;
                const cy = oy + r * sq;
                rects.push(rect(cx, cy, sq, sq, "#000000"));
                if (innerSq > 0) {
                    const off = (sq - innerSq) / 2;
                    rects.push(rect(cx + off, cy + off, innerSq, innerSq, "#ffffff"));
                }
            }
        }
    }

    return svgDocument(page.widthMm, page.heightMm, rects.join(""));
}
