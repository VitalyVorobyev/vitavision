/**
 * Pure mapping between the app's `TargetConfig` / `ScreenSettings` and the
 * native-resolution "screen target" renderers of the two WASM libraries:
 *
 *   - `@vitavision/calib-targets` `render_screen_target(target, screen)` —
 *     chessboard, ChArUco, PuzzleBoard. `target` is the printable target spec
 *     (the same object `printableDocument.ts` builds), `screen` is
 *     `{ width_px, height_px, pixel_pitch_mm, margin_px? }`. It keeps the board
 *     dimensions, snaps the square size to a whole number of pixels and centres
 *     the board; the sidecar (`json_text`) reports the realised geometry.
 *   - `@vitavision/ringgrid` `render_fitted_screen_target_json(target_json,
 *     options_json)` — ring grid. The library FITS rows/columns to fill the
 *     screen, so the app's rows / long-row-cols fields do not determine the
 *     output (they only seed the template); the pitch and ring proportions do.
 *
 * Verified against the real 0.18 modules by calling them (not inferred from the
 * .d.ts): ringgrid's `marker_diameter_mm` is the DRAWN diameter, i.e.
 * `2 * (outer_radius + ring_width / 2)` — with the default config (5.6 mm outer
 * radius, 0.8 mm ring width) a request of 12 mm returns
 * `drawn_marker_diameter_mm = 12` and leaves the template's radii untouched.
 *
 * Dependency-free (no WASM import), so it is unit-testable and shared by the
 * worker handlers, the app and `scripts/test-target-generators.ts`.
 */

import type {
    RingGridConfig,
    ScreenGeometry,
    ScreenRenderResult,
    ScreenSettings,
    TargetConfig,
    TargetType,
} from "./types";
import { toPrintableDocument, type PrintableTargetSpec } from "./printableDocument";
import { toRinggridTarget } from "./ringgridTarget";

/** Kinds the screen renderers support. Marker board and PuzzlePole do not. */
export const SCREEN_TARGET_TYPES: readonly TargetType[] = ["chessboard", "charuco", "puzzleboard", "ringgrid"];

export function isScreenSupported(targetType: TargetType): boolean {
    return SCREEN_TARGET_TYPES.includes(targetType);
}

export function screenUnsupportedMessage(targetType: TargetType): string {
    const label = targetType === "markerboard" ? "Marker board" : "PuzzlePole";
    return `${label} is not available as a screen target. Choose a chessboard, ChArUco, PuzzleBoard or ring grid, or switch the medium back to Print.`;
}

// ── library inputs ───────────────────────────────────────────────────────────

export interface ScreenOptionsJson {
    width_px: number;
    height_px: number;
    pixel_pitch_mm: number;
    margin_px?: number;
}

export function toScreenOptions(screen: ScreenSettings): ScreenOptionsJson {
    const opts: ScreenOptionsJson = {
        width_px: screen.widthPx,
        height_px: screen.heightPx,
        pixel_pitch_mm: screen.pixelPitchMm,
    };
    if (screen.marginPx !== null) opts.margin_px = screen.marginPx;
    return opts;
}

/**
 * The calib-targets screen spec for chessboard / charuco / puzzleboard — the
 * printable spec, without the page. Throws for any other kind.
 */
export function toScreenTargetSpec(target: TargetConfig): PrintableTargetSpec {
    switch (target.targetType) {
        case "chessboard":
        case "charuco":
        case "puzzleboard": {
            // The page argument only feeds the document's `page` block, which a
            // screen target does not use; any valid PageConfig will do.
            const doc = toPrintableDocument(target, {
                sizeKind: "a4",
                customWidthMm: 210,
                customHeightMm: 297,
                orientation: "landscape",
                marginMm: 0,
                pngDpi: 300,
                showScaleLine: false,
            });
            return doc.target;
        }
        default:
            throw new Error(screenUnsupportedMessage(target.targetType));
    }
}

/** Drawn marker diameter (outer ring edge to outer ring edge) of a ring-grid config, in mm. */
export function ringgridDrawnMarkerDiameterMm(c: RingGridConfig): number {
    return 2 * (c.markerOuterRadiusMm + c.markerRingWidthMm / 2);
}

export interface RinggridScreenOptionsJson extends ScreenOptionsJson {
    marker_diameter_mm: number;
}

export function toRinggridScreenOptions(c: RingGridConfig, screen: ScreenSettings): RinggridScreenOptionsJson {
    return { ...toScreenOptions(screen), marker_diameter_mm: ringgridDrawnMarkerDiameterMm(c) };
}

