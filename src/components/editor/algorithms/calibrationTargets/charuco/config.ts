import { mergeConfig } from "../../../../../lib/wasm/worker/util";
import { CALIB_CHESS_DEFAULTS } from "../../chessDetectorDefaults";
import type { AlgorithmPreset, ConfigDocument } from "../../types";
import { CHESSBOARD_DEFAULT_PARAMS } from "../chessboard/config";

/*
 * The config is the package's `CharucoParams` document (`schemas/charuco_params.json`),
 * which carries its own ChESS front-end under `chess`.
 *
 * `scan.border_bits` and `scan.marker_size_rel` are left out: the detector derives them from
 * the board (`board.border_bits`, `board.marker_size_rel`) and the schema marks the first
 * `readOnly`. The worker takes them from `default_charuco_params(board)` underneath.
 */

/** The library defaults of `default_charuco_params(..)` that do not depend on the board. */
export const CHARUCO_DEFAULTS: ConfigDocument = {
    chess: CALIB_CHESS_DEFAULTS,
    px_per_square: 60,
    chessboard: CHESSBOARD_DEFAULT_PARAMS,
    scan: { inset_frac: 0.06, min_border_score: 0.75, dedup_by_id: true, multi_threshold: true },
    min_marker_inliers: 1,
};

/**
 * A 22 × 22 board of 4.8 mm squares with 4×4 markers (1000 ids). The app keeps the corner
 * floor and the chessboard detector's `min_corner_strength` together at the library's 33
 * (its front-end default is 15), and rectifies markers at 40 px per square (library: 60).
 */
export const initialConfig: ConfigDocument = mergeConfig(CHARUCO_DEFAULTS, {
    chess: { threshold: 33 },
    px_per_square: 40,
    chessboard: { min_corner_strength: 33 },
    board: {
        rows: 22,
        cols: 22,
        cell_size: 4.8,
        marker_size_rel: 0.75,
        dictionary: "DICT_4X4_1000",
        marker_layout: "opencv_charuco",
        border_bits: 1,
    },
});

const withBoard = (board: ConfigDocument): ConfigDocument => mergeConfig(initialConfig, { board });

export const presets: AlgorithmPreset[] = [
    { label: "22×22 4×4", description: "Large board, 4×4 dictionary", config: structuredClone(initialConfig) },
    { label: "10×14 4×4", description: "Medium board, 4×4 dictionary", config: withBoard({ rows: 10, cols: 14 }) },
    {
        label: "6×9 5×5",
        description: "Small board, 5×5 dictionary",
        config: withBoard({ rows: 6, cols: 9, dictionary: "DICT_5X5_250" }),
    },
];
