import type { UiGroup } from "@vitavision/forms";

import {
    boardUi,
    chessDetectorPaths,
    chessboardKnobPaths,
    chessboardTuningPath,
} from "../../chessDetectorUi";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "board", title: "Board", fields: ["board.rows", "board.cols", "board.circle_diameter_rel"] },
    { id: "circles", title: "Expected circles", fields: ["board.circles"] },
    { id: "chessboard", title: "Chessboard detector", collapsible: true, fields: chessboardKnobPaths("chessboard") },
    { id: "corners", title: "Corner detector", collapsible: true, fields: chessDetectorPaths("chess") },
    {
        id: "score",
        title: "Circle score",
        collapsible: true,
        fields: [
            "circle_score.patch_size",
            "circle_score.ring_thickness_frac",
            "circle_score.ring_radius_mul",
            "circle_score.min_contrast",
            "circle_score.samples",
            "circle_score.center_search_px",
        ],
    },
    {
        id: "advanced",
        title: "Advanced",
        collapsible: true,
        fields: [
            "match_params.max_candidates_per_polarity",
            "match_params.min_offset_inliers",
            "board.cell_size",
            "roi_cells",
            chessboardTuningPath("chessboard"),
        ],
    },
];

export const { hiddenPaths, ui } = boardUi({
    schema,
    groups,
    chessboardPrefix: "chessboard",
    fields: {
        "board.rows": { label: "Rows", hint: "Total number of rows of squares on the marker board." },
        "board.cols": { label: "Cols", hint: "Total number of columns of squares on the marker board." },
        "board.circle_diameter_rel": {
            label: "Circle diameter",
            hint: "Printed disk diameter as a fraction of the square side. All circle-scoring radii are relative to it, so it must match the board as printed. Library default: 0.5.",
        },
        "board.circles": {
            widget: "tuple-row",
            label: "Circles",
            hint: "The three marker circles that break the board's 4-fold rotational symmetry. A cell is a square of the board: i counts columns to the right, j counts rows downward, both from the top-left square.",
        },
        "board.circles.*.cell": { label: "Cell" },
        "board.circles.*.cell.i": { label: "Column (i)" },
        "board.circles.*.cell.j": { label: "Row (j)" },
        "board.circles.*.polarity": { label: "Polarity" },
        "circle_score.patch_size": {
            label: "Patch size",
            hint: "Size of the image patch extracted around each candidate circle for scoring.",
        },
        "circle_score.ring_thickness_frac": {
            label: "Ring thickness fraction",
            hint: "Thickness of the scoring ring as a fraction of the circle radius.",
        },
        "circle_score.ring_radius_mul": {
            label: "Ring radius multiplier",
            hint: "Multiplier for the outer scoring ring radius relative to the circle edge.",
        },
        "circle_score.min_contrast": {
            label: "Min contrast",
            hint: "Minimum intensity contrast between circle and background to accept a candidate.",
        },
        "circle_score.samples": {
            label: "Samples",
            hint: "Number of angular samples taken along the scoring ring.",
        },
        "circle_score.center_search_px": {
            label: "Center search",
            hint: "Pixel radius for subpixel circle center refinement search.",
        },
        "match_params.max_candidates_per_polarity": {
            label: "Max candidates per polarity",
            hint: "Maximum number of circle candidates kept per polarity (white/black) before matching. Higher → more thorough but slower.",
        },
        "match_params.min_offset_inliers": {
            label: "Min offset inliers",
            hint: "Expected circles that must agree on one board frame. The three circles exist only to break the board's 4-fold rotational symmetry, so fewer than all three cannot fix the orientation.",
            max: 3,
        },
        "board.cell_size": {
            label: "Cell size",
            hint: "Optional physical size of one square (any unit). When set, detected corners carry their position on the board in that unit.",
        },
        roi_cells: {
            label: "Circle search region",
            hint: "Optional region, in board squares, that restricts the circle search: the corner squares (i0, j0) and (i1, j1).",
        },
        "roi_cells.0": { label: "i0" },
        "roi_cells.1": { label: "j0" },
        "roi_cells.2": { label: "i1" },
        "roi_cells.3": { label: "j1" },
    },
});
