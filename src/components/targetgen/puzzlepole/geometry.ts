/**
 * PuzzlePole geometry and rules — pure, WASM-free, safe to import from the
 * design-synced panels.
 *
 * Every number here was measured against `@vitavision/calib-targets` 0.15.1
 * (`render_target_bundle_json` with `kind: "puzzlepole"`), not read off the
 * `.d.ts`:
 *
 * - the printed strip is `axial_squares` columns wide and
 *   `circumference_squares + 2` rows tall (e.g. 24 x 8 pieces at 10 mm ->
 *   80 x 260 mm; 12 x 5 at 20 mm -> 100 x 280 mm). The circumference runs along
 *   the page's vertical axis and the library does not rotate it;
 * - the library accepts 4..=500 axial squares (3 and fewer, and 501+, throw
 *   "not a valid axial extent");
 * - a strip is identified by a `[circumference_squares, start_row]` pair, and
 *   only the pairs `puzzlepole_periods()` returns close seamlessly.
 */

import type { PuzzlepoleConfig } from "../types";

/** One `[circumference_squares, start_row]` pair from `puzzlepole_periods()`. */
export type PuzzlepolePeriod = readonly [circumferenceSquares: number, startRow: number];

export const PUZZLEPOLE_MIN_AXIAL_SQUARES = 4;
export const PUZZLEPOLE_MAX_AXIAL_SQUARES = 500;

/** Rows printed beyond the circumference (measured; see the file header). */
const PUZZLEPOLE_EXTRA_ROWS = 2;

/** Printed footprint of the strip in mm, before page margins. */
export function puzzlepoleBoardSizeMm(c: PuzzlepoleConfig): { widthMm: number; heightMm: number } {
    return {
        widthMm: c.axialSquares * c.squareSizeMm,
        heightMm: (c.circumferenceSquares + PUZZLEPOLE_EXTRA_ROWS) * c.squareSizeMm,
    };
}

/** Diameter of the cylinder the strip wraps: circumference = circumferenceSquares * squareSizeMm. */
export function puzzlepoleCylinderDiameterMm(c: PuzzlepoleConfig): number {
    return (c.circumferenceSquares * c.squareSizeMm) / Math.PI;
}

/** Distinct supported circumferences, ascending. */
export function puzzlepoleCircumferences(periods: readonly PuzzlepolePeriod[]): number[] {
    return [...new Set(periods.map(([circumference]) => circumference))].sort((a, b) => a - b);
}

/** Start rows that close seamlessly for a circumference, ascending. */
export function puzzlepoleStartRows(periods: readonly PuzzlepolePeriod[], circumferenceSquares: number): number[] {
    return periods
        .filter(([circumference]) => circumference === circumferenceSquares)
        .map(([, startRow]) => startRow)
        .sort((a, b) => a - b);
}

/**
 * Readable errors for a PuzzlePole config against the library's supported
 * periods. Empty when the config is renderable (page fit is checked separately).
 */
export function puzzlepoleConfigErrors(c: PuzzlepoleConfig, periods: readonly PuzzlepolePeriod[]): string[] {
    const errors: string[] = [];
    const circumferences = puzzlepoleCircumferences(periods);

    if (!circumferences.includes(c.circumferenceSquares)) {
        errors.push(
            `${c.circumferenceSquares} squares around the circumference is not a PuzzlePole period that closes ` +
                `seamlessly. Supported: ${circumferences.join(", ")}.`,
        );
    } else if (!puzzlepoleStartRows(periods, c.circumferenceSquares).includes(c.startRow)) {
        errors.push(
            `Start row ${c.startRow} does not close seamlessly for ${c.circumferenceSquares} squares. ` +
                `Valid start rows: ${puzzlepoleStartRows(periods, c.circumferenceSquares).join(", ")}.`,
        );
    }

    if (
        !Number.isInteger(c.axialSquares) ||
        c.axialSquares < PUZZLEPOLE_MIN_AXIAL_SQUARES ||
        c.axialSquares > PUZZLEPOLE_MAX_AXIAL_SQUARES
    ) {
        errors.push(
            `Axial squares must be a whole number from ${PUZZLEPOLE_MIN_AXIAL_SQUARES} to ${PUZZLEPOLE_MAX_AXIAL_SQUARES}.`,
        );
    }
    if (!(c.squareSizeMm > 0)) {
        errors.push("Square size must be positive.");
    }
    return errors;
}
