import { mergeConfig } from "../../../../lib/wasm/worker/util";
import { CALIB_CHESS_DEFAULTS } from "../chessDetectorDefaults";
import type { AlgorithmPreset, ConfigDocument } from "../types";
import { CHESSBOARD_DEFAULT_PARAMS } from "../calibrationTargets/chessboard/config";

/*
 * The config is the package's `PuzzleBoardParams` document (`schemas/puzzleboard_params.json`),
 * which carries its own ChESS front-end under `chess`.
 */

/** The library defaults of `default_puzzleboard_params(..)` that do not depend on the board. */
export const PUZZLEBOARD_DEFAULTS: ConfigDocument = {
    chess: CALIB_CHESS_DEFAULTS,
    px_per_square: 60,
    chessboard: CHESSBOARD_DEFAULT_PARAMS,
    decode: {
        min_window: 7,
        min_bit_confidence: 0.15,
        max_bit_error_rate: 0.3,
        search_all_components: true,
        sample_radius_rel: 0.16666667,
        search_mode: { kind: "full" },
        scoring_mode: { kind: "soft_log_likelihood" },
        symmetry_mode: { kind: "rotations" },
    },
};

/**
 * A 10 × 10 board of 15 mm squares. Where the app departs from the library: a smaller
 * decode window (4; library 7) and the chessboard detector's corner floor of 15 (library 33).
 */
export const initialConfig: ConfigDocument = mergeConfig(PUZZLEBOARD_DEFAULTS, {
    chessboard: { min_corner_strength: 15 },
    board: { rows: 10, cols: 10, cell_size: 15, origin_row: 0, origin_col: 0 },
    decode: { min_window: 4, sample_radius_rel: 1 / 6 },
});

export const presets: AlgorithmPreset[] = [
    {
        label: "Default",
        description: "Full master-pattern scan — works regardless of printed origin",
        config: structuredClone(initialConfig),
    },
    {
        label: "Strict bit check",
        description: "Higher bit confidence, lower error tolerance",
        config: mergeConfig(initialConfig, { decode: { min_bit_confidence: 0.25, max_bit_error_rate: 0.15 } }),
    },
    {
        label: "Fixed board (fast)",
        description: "Restrict decode to the configured rows × cols at origin (fastest; requires correct origin_row/col)",
        config: mergeConfig(initialConfig, { decode: { search_mode: { kind: "fixed_board" } } }),
    },
];
