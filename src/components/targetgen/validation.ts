import type { TargetConfig, PageConfig, ValidationResult, CharucoConfig, RingGridConfig } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";
import { PUZZLEBOARD_QUIET_ZONE_MM } from "./puzzleboard/constants";
import { toRinggridTarget, toRinggridBoardSizeOptions } from "./ringgridTarget";
import { ringgridBoardSizeMmWasm } from "../../lib/wasm/wasmWorkerProxy";

/** Number of markers a ChArUco board requires (one per white square). */
function charucoMarkerCount(c: CharucoConfig): number {
    return Math.floor(c.rows * c.cols / 2);
}

/** Extract pool size from dictionary name, e.g. "DICT_4X4_250" -> 250. */
function dictionaryPoolSize(name: string): number | null {
    // Standard dictionaries: DICT_NxN_SIZE
    const match = name.match(/_(\d+)$/);
    if (match) return Number(match[1]);
    // AprilTag / ArUco original — large enough for any practical board
    return null;
}

export async function validateConfig(
    target: TargetConfig,
    page: PageConfig,
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dims = resolvePageDimensions(page);

    if (dims.widthMm <= 0 || dims.heightMm <= 0) {
        errors.push("Page dimensions must be positive.");
        return { errors, warnings };
    }

    const drawW = dims.widthMm - 2 * dims.marginMm;
    const drawH = dims.heightMm - 2 * dims.marginMm;

    if (drawW <= 0 || drawH <= 0) {
        errors.push("Margins are too large for the page.");
        return { errors, warnings };
    }

    let boardW: number;
    let boardH: number;
    let smallFeatureWarning = false;

    switch (target.targetType) {
        case "chessboard": {
            const c = target.config;
            boardW = (c.innerCols + 1) * c.squareSizeMm;
            boardH = (c.innerRows + 1) * c.squareSizeMm;
            if (c.squareSizeMm < 5) smallFeatureWarning = true;
            break;
        }
        case "markerboard": {
            const c = target.config;
            const totalRows = c.innerRows + 1;
            const totalCols = c.innerCols + 1;
            boardW = totalCols * c.squareSizeMm;
            boardH = totalRows * c.squareSizeMm;
            if (c.squareSizeMm < 5) smallFeatureWarning = true;

            // Validate circles. The type declares a 3-tuple, but a config can
            // also arrive via JSON import (see TargetTypeSelector's handleImport),
            // which bypasses the type checker at runtime.
            if (c.circles.length !== 3) {
                errors.push(
                    `Marker board requires exactly 3 circles, got ${c.circles.length}. ` +
                    `The @vitavision/calib-targets library fixes this count (MarkerCircleSpec is a [T; 3] array).`,
                );
            }
            const seen = new Set<string>();
            for (const circ of c.circles) {
                const { i, j } = circ.cell;
                if (i < 0 || i >= totalRows || j < 0 || j >= totalCols) {
                    errors.push(`Circle at (${i}, ${j}) is outside the board.`);
                }
                const key = `${i},${j}`;
                if (seen.has(key)) {
                    warnings.push(`Duplicate circle at (${i}, ${j}).`);
                }
                seen.add(key);
            }
            break;
        }
        case "charuco": {
            const c = target.config;
            boardW = c.cols * c.squareSizeMm;
            boardH = c.rows * c.squareSizeMm;
            if (c.squareSizeMm < 5) smallFeatureWarning = true;

            if (c.markerSizeRel <= 0 || c.markerSizeRel >= 1) {
                errors.push("Marker size ratio must be between 0 and 1.");
            }
            const needed = charucoMarkerCount(c);
            const poolSize = dictionaryPoolSize(c.dictionary);
            if (poolSize !== null && needed > poolSize) {
                errors.push(
                    `Board requires ${needed} markers but dictionary ${c.dictionary} only has ${poolSize}. ` +
                    `Use a larger dictionary or reduce board dimensions.`,
                );
            }
            break;
        }
        case "ringgrid": {
            const c = target.config;
            if (c.pitchMm < 4) smallFeatureWarning = true;
            [boardW, boardH] = await validateRingGrid(c, errors);
            break;
        }
        case "puzzleboard": {
            const c = target.config;
            boardW = c.cols * c.cellSizeMm + 2 * PUZZLEBOARD_QUIET_ZONE_MM;
            boardH = c.rows * c.cellSizeMm + 2 * PUZZLEBOARD_QUIET_ZONE_MM;
            if (c.cellSizeMm < 5) smallFeatureWarning = true;
            break;
        }
    }

    if (boardW > drawW || boardH > drawH) {
        errors.push(
            `Board (${boardW.toFixed(1)} x ${boardH.toFixed(1)} mm) does not fit ` +
                `the printable area (${drawW.toFixed(1)} x ${drawH.toFixed(1)} mm).`,
        );
    } else {
        const remainW = drawW - boardW;
        const remainH = drawH - boardH;
        if (remainW < 5 || remainH < 5) {
            warnings.push("Board nearly fills the page — less than 5 mm clearance.");
        }
    }

    if (smallFeatureWarning) {
        warnings.push("Very small features may be hard to detect reliably.");
    }

    return { errors, warnings, boardWidthMm: boardW, boardHeightMm: boardH };
}

