import type { UiGroup, UiSchema } from "@vitavision/forms";

import {
    chessDetectorFields,
    chessDetectorHidden,
    chessDetectorPaths,
    chessboardFields,
    chessboardKnobPaths,
    chessboardTuningPath,
} from "../chessDetectorUi";
import { hidden, hideContainers } from "../schemaTools";
import { schema } from "./schema";

const groups: UiGroup[] = [
    {
        id: "board",
        title: "Board",
        fields: ["board.rows", "board.cols", "board.cell_size", "board.origin_row", "board.origin_col"],
    },
    {
        id: "decoding",
        title: "Decoding",
        collapsible: true,
        fields: [
            "decode.min_window",
            "decode.min_bit_confidence",
            "decode.max_bit_error_rate",
            "decode.sample_radius_rel",
            "decode.search_all_components",
            "decode.search_mode",
            "decode.scoring_mode",
        ],
    },
    {
        id: "chessboard",
        title: "Chessboard",
        collapsible: true,
        fields: ["px_per_square", ...chessboardKnobPaths("chessboard")],
    },
    { id: "corners", title: "Corner detector", collapsible: true, fields: chessDetectorPaths("chess") },
    {
        id: "advanced",
        title: "Advanced",
        collapsible: true,
        fields: ["decode.symmetry_mode", "decode.advanced", chessboardTuningPath("chessboard")],
    },
];

/** Fields deliberately not offered; the schema's other fields are all in a group. */
export const hiddenPaths: string[] = [...chessDetectorHidden("chess")];

export const ui: UiSchema = {
    groups,
    fields: {
        ...chessDetectorFields("chess"),
        ...chessboardFields("chessboard"),
        "board.rows": { label: "Rows", hint: "Number of rows of squares on the PuzzleBoard." },
        "board.cols": { label: "Cols", hint: "Number of columns of squares on the PuzzleBoard." },
        "board.cell_size": { label: "Cell size", unit: "mm", hint: "Physical size of one board square in millimeters." },
        "board.origin_row": {
            label: "Origin row",
            hint: "Row offset of the board origin within the master pattern grid.",
        },
        "board.origin_col": {
            label: "Origin col",
            hint: "Column offset of the board origin within the master pattern grid.",
        },
        "decode.min_window": { label: "Min window", hint: "Minimum window size (in corners) for bit sampling." },
        "decode.min_bit_confidence": {
            label: "Min bit confidence",
            hint: "Minimum confidence per bit sample (0–1). Higher values reject ambiguous bits.",
        },
        "decode.max_bit_error_rate": {
            label: "Max bit error rate",
            hint: "Maximum fraction of bits allowed to be wrong (0–1).",
        },
        "decode.sample_radius_rel": {
            label: "Sample radius (relative)",
            hint: "Sampling radius as a fraction of the cell size (0–0.5).",
            max: 0.5,
        },
        "decode.search_all_components": {
            label: "Search all components",
            hint: "When enabled, decode is attempted on all detected connected components.",
            widget: "checkbox",
        },
        "decode.search_mode": {
            label: "Search mode",
            hint: "Full scan tries every aligned offset within the master pattern (default — works for any printed sub-board). Fixed board restricts decode to the configured rows × cols at origin_row/col (faster but only succeeds when those match the printed board).",
            enumLabels: { fixed_board: "Fixed board", full: "Full scan" },
        },
        "decode.scoring_mode": {
            label: "Scoring mode",
            hint: "Soft log-likelihood weights each bit by its confidence (default). Hard weighted treats every bit equally — useful when bit confidences are noisy.",
            enumLabels: { soft_log_likelihood: "Soft log-likelihood", hard_weighted: "Hard weighted" },
        },
        "decode.symmetry_mode": {
            label: "Symmetry mode",
            hint: "Which board orientations the decoder may consider: rotations only (an ordinary camera), or rotations and mirror images (the board seen through a mirror).",
            enumLabels: { rotations: "Rotations", rotations_and_reflections: "With reflections" },
        },
        "decode.advanced": {
            label: "Decoder tuning",
            hint: "Soft-scorer and consensus tuning knobs of the decoder. Unstable: not covered by the library's semver, and best left off unless a specific image fails.",
        },
        px_per_square: { label: "Pixels per square", hint: "Rectified cell size in pixels used for corner detection." },
        ...hidden(...hiddenPaths),
        ...hideContainers(schema, groups),
    },
};
