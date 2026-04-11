import type { DictionaryName } from "../../lib/types";

// ── Target type discriminator ────────────────────────────────────────────────

export type TargetType = "chessboard" | "charuco" | "markerboard" | "ringgrid";

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
    circles: CircleSpec[];
    innerSquareRel: number;
}

export type RingGridProfile = "baseline" | "extended";

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
    | { targetType: "ringgrid"; config: RingGridConfig };

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
}

// ── State ────────────────────────────────────────────────────────────────────

export interface ConfigCache {
    chessboard?: ChessboardConfig;
    charuco?: CharucoConfig;
    markerboard?: MarkerBoardConfig;
    ringgrid?: RingGridConfig;
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
