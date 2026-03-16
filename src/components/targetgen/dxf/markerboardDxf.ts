import type { MarkerBoardConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { dxfLine, dxfCircle, dxfRect, buildDxf } from "./dxfWriter";

export function markerboardDxf(
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

    const flipY = (svgY: number) => page.heightMm - svgY;

    const entities: string[] = [];

    // Outer board rectangle
    entities.push(...dxfRect(ox, flipY(oy + boardH), boardW, boardH));

    // Vertical grid lines (interior)
    for (let c = 1; c < totalCols; c++) {
        const x = ox + c * sq;
        entities.push(dxfLine(x, flipY(oy), x, flipY(oy + boardH)));
    }

    // Horizontal grid lines (interior)
    for (let r = 1; r < totalRows; r++) {
        const y = oy + r * sq;
        entities.push(dxfLine(ox, flipY(y), ox + boardW, flipY(y)));
    }

    // Inner squares in black squares
    if (config.innerSquareRel > 0) {
        const innerSq = sq * config.innerSquareRel;
        const off = (sq - innerSq) / 2;
        for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
                if ((r + c) % 2 === 0) {
                    const ix = ox + c * sq + off;
                    const iy = oy + r * sq + off;
                    entities.push(...dxfRect(ix, flipY(iy + innerSq), innerSq, innerSq));
                }
            }
        }
    }

    // Circles from config
    const circR = (sq * config.circleDiameterRel) / 2;
    for (const circ of config.circles) {
        const cx = ox + circ.cell.j * sq + sq / 2;
        const cy = oy + circ.cell.i * sq + sq / 2;
        entities.push(dxfCircle(cx, flipY(cy), circR));
    }

    return buildDxf(entities);
}
