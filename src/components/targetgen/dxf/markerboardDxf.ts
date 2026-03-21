import type { MarkerBoardConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import {
    circleHoleBoundary,
    dxfFilledCircle,
    dxfFilledRect,
    dxfFilledRectWithVoids,
    outermostPolyline,
} from "./dxfWriter";

export function markerboardDxf(
    config: MarkerBoardConfig,
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
    const circR = (sq * config.circleDiameterRel) / 2;
    const circleKey = (row: number, col: number) => `${row}:${col}`;
    const circleSet = new Set(config.circles.map((circle) => circleKey(circle.cell.i, circle.cell.j)));

    const entities: string[] = [];

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            const cellX = ox + c * sq;
            const cellY = oy + r * sq;
            const isBlackCell = (r + c) % 2 === 0;

            if (isBlackCell) {
                const voids = [];
                if (innerSq > 0) {
                    voids.push(
                        outermostPolyline([
                            { x: cellX + innerOff, y: flipY(cellY + innerOff + innerSq) },
                            { x: cellX + innerOff + innerSq, y: flipY(cellY + innerOff + innerSq) },
                            { x: cellX + innerOff + innerSq, y: flipY(cellY + innerOff) },
                            { x: cellX + innerOff, y: flipY(cellY + innerOff) },
                        ]),
                    );
                }

                if (circleSet.has(circleKey(r, c))) {
                    voids.push(circleHoleBoundary(cellX + sq / 2, flipY(cellY + sq / 2), circR));
                }

                if (voids.length > 0) {
                    entities.push(
                        dxfFilledRectWithVoids(
                            cellX,
                            flipY(cellY + sq),
                            sq,
                            sq,
                            voids,
                        ),
                    );
                } else {
                    entities.push(dxfFilledRect(cellX, flipY(cellY + sq), sq, sq));
                }
                continue;
            }

            if (circleSet.has(circleKey(r, c))) {
                entities.push(dxfFilledCircle(cellX + sq / 2, flipY(cellY + sq / 2), circR));
            }
        }
    }

    return entities;
}
