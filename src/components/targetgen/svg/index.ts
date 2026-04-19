import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "./paperConstants";
import { chessboardSvg } from "./chessboardSvg";
import { markerboardSvg } from "./markerboardSvg";
import { charucoSvg } from "./charucoSvg";
import { ringgridSvg } from "./ringgridSvg";
import { puzzleboardSvg } from "./puzzleboardSvg";
import { renderScaleLine } from "./scaleLine";

export async function generatePreviewSvg(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    let svg: string;
    switch (target.targetType) {
        case "chessboard":
            svg = chessboardSvg(target.config, dims);
            break;
        case "markerboard":
            svg = markerboardSvg(target.config, dims);
            break;
        case "charuco":
            svg = await charucoSvg(target.config, dims);
            break;
        case "ringgrid":
            svg = await ringgridSvg(target.config, dims);
            break;
        case "puzzleboard":
            svg = await puzzleboardSvg(target.config, dims);
            break;
    }

    if (page.showScaleLine) {
        const scaleSvg = renderScaleLine(dims.widthMm, dims.heightMm, dims.marginMm);
        if (scaleSvg) {
            svg = svg.replace("</svg>", scaleSvg + "</svg>");
        }
    }

    return svg;
}
