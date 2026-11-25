import { CALIB_CHESS_DEFAULTS } from "../../chessDetectorDefaults";
import type { ConfigDocument } from "../../types";

/*
 * The config is `{ chess, params }`: the ChESS corner front-end (`schemas/chess_config.json`)
 * and the chessboard detector (`schemas/chessboard_params.json`), the two documents
 * `detect_chessboard` takes.
 */

/** `default_chessboard_params()` of @vitavision/calib-targets. */
export const CHESSBOARD_DEFAULT_PARAMS: ConfigDocument = {
    min_labeled_corners: 8,
    max_components: 3,
    min_corner_strength: 33,
};

/**
 * The library defaults except `min_corner_strength`: 15 is the app's long-standing value
 * (the library's is 33), and equals the corner front-end's own response floor.
 */
export const initialConfig: ConfigDocument = {
    chess: CALIB_CHESS_DEFAULTS,
    params: { ...CHESSBOARD_DEFAULT_PARAMS, min_corner_strength: 15 },
};

// No presets: they differed only in the expected board size, which is not a detector input.
