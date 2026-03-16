import type { DictionaryName } from "../../lib/api";

// ── Target type discriminator ────────────────────────────────────────────────

export type TargetType = "chessboard" | "charuco" | "markerboard";

// ── Per-type config ──────────────────────────────────────────────────────────

export interface ChessboardConfig {
    innerRows: number;
    innerCols: number;
    squareSizeMm: number;
}

export interface CharucoConfig {
    rows: number;
    cols: number;
    squareSizeMm: number;
    markerSizeRel: number;
    dictionary: DictionaryName;
    borderBits: number;
}

export interface MarkerBoardConfig {
    innerRows: number;
    innerCols: number;
    squareSizeMm: number;
    circleDiameterRel: number;
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
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
    errors: string[];
    warnings: string[];
}

// ── State ────────────────────────────────────────────────────────────────────

export type GenerationStatus = "idle" | "generating" | "success" | "error";

export interface TargetGeneratorState {
    target: TargetConfig;
    page: PageConfig;
    previewSvg: string;
    validation: ValidationResult;
    finalSvg: string | null;
    configJson: string | null;
    generationStatus: GenerationStatus;
    errorMessage?: string;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type TargetGeneratorAction =
    | { type: "SET_TARGET_TYPE"; targetType: TargetType }
    | { type: "UPDATE_CONFIG"; partial: Record<string, unknown> }
    | { type: "UPDATE_PAGE"; partial: Partial<PageConfig> }
    | { type: "SET_PREVIEW"; svg: string; validation: ValidationResult }
    | { type: "LOAD_PRESET"; target: TargetConfig; page: PageConfig }
    | { type: "GENERATION_START" }
    | { type: "GENERATION_SUCCESS"; svg: string; configJson: string }
    | { type: "GENERATION_ERROR"; message: string };
