import type { CharucoConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { decodeMarker, loadDictionary } from "../aruco";
import type { ArucoDictionary } from "../aruco";
import { dxfFilledRect, dxfFilledRectWithHole } from "./dxfWriter";

function renderMarkerEntities(
    entities: string[],
    dict: ArucoDictionary,
    markerIdx: number,
    borderBits: number,
    cellX: number,
    cellY: number,
    squareSizeMm: number,
    markerSizeRel: number,
    flipY: (svgY: number) => number,
): void {
    const grid = decodeMarker(dict.codes[markerIdx], dict.markerSize);
    const totalCells = dict.markerSize + 2 * borderBits;
    const markerMm = squareSizeMm * markerSizeRel;
    const cellMm = markerMm / totalCells;
    const offset = (squareSizeMm - markerMm) / 2;
    const markerX = cellX + offset;
    const markerY = cellY + offset;

    const isBlack = (row: number, col: number): boolean => {
        const innerRow = row - borderBits;
        const innerCol = col - borderBits;
        if (
            innerRow < 0
            || innerCol < 0
            || innerRow >= dict.markerSize
            || innerCol >= dict.markerSize
        ) {
            return true;
        }
        return grid[innerRow][innerCol];
    };

    for (let row = 0; row < totalCells; row++) {
        let runStart = -1;
        for (let col = 0; col <= totalCells; col++) {
            const black = col < totalCells && isBlack(row, col);
            if (black && runStart < 0) {
                runStart = col;
                continue;
            }

            if (!black && runStart >= 0) {
                const runWidth = col - runStart;
                entities.push(
                    dxfFilledRect(
                        markerX + runStart * cellMm,
                        flipY(markerY + (row + 1) * cellMm),
                        runWidth * cellMm,
                        cellMm,
                    ),
                );
                runStart = -1;
            }
        }
    }
}

export async function charucoDxf(
    config: CharucoConfig,
    page: PageDimensions,
): Promise<string[]> {
    const dict = await loadDictionary(config.dictionary);

    const sq = config.squareSizeMm;
    const boardW = config.cols * sq;
    const boardH = config.rows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const flipY = (svgY: number) => page.heightMm - svgY;
    const innerSq = config.innerSquareRel > 0 ? sq * config.innerSquareRel : 0;
    const innerOff = (sq - innerSq) / 2;

    const entities: string[] = [];
    let markerIdx = 0;

    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            const cellX = ox + c * sq;
            const cellY = oy + r * sq;

            if ((r + c) % 2 === 0) {
                if (innerSq > 0) {
                    entities.push(
                        dxfFilledRectWithHole(
                            cellX,
                            flipY(cellY + sq),
                            sq,
                            sq,
                            cellX + innerOff,
                            flipY(cellY + innerOff + innerSq),
                            innerSq,
                            innerSq,
                        ),
                    );
                } else {
                    entities.push(dxfFilledRect(cellX, flipY(cellY + sq), sq, sq));
                }
                continue;
            }

            if (markerIdx < dict.codes.length) {
                renderMarkerEntities(
                    entities,
                    dict,
                    markerIdx,
                    config.borderBits,
                    cellX,
                    cellY,
                    sq,
                    config.markerSizeRel,
                    flipY,
                );
            }
            markerIdx++;
        }
    }

    return entities;
}
