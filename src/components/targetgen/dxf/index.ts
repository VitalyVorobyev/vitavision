import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "../svg/paperConstants";
import { chessboardDxf } from "./chessboardDxf";
import { markerboardDxf } from "./markerboardDxf";
import { charucoDxf } from "./charucoDxf";
import { ringgridDxf } from "./ringgridDxf";
import { buildDxf, dxfLine } from "./dxfWriter";

function scaleLineDxfEntities(pageW: number, marginMm: number): string[] {
    const available = pageW - 2 * marginMm;
    const candidates = [100, 50, 20, 10];
    const barLen = candidates.find((candidate) => candidate <= available * 0.4) ?? 10;

    const capH = 1;
    const bottomGap = marginMm * 0.4;
    const barY = bottomGap;
    const x1 = (pageW - barLen) / 2;
    const x2 = x1 + barLen;

    return [
        dxfLine(x1, barY, x2, barY),
        dxfLine(x1, barY - capH / 2, x1, barY + capH / 2),
        dxfLine(x2, barY - capH / 2, x2, barY + capH / 2),
    ];
}

export async function generateDxf(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    let entities: string[];
    switch (target.targetType) {
        case "chessboard":
            entities = chessboardDxf(target.config, dims);
            break;
        case "markerboard":
            entities = markerboardDxf(target.config, dims);
            break;
        case "charuco":
            entities = await charucoDxf(target.config, dims);
            break;
        case "ringgrid":
            entities = await ringgridDxf(target.config, dims);
            break;
    }

    if (page.showScaleLine) {
        entities.push(...scaleLineDxfEntities(dims.widthMm, dims.marginMm));
    }

    return buildDxf(entities);
}
