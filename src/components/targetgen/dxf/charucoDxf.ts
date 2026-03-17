import type { CharucoConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { dxfLine, dxfRect, buildDxf } from "./dxfWriter";

export function charucoDxf(
    config: CharucoConfig,
    page: PageDimensions,
): string {
    const sq = config.squareSizeMm;
    const boardW = config.cols * sq;
    const boardH = config.rows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const flipY = (svgY: number) => page.heightMm - svgY;

    const entities: string[] = [];

    // Outer board rectangle
    entities.push(...dxfRect(ox, flipY(oy + boardH), boardW, boardH));

    // Vertical grid lines (interior)
    for (let c = 1; c < config.cols; c++) {
        const x = ox + c * sq;
        entities.push(dxfLine(x, flipY(oy), x, flipY(oy + boardH)));
    }

    // Horizontal grid lines (interior)
    for (let r = 1; r < config.rows; r++) {
        const y = oy + r * sq;
        entities.push(dxfLine(ox, flipY(y), ox + boardW, flipY(y)));
    }

    // Marker outlines in white squares, inner squares in black squares
    const markerMm = sq * config.markerSizeRel;
    const markerOff = (sq - markerMm) / 2;
    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;
    const innerOff = (sq - innerSq) / 2;

    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            if ((r + c) % 2 === 1) {
                // White square — marker outline
                const mx = ox + c * sq + markerOff;
                const my = oy + r * sq + markerOff;
                entities.push(...dxfRect(mx, flipY(my + markerMm), markerMm, markerMm));
            } else if (innerSq > 0) {
                // Black square — inner square outline
                const ix = ox + c * sq + innerOff;
                const iy = oy + r * sq + innerOff;
                entities.push(...dxfRect(ix, flipY(iy + innerSq), innerSq, innerSq));
            }
        }
    }

    return buildDxf(entities);
}
