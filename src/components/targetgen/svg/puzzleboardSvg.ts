import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect, circle } from "./svgUtils";
import { horizontalEdgeBit, verticalEdgeBit } from "../puzzleboard/codeMaps";
import { PUZZLEBOARD_QUIET_ZONE_MM as MARGIN_MM } from "../puzzleboard/constants";

export function puzzleboardSvg(
    config: PuzzleboardConfig,
    page: PageDimensions,
): string {
    const { rows, cols, cellSizeMm: sq } = config;
    const inkW = cols * sq;
    const inkH = rows * sq;
    const outerW = inkW + 2 * MARGIN_MM;
    const outerH = inkH + 2 * MARGIN_MM;
    const outerOx = (page.widthMm - outerW) / 2;
    const outerOy = (page.heightMm - outerH) / 2;
    const ox = outerOx + MARGIN_MM;
    const oy = outerOy + MARGIN_MM;
    const dotR = sq / 6;

    const parts: string[] = [];
    parts.push(rect(outerOx, outerOy, outerW, outerH, "#ffffff"));

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
