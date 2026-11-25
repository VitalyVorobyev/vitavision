import type { DictionaryName } from "../../lib/types";

// ── Target type discriminator ────────────────────────────────────────────────

export type TargetType = "chessboard" | "charuco" | "markerboard" | "ringgrid" | "puzzleboard" | "puzzlepole";

// ── Per-type config ──────────────────────────────────────────────────────────

export interface ChessboardConfig {
    innerRows: number;
    innerCols: number;
    squareSizeMm: number;
    innerSquareRel: number;
}

export interface CharucoConfig {
    rows: number;
    cols: number;
    squareSizeMm: number;
    markerSizeRel: number;
    dictionary: DictionaryName;
    borderBits: number;
    innerSquareRel: number;
}

export interface CircleSpec {
    cell: { i: number; j: number };
}

export interface MarkerBoardConfig {
    innerRows: number;
    innerCols: number;
    squareSizeMm: number;
    circleDiameterRel: number;
    // Both the Rust printable spec and the detector spec declare this as a
    // fixed-size array ([MarkerCircleSpec; 3]) — the count of three circles
    // is fixed by the library, not a UI choice.
    circles: [CircleSpec, CircleSpec, CircleSpec];
    innerSquareRel: number;
}

export type RingGridProfile = "baseline" | "extended";

export interface PuzzleboardConfig {
    rows: number;
    cols: number;
    cellSizeMm: number;
}

/**
 * A PuzzleBoard wrapped around a cylinder. `circumferenceSquares` + `startRow`
 * must be one of the pairs `puzzlepole_periods()` returns (see
 * `puzzlepole/geometry.ts`); the cylinder diameter follows from them and
 * `squareSizeMm` and is not otherwise adjustable.
 */
export interface PuzzlepoleConfig {
    circumferenceSquares: number;
    /** Master-pattern row the strip is cut from (the seam). */
    startRow: number;
    axialSquares: number;
    squareSizeMm: number;
}

export interface RingGridConfig {
    rows: number;
    longRowCols: number;
    pitchMm: number;
    markerOuterRadiusMm: number;
    markerInnerRadiusMm: number;
    markerRingWidthMm: number;
    profile: RingGridProfile;
}

export type TargetConfig =
    | { targetType: "chessboard"; config: ChessboardConfig }
    | { targetType: "charuco"; config: CharucoConfig }
    | { targetType: "markerboard"; config: MarkerBoardConfig }
    | { targetType: "ringgrid"; config: RingGridConfig }
    | { targetType: "puzzleboard"; config: PuzzleboardConfig }
    | { targetType: "puzzlepole"; config: PuzzlepoleConfig };

// ── Page config ──────────────────────────────────────────────────────────────

export type PageSizeKind = "a4" | "letter" | "custom";
export type Orientation = "portrait" | "landscape";

export interface PageConfig {
    sizeKind: PageSizeKind;
    customWidthMm: number;
    customHeightMm: number;
    orientation: Orientation;
    marginMm: number;
    pngDpi: number;
    showScaleLine: boolean;
}

// ── Medium / screen display ──────────────────────────────────────────────────

/** `print` = paper (SVG/PNG/DXF); `screen` = pixel-native PNG for a monitor. */
export type Medium = "print" | "screen";

/**
 * The display a screen target is rendered for — exactly the library inputs
 * (`ScreenTargetOptions`). `marginPx: null` means "library default"
 * (calib-targets: 1 px; ringgrid computes its own).
 */
export interface ScreenSettings {
    widthPx: number;
    heightPx: number;
    pixelPitchMm: number;
    marginPx: number | null;
}

/**
 * The realised geometry reported by the library's sidecar. This — not the
 * requested configuration — is what a calibration must use.
 */
export type ScreenGeometry =
    | {
          kind: "grid";
          squareSizePx: number;
          /** Realised square size (`target.square_size_mm` in the sidecar). */
          squareSizeMm: number;
          requestedSquareSizeMm: number;
          boardOriginPx: [number, number];
      }
    | {
          kind: "ringgrid";
          rows: number;
          columns: number;
          markerCount: number;
          drawnMarkerDiameterPx: number;
          drawnMarkerDiameterMm: number;
          codeBandWidthPx: number | null;
          boardOriginPx: [number, number];
      };

export interface ScreenRenderResult {
    /** 8-bit grayscale PNG at exactly `widthPx` x `heightPx`. */
    png: Uint8Array;
    /** Sidecar file content (see `screenTarget.ts`). */
    sidecarJson: string;
    geometry: ScreenGeometry;
    widthPx: number;
    heightPx: number;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
    errors: string[];
    warnings: string[];
    /**
     * Board bounding-box dimensions computed as a side effect of the fit
     * check below. Populated for every target kind whenever `validateConfig`
     * reaches the fit check (i.e. page dimensions/margins are sane) —
     * consumed by `TargetPreview.tsx`'s `computeBoardDims` for the
     * `"ringgrid"` kind, whose true printed footprint requires an async
     * WASM round trip (`ringgridBoardSizeMmWasm`) rather than pure
     * arithmetic, so the render path reads the value `validateConfig`
     * already computed instead of calling WASM again synchronously.
     */
    boardWidthMm?: number;
    boardHeightMm?: number;
}

// ── State ────────────────────────────────────────────────────────────────────

export interface ConfigCache {
    chessboard?: ChessboardConfig;
    charuco?: CharucoConfig;
    markerboard?: MarkerBoardConfig;
    ringgrid?: RingGridConfig;
    puzzleboard?: PuzzleboardConfig;
    puzzlepole?: PuzzlepoleConfig;
}

export interface TargetGeneratorState {
    target: TargetConfig;
    page: PageConfig;
    medium: Medium;
    screen: ScreenSettings;
    /** True once the display size has been prefilled from the browser (done once). */
    screenPrefilled: boolean;
    /** Latest rendered screen target; `null` while rendering or when invalid. */
    screenResult: ScreenRenderResult | null;
    previewSvg: string;
    validation: ValidationResult;
    configCache: ConfigCache;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type TargetGeneratorAction =
    | { type: "SET_TARGET_TYPE"; targetType: TargetType }
    | { type: "UPDATE_CONFIG"; partial: Record<string, unknown> }
    | { type: "UPDATE_PAGE"; partial: Partial<PageConfig> }
    | { type: "SET_PREVIEW"; svg: string; validation: ValidationResult }
    | { type: "SET_MEDIUM"; medium: Medium; displayPx?: { widthPx: number; heightPx: number } | undefined }
    | { type: "UPDATE_SCREEN"; partial: Partial<ScreenSettings> }
    | { type: "SET_SCREEN_PREVIEW"; result: ScreenRenderResult | null; validation: ValidationResult }
    | { type: "LOAD_PRESET"; target: TargetConfig; page: PageConfig };
