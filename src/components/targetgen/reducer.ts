import type {
    TargetGeneratorState,
    TargetGeneratorAction,
    ChessboardConfig,
    CharucoConfig,
    MarkerBoardConfig,
} from "./types";

const DEFAULT_CHESSBOARD: ChessboardConfig = {
    innerRows: 7,
    innerCols: 10,
    squareSizeMm: 20,
};

const DEFAULT_CHARUCO: CharucoConfig = {
    rows: 8,
    cols: 11,
    squareSizeMm: 20,
    markerSizeRel: 0.75,
    dictionary: "DICT_4X4_250",
    borderBits: 1,
};

const DEFAULT_MARKERBOARD: MarkerBoardConfig = {
    innerRows: 7,
    innerCols: 10,
    squareSizeMm: 20,
    circleDiameterRel: 0.5,
};

export function defaultConfigForType(targetType: string) {
    switch (targetType) {
        case "chessboard":
            return { ...DEFAULT_CHESSBOARD };
        case "charuco":
            return { ...DEFAULT_CHARUCO };
        case "markerboard":
            return { ...DEFAULT_MARKERBOARD };
        default:
            return { ...DEFAULT_CHESSBOARD };
    }
}

export const INITIAL_STATE: TargetGeneratorState = {
    target: { targetType: "chessboard", config: { ...DEFAULT_CHESSBOARD } },
    page: {
        sizeKind: "a4",
        customWidthMm: 210,
        customHeightMm: 297,
        orientation: "portrait",
        marginMm: 10,
    },
    previewSvg: "",
    validation: { errors: [], warnings: [] },
    finalSvg: null,
    configJson: null,
    generationStatus: "idle",
};

export function targetGeneratorReducer(
    state: TargetGeneratorState,
    action: TargetGeneratorAction,
): TargetGeneratorState {
    switch (action.type) {
        case "SET_TARGET_TYPE": {
            const config = defaultConfigForType(action.targetType);
            return {
                ...state,
                target: { targetType: action.targetType, config } as TargetGeneratorState["target"],
                finalSvg: null,
                configJson: null,
                generationStatus: "idle",
                errorMessage: undefined,
            };
        }
        case "UPDATE_CONFIG":
            return {
                ...state,
                target: {
                    ...state.target,
                    config: { ...state.target.config, ...action.partial },
                } as TargetGeneratorState["target"],
                finalSvg: null,
                configJson: null,
                generationStatus: "idle",
                errorMessage: undefined,
            };
        case "UPDATE_PAGE":
            return {
                ...state,
                page: { ...state.page, ...action.partial },
                finalSvg: null,
                configJson: null,
                generationStatus: "idle",
                errorMessage: undefined,
            };
        case "SET_PREVIEW":
            return {
                ...state,
                previewSvg: action.svg,
                validation: action.validation,
            };
        case "GENERATION_START":
            return {
                ...state,
                generationStatus: "generating",
                errorMessage: undefined,
            };
        case "GENERATION_SUCCESS":
            return {
                ...state,
                generationStatus: "success",
                finalSvg: action.svg,
                configJson: action.configJson,
            };
        case "GENERATION_ERROR":
            return {
                ...state,
                generationStatus: "error",
                errorMessage: action.message,
            };
    }
}