export function toRinggridScreenTargetJson(c: RingGridConfig): string {
    return JSON.stringify(toRinggridTarget(c));
}

// ── library outputs ──────────────────────────────────────────────────────────

/** `ScreenTargetMetadata` of calib-targets (the parsed `json_text`). */
interface CalibScreenMetadata {
    board_origin_px: [number, number];
    requested_square_size_mm: number;
    square_size_px: number;
    target: { square_size_mm: number };
}

/** `ScreenTargetMetadata` of ringgrid (the bundle's `metadata`). */
export interface RinggridScreenMetadata {
    screen: unknown;
    board_origin_px: [number, number];
    rows: number;
    columns: number;
    marker_count: number;
    drawn_marker_diameter_mm: number;
    drawn_marker_diameter_px: number;
    code_band_width_px: number | null;
}

export function geometryFromCalibSidecar(jsonText: string): ScreenGeometry {
    const m = JSON.parse(jsonText) as CalibScreenMetadata;
    return {
        kind: "grid",
        squareSizePx: m.square_size_px,
        squareSizeMm: m.target.square_size_mm,
        requestedSquareSizeMm: m.requested_square_size_mm,
        boardOriginPx: m.board_origin_px,
    };
}

export function geometryFromRinggridMetadata(m: RinggridScreenMetadata): ScreenGeometry {
    return {
        kind: "ringgrid",
        rows: m.rows,
        columns: m.columns,
        markerCount: m.marker_count,
        drawnMarkerDiameterPx: m.drawn_marker_diameter_px,
        drawnMarkerDiameterMm: m.drawn_marker_diameter_mm,
        codeBandWidthPx: m.code_band_width_px,
        boardOriginPx: m.board_origin_px,
    };
}

/**
 * Sidecar for a ring-grid screen target. The library's `json_text` is only the
 * fitted detector spec; the realised screen geometry lives in the separate
 * `metadata` object. Both are saved so the file is self-describing:
 *
 *     { "schema": "vitavision.screen-target.ringgrid.v1",
 *       "metadata": <ringgrid ScreenTargetMetadata>,
 *       "target": <fitted ringgrid.target.v6 spec — pass this to the detector> }
 *
 * (calib-targets' own `json_text` already contains everything and is saved
 * verbatim.)
 */
export function buildRinggridSidecar(metadata: RinggridScreenMetadata, fittedSpecJson: string): string {
    return JSON.stringify(
        {
            schema: "vitavision.screen-target.ringgrid.v1",
            metadata,
            target: JSON.parse(fittedSpecJson) as unknown,
        },
        null,
        2,
    );
}

export function toScreenRenderResult(
    png: Uint8Array,
    sidecarJson: string,
    geometry: ScreenGeometry,
    screen: ScreenSettings,
): ScreenRenderResult {
    return { png, sidecarJson, geometry, widthPx: screen.widthPx, heightPx: screen.heightPx };
}

// ── names ────────────────────────────────────────────────────────────────────

/** `vitavision_<kind>[_<dims>]-screen-<w>x<h>` (no extension). */
export function screenDownloadBase(target: TargetConfig, screen: ScreenSettings): string {
    let name: string;
    switch (target.targetType) {
        case "chessboard":
            name = `chessboard_${target.config.innerRows}x${target.config.innerCols}`;
            break;
        case "charuco":
            name = `charuco_${target.config.rows}x${target.config.cols}`;
            break;
        case "puzzleboard":
            name = `puzzleboard_${target.config.rows}x${target.config.cols}`;
            break;
        default:
            // Ring grid rows/cols are fitted by the library; marker board and
            // PuzzlePole are not screen kinds. The kind alone names the file.
            name = target.targetType;
    }
    return `vitavision_${name}-screen-${screen.widthPx}x${screen.heightPx}`;
}

// ── browser display size ─────────────────────────────────────────────────────

/** Native pixel size of this browser's display, or `undefined` (SSR / no `window`). */
export function detectDisplayPx(): { widthPx: number; heightPx: number } | undefined {
    if (typeof window === "undefined" || !window.screen) return undefined;
    const dpr = window.devicePixelRatio || 1;
    const widthPx = Math.round(window.screen.width * dpr);
    const heightPx = Math.round(window.screen.height * dpr);
    if (!(widthPx > 0 && heightPx > 0)) return undefined;
    return { widthPx, heightPx };
}
