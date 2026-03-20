import type {
    TargetGeneratorState,
    TargetGeneratorAction,
    ChessboardConfig,
    CharucoConfig,
    MarkerBoardConfig,
    RingGridConfig,
    CircleSpec,
    TargetType,
} from "./types";

/** Compute default circle triangle centered on the board. */
export function defaultCircles(innerRows: number, innerCols: number): CircleSpec[] {
    const totalRows = innerRows + 1;
    const totalCols = innerCols + 1;
    const ci = Math.floor((totalRows - 1) / 2);
    const cj = Math.floor((totalCols - 1) / 2);

    return [
        { cell: { i: ci, j: cj } },
        { cell: { i: ci + 1, j: cj } },
        { cell: { i: ci + 1, j: cj + 1 } },
    ];
}

const DEFAULT_CHESSBOARD: ChessboardConfig = {
    innerRows: 7,
    innerCols: 10,
    squareSizeMm: 20,
    innerSquareRel: 0,
};

const DEFAULT_CHARUCO: CharucoConfig = {
    rows: 8,
    cols: 11,
    squareSizeMm: 20,
    markerSizeRel: 0.75,
    dictionary: "DICT_4X4_250",
    borderBits: 1,
    innerSquareRel: 0,
};

const DEFAULT_MARKERBOARD: MarkerBoardConfig = {
    innerRows: 7,
    innerCols: 10,
    squareSizeMm: 20,
    circleDiameterRel: 0.5,
    circles: defaultCircles(7, 10),
    innerSquareRel: 0,
};

export const DEFAULT_RINGGRID: RingGridConfig = {
    rows: 15,
    longRowCols: 14,
    pitchMm: 8.0,
    markerOuterRadiusMm: 4.8,
    markerInnerRadiusMm: 3.2,
    markerRingWidthMm: 1.152,
    profile: "baseline",
};

export function defaultConfigForType(targetType: string) {
    switch (targetType) {
        case "chessboard":
            return { ...DEFAULT_CHESSBOARD };
        case "charuco":
            return { ...DEFAULT_CHARUCO };
        case "markerboard":
            return { ...DEFAULT_MARKERBOARD, circles: [...DEFAULT_MARKERBOARD.circles] };
        case "ringgrid":
            return { ...DEFAULT_RINGGRID };
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
        orientation: "landscape",
        marginMm: 10,
        pngDpi: 300,
        showScaleLine: true,
    },
    previewSvg: "",
    validation: { errors: [], warnings: [] },
    configCache: {},
};

export function targetGeneratorReducer(
    state: TargetGeneratorState,
    action: TargetGeneratorAction,
): TargetGeneratorState {
    switch (action.type) {
        case "SET_TARGET_TYPE": {
            const cache = {
                ...state.configCache,
                [state.target.targetType]: state.target.config,
            };
            const config = cache[action.targetType as TargetType] ?? defaultConfigForType(action.targetType);
            return {
                ...state,
                configCache: cache,
                target: { targetType: action.targetType, config } as TargetGeneratorState["target"],
            };
        }
        case "UPDATE_CONFIG": {
            const merged = { ...state.target.config, ...action.partial };

            // Auto-center circles when markerboard dimensions change
            if (state.target.targetType === "markerboard") {
                const prev = state.target.config as MarkerBoardConfig;
                const next = merged as MarkerBoardConfig;
                const dimsChanged =
                    ("innerRows" in action.partial && action.partial.innerRows !== prev.innerRows) ||
                    ("innerCols" in action.partial && action.partial.innerCols !== prev.innerCols);
                if (dimsChanged && !("circles" in action.partial)) {
                    next.circles = defaultCircles(next.innerRows, next.innerCols);
                }
            }

            return {
                ...state,
                target: {
                    ...state.target,
                    config: merged,
                } as TargetGeneratorState["target"],
            };
        }
        case "LOAD_PRESET":
            return {
                ...state,
                target: action.target,
                page: action.page,
            };
        case "UPDATE_PAGE":
            return {
                ...state,
                page: { ...state.page, ...action.partial },
            };
        case "SET_PREVIEW":
            return {
                ...state,
                previewSvg: action.svg,
                validation: action.validation,
            };
    }
}
