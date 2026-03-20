import type { RingGridConfig } from "../types";
import type { PageDimensions } from "../svg/paperConstants";
import { dxfCircle, dxfLine, buildDxf } from "./dxfWriter";
import {
    generateMarkers,
    markerOuterDrawRadius,
    codeBandBounds,
    markerBounds,
} from "../ringgrid/layout";

export function ringgridDxf(config: RingGridConfig, page: PageDimensions): string {
    const markers = generateMarkers(config.rows, config.longRowCols, config.pitchMm);

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

        // Outer and inner rings
        entities.push(dxfCircle(cx, cy, config.markerOuterRadiusMm));
        entities.push(dxfCircle(cx, cy, config.markerInnerRadiusMm));

        // Code band sector boundaries: 16 radial lines from inner to outer edge
        for (let i = 0; i < 16; i++) {
            const angle = (i * 22.5 * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            entities.push(
                dxfLine(
                    cx + bandInnerR * cos,
                    cy + bandInnerR * sin,
                    cx + bandOuterR * cos,
                    cy + bandOuterR * sin,
                ),
            );
        }
    }

    return buildDxf(entities);
}
