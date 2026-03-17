import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "../svg/paperConstants";
import { chessboardDxf } from "./chessboardDxf";
import { markerboardDxf } from "./markerboardDxf";
import { charucoDxf } from "./charucoDxf";

export function generateDxf(target: TargetConfig, page: PageConfig): string {
    const dims = resolvePageDimensions(page);

    switch (target.targetType) {
        case "chessboard":
            return chessboardDxf(target.config, dims);
        case "markerboard":
            return markerboardDxf(target.config, dims);
        case "charuco":
            return charucoDxf(target.config, dims);
    }
}
