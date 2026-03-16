import type { TargetConfig, PageConfig, ValidationResult } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";

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
    let squareSizeMm: number;

    switch (target.targetType) {
        case "chessboard": {
            const c = target.config;
            squareSizeMm = c.squareSizeMm;
            boardW = (c.innerCols + 1) * squareSizeMm;
            boardH = (c.innerRows + 1) * squareSizeMm;
            break;
        }
        case "markerboard": {
            const c = target.config;
            squareSizeMm = c.squareSizeMm;
            const totalRows = c.innerRows + 1;
            const totalCols = c.innerCols + 1;
            boardW = totalCols * squareSizeMm;
            boardH = totalRows * squareSizeMm;

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
            squareSizeMm = c.squareSizeMm;
            boardW = c.cols * squareSizeMm;
            boardH = c.rows * squareSizeMm;

            if (c.markerSizeRel <= 0 || c.markerSizeRel >= 1) {
                errors.push("Marker size ratio must be between 0 and 1.");
            }
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

    if (squareSizeMm < 5) {
        warnings.push("Very small squares (< 5 mm) may be hard to detect reliably.");
    }

    return { errors, warnings };
}
