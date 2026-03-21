import type { RingGridConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { loadCodebook } from "../ringgrid/loader";
import {
    generateMarkers,
    markerBounds,
    markerOuterDrawRadius,
    markerRingHalfThickness,
    codeBandBounds,
} from "../ringgrid/layout";
import { dxfFilledAnnularSector, dxfFilledAnnulus } from "./dxfWriter";

const DEG_PER_SECTOR = 360 / 16;

function svgAngleToDxf(angleDeg: number): number {
    const normalized = (((360 - angleDeg) % 360) + 360) % 360;
    return normalized === 0 && angleDeg !== 0 ? 360 : normalized;
}

export async function ringgridDxf(
    config: RingGridConfig,
    page: PageDimensions,
): Promise<string[]> {
    const codebook = await loadCodebook(config.profile);
    const markers = generateMarkers(config.rows, config.longRowCols, config.pitchMm);

    const halfThickness = markerRingHalfThickness(config.markerRingWidthMm);
    const drawR = markerOuterDrawRadius(config.markerOuterRadiusMm, config.markerRingWidthMm);
    const [bandInnerR, bandOuterR] = codeBandBounds(
        config.markerOuterRadiusMm,
        config.markerInnerRadiusMm,
        config.markerRingWidthMm,
    );

    const [minX, minY, maxX, maxY] = markerBounds(markers);
    const boardW = (maxX - minX) + 2 * drawR;
    const boardH = (maxY - minY) + 2 * drawR;

    const ox = (page.widthMm - boardW) / 2 + drawR - minX;
    const oy = (page.heightMm - boardH) / 2 + drawR - minY;
    const flipY = (svgY: number) => page.heightMm - svgY;

    const entities: string[] = [];

    for (const marker of markers) {
        const cx = ox + marker.x;
        const cy = flipY(oy + marker.y);
        const code = marker.id < codebook.codes.length ? codebook.codes[marker.id] : 0;

        entities.push(
            dxfFilledAnnulus(
                cx,
                cy,
                config.markerOuterRadiusMm + halfThickness,
                config.markerOuterRadiusMm - halfThickness,
            ),
        );

        entities.push(
            dxfFilledAnnulus(
                cx,
                cy,
                config.markerInnerRadiusMm + halfThickness,
                config.markerInnerRadiusMm - halfThickness,
            ),
        );

        for (let i = 0; i < 16; i++) {
            const bit = (code >> (15 - i)) & 1;
            if (bit === 0) continue;

            const startDeg = i * DEG_PER_SECTOR;
            const endDeg = (i + 1) * DEG_PER_SECTOR;

            entities.push(
                dxfFilledAnnularSector(
                    cx,
                    cy,
                    bandInnerR,
                    bandOuterR,
                    svgAngleToDxf(startDeg),
                    svgAngleToDxf(endDeg),
                    false,
                ),
            );
        }
    }

    return entities;
}
