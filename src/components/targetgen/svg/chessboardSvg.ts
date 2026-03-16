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

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if ((r + c) % 2 === 0) {
                rects.push(rect(ox + c * sq, oy + r * sq, sq, sq, "#000000"));
            }
        }
    }

    return svgDocument(page.widthMm, page.heightMm, rects.join(""));
}
