import { mergeConfig } from "../../../../../lib/wasm/worker/util";
import { CALIB_CHESS_DEFAULTS } from "../../chessDetectorDefaults";
import type { AlgorithmPreset, ConfigDocument } from "../../types";
import { CHESSBOARD_DEFAULT_PARAMS } from "../chessboard/config";

/*
 * The config is the package's `MarkerBoardParams` document
 * (`schemas/marker_board_params.json`), which carries its own ChESS front-end under `chess`.
 *
 * Circle cells are in the library's convention, "i right, j down": `cell.i` is the COLUMN and
 * `cell.j` the ROW of the board square. (The target generator talks about (row, col); the
 * two must agree about which is which, and the printable document converts on its side.)
 */

/** `default_marker_board_params()` minus `board`, which has no meaningful default (a 6×8 placeholder). */
export const MARKERBOARD_DEFAULTS: ConfigDocument = {
    chess: CALIB_CHESS_DEFAULTS,
    chessboard: CHESSBOARD_DEFAULT_PARAMS,
    circle_score: {
        patch_size: 64,
        ring_thickness_frac: 0.35,
        ring_radius_mul: 1.6,
        min_contrast: 10,
        samples: 48,
        center_search_px: 2,
    },
    match_params: { max_candidates_per_polarity: 6, min_offset_inliers: 3 },
};

/** The disk diameter default of `default_marker_board_params().board`. */
export const MARKERBOARD_CIRCLE_DIAMETER_REL = 0.5;

type Circle = { cell: { i: number; j: number }; polarity: "white" | "black" };

/**
 * The three circles the target generator prints by default, for a board of rows × cols:
 * a white one, a black one below it, a white one to the right of that, near the centre.
 * Polarity follows the generator's parity rule (white when row + col is even).
 */
const circlesAt = (row: number, col: number): [Circle, Circle, Circle] => [
    { cell: { i: col, j: row }, polarity: "white" },
    { cell: { i: col, j: row + 1 }, polarity: "black" },
    { cell: { i: col + 1, j: row + 1 }, polarity: "white" },
];

/**
 * A 22 × 22 board; the bundled sample (public/markerboard.png) has its circles at rows
 * 11-12, cols 11-12. Verified on it: 3 inliers, a runner-up of 2, and an unambiguous
 * identity alignment.
 */
export const initialConfig: ConfigDocument = mergeConfig(MARKERBOARD_DEFAULTS, {
    chess: { threshold: 15 },
    chessboard: { min_corner_strength: 15 },
    board: {
        rows: 22,
        cols: 22,
        circles: circlesAt(11, 11),
        circle_diameter_rel: MARKERBOARD_CIRCLE_DIAMETER_REL,
    },
});

export const presets: AlgorithmPreset[] = [
    {
        label: "22×22 default",
        description: "Standard marker board with centered triangle",
        config: structuredClone(initialConfig),
    },
    {
        label: "10×14 compact",
        description: "Smaller board",
        // Centred like the generator's default for a board this size.
        config: mergeConfig(initialConfig, { board: { rows: 10, cols: 14, circles: circlesAt(4, 6) } }),
    },
];
