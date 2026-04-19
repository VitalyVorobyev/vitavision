import type { TargetConfig, PageConfig, ValidationResult, CharucoConfig, RingGridConfig } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";
import {
    generateMarkers,
    markerOuterDrawRadius,
    hexRowSpacingMm,
    markerBounds,
} from "./ringgrid/layout";

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

export function validateConfig(
    target: TargetConfig,
    page: PageConfig,
): ValidationResult {
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

            // Validate circles
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
            [boardW, boardH] = validateRingGrid(c, errors, warnings);
            if (c.pitchMm < 4) smallFeatureWarning = true;
            break;
        }
        case "puzzleboard": {
            const c = target.config;
            const MARGIN_MM = 5;
            boardW = c.cols * c.cellSizeMm + 2 * MARGIN_MM;
            boardH = c.rows * c.cellSizeMm + 2 * MARGIN_MM;
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

    return { errors, warnings };
}

function validateRingGrid(
    c: RingGridConfig,
    errors: string[],
    warnings: string[],
): [number, number] {
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

    const minSpacing = hexRowSpacingMm(c.pitchMm);
    const drawDiam = 2 * markerOuterDrawRadius(c.markerOuterRadiusMm, c.markerRingWidthMm);
    if (drawDiam >= minSpacing) {
        errors.push(
            `Marker draw diameter (${drawDiam.toFixed(1)} mm) exceeds minimum spacing (${minSpacing.toFixed(1)} mm).`,
        );
    }

    // Marker count vs codebook pool
    const markers = generateMarkers(c.rows, c.longRowCols, c.pitchMm);
    const poolSize = c.profile === "extended" ? 2180 : 893;
    if (markers.length > poolSize) {
        warnings.push(
            `Board has ${markers.length} markers but ${c.profile} codebook has ${poolSize}. ` +
            `Markers beyond the pool will have no code.`,
        );
    }

    // Compute board dimensions including draw radius
    const [minX, minY, maxX, maxY] = markerBounds(markers);
    const drawR = markerOuterDrawRadius(c.markerOuterRadiusMm, c.markerRingWidthMm);
    const boardW = (maxX - minX) + 2 * drawR;
    const boardH = (maxY - minY) + 2 * drawR;

    return [boardW, boardH];
}
