import type { CharucoConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect, text } from "./svgUtils";

export function charucoPreviewSvg(
    config: CharucoConfig,
    page: PageDimensions,
): string {
    const sq = config.squareSizeMm;
    const boardW = config.cols * sq;
    const boardH = config.rows * sq;

    const ox = (page.widthMm - boardW) / 2;
    const oy = (page.heightMm - boardH) / 2;

    const parts: string[] = [];
    parts.push(rect(ox, oy, boardW, boardH, "#ffffff"));

    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            const isBlack = (r + c) % 2 === 0;
            if (isBlack) {
                parts.push(rect(ox + c * sq, oy + r * sq, sq, sq, "#000000"));
            } else {
                // White square — show gray placeholder for marker
                const markerSize = sq * config.markerSizeRel;
                const markerOff = (sq - markerSize) / 2;
                parts.push(
                    rect(
                        ox + c * sq + markerOff,
                        oy + r * sq + markerOff,
                        markerSize,
                        markerSize,
                        "#c0c0c0",
                    ),
                );
            }
        }
    }

    // Label
    parts.push(
        text(
            page.widthMm / 2,
            oy + boardH + 6,
            "Preview — generate for actual ArUco markers",
            { fontSize: 3.5, fill: "#888" },
        ),
    );

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}
