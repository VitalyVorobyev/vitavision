import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "./paperConstants";
import { chessboardSvg } from "./chessboardSvg";
import { markerboardSvg } from "./markerboardSvg";
import { charucoSvg } from "./charucoSvg";

export async function generatePreviewSvg(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    switch (target.targetType) {
        case "chessboard":
            return chessboardSvg(target.config, dims);
        case "markerboard":
            return markerboardSvg(target.config, dims);
        case "charuco":
            return charucoSvg(target.config, dims);
    }
}
