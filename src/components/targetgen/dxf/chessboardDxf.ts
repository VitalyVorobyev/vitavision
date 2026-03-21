import type { ChessboardConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { dxfFilledRect, dxfFilledRectWithHole } from "./dxfWriter";

export function chessboardDxf(
    config: ChessboardConfig,
    page: PageDimensions,
): string[] {
    const totalCols = config.innerCols + 1;
    const totalRows = config.innerRows + 1;
    const sq = config.squareSizeMm;
    const boardW = totalCols * sq;
    const boardH = totalRows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const flipY = (svgY: number) => page.heightMm - svgY;
    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;
    const innerOff = (sq - innerSq) / 2;

    const entities: string[] = [];

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if ((r + c) % 2 !== 0) continue;

            const cellX = ox + c * sq;
            const cellY = oy + r * sq;
            const dxfY = flipY(cellY + sq);

            if (innerSq > 0) {
                entities.push(
                    dxfFilledRectWithHole(
                        cellX,
                        dxfY,
                        sq,
                        sq,
                        cellX + innerOff,
                        flipY(cellY + innerOff + innerSq),
                        innerSq,
                        innerSq,
                    ),
                );
            } else {
                entities.push(dxfFilledRect(cellX, dxfY, sq, sq));
            }
        }
    }

    return entities;
}
