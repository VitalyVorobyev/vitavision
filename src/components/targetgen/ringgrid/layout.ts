import type { RingGridMarker } from "./types";

/**
 * Generate hex-lattice marker positions.
 * Port of `generate_markers()` from board_layout.rs.
 */
export function generateMarkers(
    rows: number,
    longRowCols: number,
    pitchMm: number,
): RingGridMarker[] {
    const shortRowCols = Math.max(0, longRowCols - 1);
    const markers: RingGridMarker[] = [];
    const rowMid = Math.floor(rows / 2);

    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
        const r = rowIdx - rowMid;
        const nCols =
            rows === 1 || ((r + longRowCols - 1) & 1) === 0
                ? longRowCols
                : shortRowCols;

        if (nCols === 0) continue;

        const qStart = -Math.floor((r + nCols - 1) / 2);
        for (let colIdx = 0; colIdx < nCols; colIdx++) {
            const q = qStart + colIdx;
            const [x, y] = hexAxialToXy(q, r, pitchMm);
            markers.push({ id: markers.length, x, y, q, r });
        }
    }

    normalizeOrigin(markers);
    return markers;
}

function hexAxialToXy(q: number, r: number, pitchMm: number): [number, number] {
    const s3 = Math.sqrt(3);
    const x = pitchMm * (s3 * q + 0.5 * s3 * r);
    const y = pitchMm * 1.5 * r;
    return [x, y];
}

function normalizeOrigin(markers: RingGridMarker[]): void {
    if (markers.length === 0) return;
    const ax = markers[0].x;
    const ay = markers[0].y;
    for (const m of markers) {
        m.x -= ax;
        m.y -= ay;
    }
}

export function hexRowSpacingMm(pitchMm: number): number {
    return pitchMm * Math.sqrt(3);
}

export function markerRingHalfThickness(ringWidthMm: number): number {
    return 0.5 * ringWidthMm;
}

export function markerOuterDrawRadius(outerRadiusMm: number, ringWidthMm: number): number {
    return outerRadiusMm + markerRingHalfThickness(ringWidthMm);
}

export function codeBandBounds(
    outerRadiusMm: number,
    innerRadiusMm: number,
    ringWidthMm: number,
): [number, number] {
    const half = markerRingHalfThickness(ringWidthMm);
    return [innerRadiusMm + half, outerRadiusMm - half];
}

/** Bounding box of marker centers: [minX, minY, maxX, maxY]. */
export function markerBounds(markers: RingGridMarker[]): [number, number, number, number] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const m of markers) {
        if (m.x < minX) minX = m.x;
        if (m.y < minY) minY = m.y;
        if (m.x > maxX) maxX = m.x;
        if (m.y > maxY) maxY = m.y;
    }
    return [minX, minY, maxX, maxY];
}
