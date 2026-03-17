import type { MarkerBitGrid } from "./types";

/**
 * Decode a hex code string into a markerSize×markerSize bit grid.
 *
 * The hex string (e.g. "0xb352") encodes marker_size² bits in MSB-first,
 * row-major order. Uses BigInt to handle grids up to 7×7 (49 bits).
 */
export function decodeMarker(hexCode: string, markerSize: number): MarkerBitGrid {
    const totalBits = markerSize * markerSize;
    const value = BigInt(hexCode);

    const grid: MarkerBitGrid = [];
    for (let r = 0; r < markerSize; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < markerSize; c++) {
            const bitIndex = totalBits - 1 - (r * markerSize + c);
            row.push(((value >> BigInt(bitIndex)) & 1n) === 1n);
        }
        grid.push(row);
    }
    return grid;
}
