import type { DictionaryName } from "../../lib/api";

// ── Target type discriminator ────────────────────────────────────────────────

export type TargetType = "chessboard" | "charuco" | "markerboard";

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

export type TargetConfig =
    | { targetType: "chessboard"; config: ChessboardConfig }
    | { targetType: "charuco"; config: CharucoConfig }
    | { targetType: "markerboard"; config: MarkerBoardConfig };

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
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
    errors: string[];
    warnings: string[];
}

// ── State ────────────────────────────────────────────────────────────────────

export interface TargetGeneratorState {
    target: TargetConfig;
    page: PageConfig;
    previewSvg: string;
    validation: ValidationResult;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type TargetGeneratorAction =
    | { type: "SET_TARGET_TYPE"; targetType: TargetType }
    | { type: "UPDATE_CONFIG"; partial: Record<string, unknown> }
    | { type: "UPDATE_PAGE"; partial: Partial<PageConfig> }
    | { type: "SET_PREVIEW"; svg: string; validation: ValidationResult }
    | { type: "LOAD_PRESET"; target: TargetConfig; page: PageConfig };
