import type { MarkerBitGrid } from "./types";

/**
 * Decode a hex code string into a markerSize×markerSize bit grid.
 *
 * The hex string (e.g. "0xb352") encodes marker_size² bits **LSB-first**,
 * row-major: bit `r * markerSize + c` is the cell at row `r`, column `c`, and
 * a set bit is a BLACK cell. Uses BigInt to handle grids up to 7×7 (49 bits).
 *
 * This convention is not a choice — `public/arucodict/*.json` are byte-identical
 * copies of `calib-targets-aruco/data/*.json`, and the reference renderer
 * `calib-targets-print/src/render.rs::build_charuco` unpacks them as:
 *
 *     let idx = by * bits + bx;
 *     ((code >> idx) & 1) == 1        // 1 = black
 *
 * Reading these codes MSB-first instead reverses the row-major sequence, which
 * flips both axes — every marker comes out rotated by 180° and decodes to the
 * wrong id (or not at all). That was a real shipped bug; `decoder.test.ts` pins
 * the grids against `render_charuco_bundle` output so it cannot come back.
 */
export function decodeMarker(hexCode: string, markerSize: number): MarkerBitGrid {
    if (markerSize * markerSize > 64) {
        throw new Error(
            `marker size ${markerSize} exceeds the 64-bit packed code (${markerSize ** 2} bits)`,
        );
    }
    const value = BigInt(hexCode);

    const grid: MarkerBitGrid = [];
    for (let r = 0; r < markerSize; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < markerSize; c++) {
            const bitIndex = r * markerSize + c;
            row.push(((value >> BigInt(bitIndex)) & 1n) === 1n);
        }
        grid.push(row);
    }
    return grid;
}
