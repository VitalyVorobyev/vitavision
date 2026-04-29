import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import {
    circleHoleBoundary,
    dxfFilledCircle,
    dxfFilledRect,
    dxfFilledRectWithVoids,
} from "./dxfWriter";
import { horizontalEdgeBit, verticalEdgeBit } from "../puzzleboard/codeMaps";

interface CircleAt {
    cx: number;
    cy: number;
    radius: number;
    bit: 0 | 1;
}

export function puzzleboardDxf(
    config: PuzzleboardConfig,
    page: PageDimensions,
): string[] {
    const { rows, cols, cellSizeMm: sq } = config;
    const boardW = cols * sq;
    const boardH = rows * sq;
    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;
    const dotR = sq / 6;
    const flipY = (svgY: number) => page.heightMm - svgY;

    const dotsByCell = new Map<string, CircleAt[]>();
    const cellKey = (r: number, c: number) => `${r}:${c}`;
    const push = (r: number, c: number, dot: CircleAt) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        const key = cellKey(r, c);
        const list = dotsByCell.get(key);
        if (list) list.push(dot);
        else dotsByCell.set(key, [dot]);
    };

    for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
            const bit = horizontalEdgeBit(r, c) as 0 | 1;
            const dot: CircleAt = {
                cx: ox + (c + 0.5) * sq,
                cy: oy + (r + 1) * sq,
                radius: dotR,
                bit,
            };
            push(r, c, dot);
            push(r + 1, c, dot);
        }
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
            const bit = verticalEdgeBit(r, c) as 0 | 1;
            const dot: CircleAt = {
                cx: ox + (c + 1) * sq,
                cy: oy + (r + 0.5) * sq,
                radius: dotR,
                bit,
            };
            push(r, c, dot);
            push(r, c + 1, dot);
        }
    }

    const entities: string[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellX = ox + c * sq;
            const cellY = oy + r * sq;
            const isBlackCell = (r + c) % 2 === 0;
            const dots = dotsByCell.get(cellKey(r, c)) ?? [];

            if (isBlackCell) {
                const voids = dots
                    .filter((d) => d.bit === 1)
                    .map((d) => circleHoleBoundary(d.cx, flipY(d.cy), d.radius));
                if (voids.length > 0) {
                    entities.push(
                        dxfFilledRectWithVoids(cellX, flipY(cellY + sq), sq, sq, voids),
                    );
                } else {
                    entities.push(dxfFilledRect(cellX, flipY(cellY + sq), sq, sq));
                }
            } else {
                for (const d of dots) {
                    if (d.bit === 0) {
                        entities.push(dxfFilledCircle(d.cx, flipY(d.cy), d.radius));
                    }
                }
            }
        }
    }

    return entities;
}