/**
 * Pure numeric checks (no lattice generation, no codebook) plus the board's
 * true printed footprint, fetched from the library itself.
 *
 * `@vitavision/ringgrid` is authoritative on marker-count-vs-codebook
 * capacity: building/sizing a target whose coded-cell count exceeds the
 * embedded codebook throws `"coded target has N cells but the embedded
 * codebook holds only M codewords"`. That throw is caught here and surfaced
 * as a validation ERROR (with the library's own message) rather than this
 * file re-deriving marker counts and hard-coded pool sizes in TypeScript.
 */
async function validateRingGrid(
    c: RingGridConfig,
    errors: string[],
): Promise<[number, number]> {
    if (c.rows < 1) errors.push("Rows must be at least 1.");
    if (c.longRowCols < 1) errors.push("Long row columns must be at least 1.");
    if (c.rows > 1 && c.longRowCols < 2) {
        errors.push("Long row columns must be at least 2 when rows > 1.");
    }

    if (c.markerInnerRadiusMm >= c.markerOuterRadiusMm) {
        errors.push("Inner radius must be smaller than outer radius.");
    }

    const half = c.markerRingWidthMm * 0.5;
    const innerOuter = c.markerInnerRadiusMm + half;
    const outerInner = c.markerOuterRadiusMm - half;
    if (innerOuter >= outerInner) {
        errors.push("Ring width is too large — no space for the code band between rings.");
    }

    // Adjacent-marker overlap: the drawn marker diameter (outer radius +
    // half the ring stroke width, doubled) must stay under the hex-lattice
    // row spacing (`pitchMm * sqrt(3)`). Both are closed-form and need no
    // lattice generation.
    const minSpacing = c.pitchMm * Math.sqrt(3);
    const drawDiam = 2 * (c.markerOuterRadiusMm + half);
    if (drawDiam >= minSpacing) {
        errors.push(
            `Marker draw diameter (${drawDiam.toFixed(1)} mm) exceeds minimum spacing (${minSpacing.toFixed(1)} mm).`,
        );
    }

    try {
        const targetJson = JSON.stringify(toRinggridTarget(c));
        const optionsJson = JSON.stringify(toRinggridBoardSizeOptions());
        const [boardW, boardH] = await ringgridBoardSizeMmWasm(targetJson, optionsJson);
        return [boardW, boardH];
    } catch (e) {
        errors.push(
            `Ring grid target is invalid: ${e instanceof Error ? e.message : String(e)}`,
        );
        // No footprint to report — 0x0 keeps the "does it fit the page"
        // check below from also firing a redundant/misleading error.
        return [0, 0];
    }
}
