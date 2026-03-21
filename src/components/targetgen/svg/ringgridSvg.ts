import type { RingGridConfig } from "../types";
import type { PageDimensions } from "./paperConstants";
import { svgDocument, rect } from "./svgUtils";
import { loadCodebook } from "../ringgrid/loader";
import {
    generateMarkers,
    markerOuterDrawRadius,
    codeBandBounds,
    markerBounds,
} from "../ringgrid/layout";

const DEG_PER_SECTOR = 360 / 16; // 22.5°

/** Render a single code band sector as an SVG path (filled arc wedge). */
function sectorPath(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startDeg: number,
    endDeg: number,
): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const cos = Math.cos;
    const sin = Math.sin;

    const a0 = toRad(startDeg);
    const a1 = toRad(endDeg);

    const ix0 = cx + innerR * cos(a0);
    const iy0 = cy + innerR * sin(a0);
    const ox0 = cx + outerR * cos(a0);
    const oy0 = cy + outerR * sin(a0);
    const ox1 = cx + outerR * cos(a1);
    const oy1 = cy + outerR * sin(a1);
    const ix1 = cx + innerR * cos(a1);
    const iy1 = cy + innerR * sin(a1);

    // 22.5° < 180° so large-arc-flag = 0
    return [
        `M${ix0.toFixed(4)},${iy0.toFixed(4)}`,
        `L${ox0.toFixed(4)},${oy0.toFixed(4)}`,
        `A${outerR.toFixed(4)},${outerR.toFixed(4)} 0 0,1 ${ox1.toFixed(4)},${oy1.toFixed(4)}`,
        `L${ix1.toFixed(4)},${iy1.toFixed(4)}`,
        `A${innerR.toFixed(4)},${innerR.toFixed(4)} 0 0,0 ${ix0.toFixed(4)},${iy0.toFixed(4)}`,
        "Z",
    ].join(" ");
}

export async function ringgridSvg(
    config: RingGridConfig,
    page: PageDimensions,
): Promise<string> {
    const codebook = await loadCodebook(config.profile);
    const markers = generateMarkers(config.rows, config.longRowCols, config.pitchMm);

    const drawR = markerOuterDrawRadius(config.markerOuterRadiusMm, config.markerRingWidthMm);
    const [bandInnerR, bandOuterR] = codeBandBounds(
        config.markerOuterRadiusMm,
        config.markerInnerRadiusMm,
        config.markerRingWidthMm,
    );

    // Compute board bounding box including drawn ring extent
    const [minX, minY, maxX, maxY] = markerBounds(markers);
    const boardW = (maxX - minX) + 2 * drawR;
    const boardH = (maxY - minY) + 2 * drawR;

    // Center board on page
    const ox = (page.widthMm - boardW) / 2 + drawR - minX;
    const oy = (page.heightMm - boardH) / 2 + drawR - minY;

    const parts: string[] = [];
    // White page background
    parts.push(rect(0, 0, page.widthMm, page.heightMm, "#ffffff"));

    for (const marker of markers) {
        const cx = ox + marker.x;
        const cy = oy + marker.y;
        const code = marker.id < codebook.codes.length ? codebook.codes[marker.id] : 0;

        // Outer ring
        parts.push(
            `<circle cx="${cx.toFixed(4)}" cy="${cy.toFixed(4)}" r="${config.markerOuterRadiusMm.toFixed(4)}" ` +
            `stroke="#000" stroke-width="${config.markerRingWidthMm.toFixed(4)}" fill="none"/>`,
        );

        // Inner ring
        parts.push(
            `<circle cx="${cx.toFixed(4)}" cy="${cy.toFixed(4)}" r="${config.markerInnerRadiusMm.toFixed(4)}" ` +
            `stroke="#000" stroke-width="${config.markerRingWidthMm.toFixed(4)}" fill="none"/>`,
        );

        // Code band sectors (16 bits, MSB first: bit 15 = sector 0)
        for (let i = 0; i < 16; i++) {
            const bit = (code >> (15 - i)) & 1;
            if (bit === 1) {
                const startDeg = i * DEG_PER_SECTOR;
                const endDeg = (i + 1) * DEG_PER_SECTOR;
                const d = sectorPath(cx, cy, bandInnerR, bandOuterR, startDeg, endDeg);
                parts.push(`<path d="${d}" fill="#000"/>`);
            }
        }
    }

    return svgDocument(page.widthMm, page.heightMm, parts.join(""));
}
