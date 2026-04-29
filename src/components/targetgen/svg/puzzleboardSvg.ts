import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect, circle } from "./svgUtils";
import { horizontalEdgeBit, verticalEdgeBit } from "../puzzleboard/codeMaps";

export function puzzleboardSvg(
    config: PuzzleboardConfig,
    page: PageDimensions,
): string {
    const { rows, cols, cellSizeMm: sq } = config;
    const boardW = cols * sq;
    const boardH = rows * sq;
    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;
    const dotR = sq / 6;

    const parts: string[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const fill = (r + c) % 2 === 0 ? "#000000" : "#ffffff";
            parts.push(rect(ox + c * sq, oy + r * sq, sq, sq, fill));
        }
    }

    for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
            const fill = horizontalEdgeBit(r, c) === 1 ? "#ffffff" : "#000000";
            parts.push(circle(ox + (c + 0.5) * sq, oy + (r + 1) * sq, dotR, fill));
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
            const fill = verticalEdgeBit(r, c) === 1 ? "#ffffff" : "#000000";
            parts.push(circle(ox + (c + 1) * sq, oy + (r + 0.5) * sq, dotR, fill));
        }
    }

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}
