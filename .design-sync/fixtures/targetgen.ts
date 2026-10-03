// Static stand-ins for what the target generator gets from its WASM worker.
//
// In the app, the preview SVG comes from @vitavision/calib-targets / @vitavision/ringgrid
// (src/components/targetgen/svg/index.ts -> renderViaWasm.ts), `validateConfig` is async and
// reads the supported PuzzlePole periods from the same worker, and neither is available in a
// design render (no worker, no .wasm). The synced targetgen components are presentational:
// they display `state.previewSvg` and `state.validation`. So the previews build both here, as
// plain data -- a *sketch* of each board kind (alternating squares, markers as simple
// shapes), not the real pattern. Imports from src/ are limited to types and the pure page-size
// helper; do not import validation.ts, svg/index.ts or puzzlepole/periods.ts, which reach the
// worker proxy.

import { resolvePageDimensions } from '../../src/components/targetgen/svg/paperConstants';
import type {
    PageConfig,
    TargetConfig,
    TargetGeneratorState,
    ValidationResult,
} from '../../src/components/targetgen/types';

export const A4_LANDSCAPE: PageConfig = {
    sizeKind: 'a4',
    customWidthMm: 210,
    customHeightMm: 297,
    orientation: 'landscape',
    marginMm: 10,
    pngDpi: 300,
    showScaleLine: true,
};

export const A4_PORTRAIT: PageConfig = { ...A4_LANDSCAPE, orientation: 'portrait' };

/**
 * A few real `[circumference_squares, start_row]` pairs, as `puzzlepole_periods()` returns
 * them (12 -> 73 is the first period the library lists for 12; 24 -> 75 is the medium preset).
 * In the app these come from the WASM worker; a design passes a list like this as
 * `puzzlepolePeriods` to `TargetConfigPanel`.
 */
export const PUZZLEPOLE_PERIODS: readonly (readonly [number, number])[] = [
    [12, 73],
    [24, 75],
];

const INK = '#000';
const PAPER = '#fff';

/** Printed footprint of the board in mm (the same arithmetic as TargetPreview's computeBoardDims). */
export function boardSizeMm(target: TargetConfig): { w: number; h: number } {
    switch (target.targetType) {
        case 'chessboard':
        case 'markerboard':
            return {
                w: (target.config.innerCols + 1) * target.config.squareSizeMm,
                h: (target.config.innerRows + 1) * target.config.squareSizeMm,
            };
        case 'charuco':
            return { w: target.config.cols * target.config.squareSizeMm, h: target.config.rows * target.config.squareSizeMm };
        case 'ringgrid': {
            const c = target.config;
            return {
                w: c.longRowCols * c.pitchMm + 2 * c.markerOuterRadiusMm,
                h: (c.rows - 1) * c.pitchMm * (Math.sqrt(3) / 2) + 2 * c.markerOuterRadiusMm,
            };
        }
        case 'puzzleboard':
            return { w: target.config.cols * target.config.cellSizeMm, h: target.config.rows * target.config.cellSizeMm };
        case 'puzzlepole':
            return {
                w: target.config.axialSquares * target.config.squareSizeMm,
                h: (target.config.circumferenceSquares + 2) * target.config.squareSizeMm,
            };
    }
}

function squares(cols: number, rows: number, size: number, ox: number, oy: number): string {
    let out = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 === 0) out += `<rect x="${ox + c * size}" y="${oy + r * size}" width="${size}" height="${size}"/>`;
        }
    }
    return out;
}

