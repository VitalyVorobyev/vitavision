import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "../svg/paperConstants";
import { chessboardDxf } from "./chessboardDxf";
import { markerboardDxf } from "./markerboardDxf";
import { charucoDxf } from "./charucoDxf";
import { ringgridDxf } from "./ringgridDxf";
import { dxfLine } from "./dxfWriter";

function scaleLineDxfEntities(pageW: number, marginMm: number): string {
    const available = pageW - 2 * marginMm;
    const candidates = [100, 50, 20, 10];
    const barLen = candidates.find((c) => c <= available * 0.4) ?? 10;

    const capH = 1;
    const bottomGap = marginMm * 0.4;
    const barY = bottomGap; // DXF Y-up: bottom of page is low Y
    const x1 = (pageW - barLen) / 2;
    const x2 = x1 + barLen;

    return [
        dxfLine(x1, barY, x2, barY),
        dxfLine(x1, barY - capH / 2, x1, barY + capH / 2),
        dxfLine(x2, barY - capH / 2, x2, barY + capH / 2),
    ].join("\n");
}

export function generateDxf(target: TargetConfig, page: PageConfig): string {
    const dims = resolvePageDimensions(page);

    let dxf: string;
    switch (target.targetType) {
        case "chessboard":
            dxf = chessboardDxf(target.config, dims);
            break;
        case "markerboard":
            dxf = markerboardDxf(target.config, dims);
            break;
        case "charuco":
            dxf = charucoDxf(target.config, dims);
            break;
        case "ringgrid":
            dxf = ringgridDxf(target.config, dims);
            break;
    }

    if (page.showScaleLine) {
        const scaleEntities = scaleLineDxfEntities(dims.widthMm, dims.marginMm);
        // Inject before the closing ENDSEC of the ENTITIES section
        dxf = dxf.replace(/\n0\nENDSEC\n0\nEOF/, `\n${scaleEntities}\n0\nENDSEC\n0\nEOF`);
    }

    return dxf;
}
