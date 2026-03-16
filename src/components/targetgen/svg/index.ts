import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "./paperConstants";
import { chessboardSvg } from "./chessboardSvg";
import { markerboardSvg } from "./markerboardSvg";
import { charucoPreviewSvg } from "./charucoPreviewSvg";

export function generatePreviewSvg(target: TargetConfig, page: PageConfig): string {
    const dims = resolvePageDimensions(page);

    switch (target.targetType) {
        case "chessboard":
            return chessboardSvg(target.config, dims);
        case "markerboard":
            return markerboardSvg(target.config, dims);
        case "charuco":
            return charucoPreviewSvg(target.config, dims);
    }
}

/**
 * Returns final SVG for client-side types, null for charuco (needs backend).
 */
export function generateFinalSvg(
    target: TargetConfig,
    page: PageConfig,
): string | null {
    const dims = resolvePageDimensions(page);

    switch (target.targetType) {
        case "chessboard":
            return chessboardSvg(target.config, dims);
        case "markerboard":
            return markerboardSvg(target.config, dims);
        case "charuco":
            return null; // needs backend for actual marker bitmaps
    }
}
