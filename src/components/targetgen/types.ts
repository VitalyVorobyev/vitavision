import type { DictionaryName } from "../../lib/types";

// ── Target type discriminator ────────────────────────────────────────────────

export type TargetType = "chessboard" | "charuco" | "markerboard" | "ringgrid" | "puzzleboard";

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
    | { targetType: "puzzleboard"; config: PuzzleboardConfig };

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
}

export interface TargetGeneratorState {
    target: TargetConfig;
    page: PageConfig;
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
    | { type: "LOAD_PRESET"; target: TargetConfig; page: PageConfig };