/** Deterministic pseudo-bits so a "marker" looks like a code without being one. */
function bit(i: number, j: number, k: number): boolean {
    return ((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) % 3 === 0;
}

function boardBody(target: TargetConfig, ox: number, oy: number): string {
    switch (target.targetType) {
        case 'chessboard': {
            const { squareSizeMm: s, innerCols, innerRows } = target.config;
            return `<g fill="${INK}">${squares(innerCols + 1, innerRows + 1, s, ox, oy)}</g>`;
        }
        case 'charuco': {
            const { squareSizeMm: s, cols, rows, markerSizeRel } = target.config;
            const m = s * markerSizeRel;
            let markers = '';
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if ((r + c) % 2 === 0) continue;
                    const x = ox + c * s + (s - m) / 2;
                    const y = oy + r * s + (s - m) / 2;
                    markers += `<rect x="${x}" y="${y}" width="${m}" height="${m}" fill="${INK}"/>`;
                    for (let k = 0; k < 16; k++) {
                        if (!bit(r, c, k)) continue;
                        const cell = m / 6;
                        markers += `<rect x="${x + cell + (k % 4) * cell}" y="${y + cell + Math.floor(k / 4) * cell}" width="${cell}" height="${cell}" fill="${PAPER}"/>`;
                    }
                }
            }
            return `<g fill="${INK}">${squares(cols, rows, s, ox, oy)}</g>${markers}`;
        }
        case 'markerboard': {
            const { squareSizeMm: s, innerCols, innerRows, circleDiameterRel, circles } = target.config;
            let dots = '';
            for (const { cell } of circles) {
                const dark = (cell.i + cell.j) % 2 === 0;
                dots += `<circle cx="${ox + (cell.j + 0.5) * s}" cy="${oy + (cell.i + 0.5) * s}" r="${(s * circleDiameterRel) / 2}" fill="${dark ? PAPER : INK}"/>`;
            }
            return `<g fill="${INK}">${squares(innerCols + 1, innerRows + 1, s, ox, oy)}</g>${dots}`;
        }
        case 'ringgrid': {
            const c = target.config;
            let rings = '';
            for (let r = 0; r < c.rows; r++) {
                const cols = r % 2 === 0 ? c.longRowCols : c.longRowCols - 1;
                const shift = r % 2 === 0 ? 0 : c.pitchMm / 2;
                for (let k = 0; k < cols; k++) {
                    const cx = ox + c.markerOuterRadiusMm + shift + k * c.pitchMm;
                    const cy = oy + c.markerOuterRadiusMm + r * c.pitchMm * (Math.sqrt(3) / 2);
                    rings += `<circle cx="${cx}" cy="${cy}" r="${c.markerOuterRadiusMm - c.markerRingWidthMm / 2}" fill="none" stroke="${INK}" stroke-width="${c.markerRingWidthMm}"/>`;
                    rings += `<circle cx="${cx}" cy="${cy}" r="${c.markerInnerRadiusMm}" fill="none" stroke="${INK}" stroke-width="${c.markerRingWidthMm}"/>`;
                }
            }
            return rings;
        }
        case 'puzzleboard': {
            const { cellSizeMm: s, cols, rows } = target.config;
            let dots = '';
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols - 1; c++) {
                    dots += `<circle cx="${ox + (c + 1) * s}" cy="${oy + (r + 0.5) * s}" r="${s * 0.12}" fill="${bit(r, c, 1) ? PAPER : INK}"/>`;
                }
            }
            return `<g fill="${INK}">${squares(cols, rows, s, ox, oy)}</g>${dots}`;
        }
        case 'puzzlepole': {
            const { squareSizeMm: s, axialSquares, circumferenceSquares } = target.config;
            return `<g fill="${INK}">${squares(axialSquares, circumferenceSquares + 2, s, ox, oy)}</g>`;
        }
    }
}

/** A sketch of the page the app would render: white sheet, the board centred in the margins. */
export function staticPreviewSvg(target: TargetConfig, page: PageConfig): string {
    const { widthMm: W, heightMm: H } = resolvePageDimensions(page);
    const { w, h } = boardSizeMm(target);
    const ox = (W - w) / 2;
    const oy = (H - h) / 2;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">` +
        `<rect width="${W}" height="${H}" fill="${PAPER}"/>${boardBody(target, ox, oy)}</svg>`
    );
}

/** `validateConfig`'s fit check, by hand (the real one is async and reaches the worker). */
export function staticValidation(target: TargetConfig, page: PageConfig): ValidationResult {
    const { widthMm, heightMm, marginMm } = resolvePageDimensions(page);
    const drawW = widthMm - 2 * marginMm;
    const drawH = heightMm - 2 * marginMm;
    const { w, h } = boardSizeMm(target);
    const errors =
        w > drawW || h > drawH
            ? [`Board (${w.toFixed(1)} x ${h.toFixed(1)} mm) does not fit the printable area (${drawW.toFixed(1)} x ${drawH.toFixed(1)} mm).`]
            : [];
    return { errors, warnings: [], boardWidthMm: w, boardHeightMm: h };
}

/** A settled generator state: preview rendered, validation resolved. */
export function settledState(target: TargetConfig, page: PageConfig = A4_LANDSCAPE): TargetGeneratorState {
    return {
        target,
        page,
        previewSvg: staticPreviewSvg(target, page),
        validation: staticValidation(target, page),
        configCache: {},
    };
}

/** The first element of a preset list (`noUncheckedIndexedAccess` makes `xs[0]` possibly undefined). */
export function first<T>(xs: readonly T[]): T {
    const x = xs[0];
    if (x === undefined) throw new Error('empty list');
    return x;
}
