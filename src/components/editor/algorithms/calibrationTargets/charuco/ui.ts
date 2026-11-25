import type { UiGroup } from "@vitavision/forms";

import { boardUi, chessDetectorPaths, chessboardKnobPaths, chessboardTuningPath } from "../../chessDetectorUi";
import { readOnlyPaths } from "../../schemaTools";
import { schema } from "./schema";

/** `DICT_4X4_1000` -> `4×4 (1000)`, `DICT_APRILTAG_36h11` -> `AprilTag 36h11`. */
function dictionaryLabel(name: string): string {
    const grid = /^DICT_(\d)X(\d)_(\d+)$/.exec(name);
    if (grid) return `${grid[1]}×${grid[2]} (${grid[3]})`;
    const tag = /^DICT_APRILTAG_(\w+)$/.exec(name);
    if (tag) return `AprilTag ${tag[1]}`;
    if (name === "DICT_ARUCO_ORIGINAL") return "ArUco original";
    const mip = /^DICT_ARUCO_MIP_(\w+)$/.exec(name);
    if (mip) return `ArUco MIP ${mip[1]}`;
    return name;
}

const dictionaries = (schema.$defs?.Dictionary?.enum ?? []) as string[];

const groups: UiGroup[] = [
    {
        id: "board",
        title: "Board",
        fields: [
            "board.rows",
            "board.cols",
            "board.cell_size",
            "board.marker_size_rel",
            "board.dictionary",
            "board.border_bits",
        ],
    },
    { id: "decoding", title: "Marker decoding", collapsible: true, fields: ["px_per_square"] },
    { id: "chessboard", title: "Chessboard detector", collapsible: true, fields: chessboardKnobPaths("chessboard") },
    { id: "corners", title: "Corner detector", collapsible: true, fields: chessDetectorPaths("chess") },
    {
        id: "advanced",
        title: "Advanced",
        collapsible: true,
        fields: ["inset_frac", "min_marker_inliers", chessboardTuningPath("chessboard"), "advanced"],
    },
];

/**
 * Fields deliberately not offered, beyond the corner detector's strategy selector; the schema's other
 * fields are all in a group. The only marker layout there is, and whatever the schema marks `readOnly`.
 */
export const { hiddenPaths, ui } = boardUi({
    schema,
    groups,
    chessboardPrefix: "chessboard",
    extraHidden: ["board.marker_layout", ...readOnlyPaths(schema)],
    fields: {
        "board.rows": { label: "Rows", hint: "Total number of rows of squares on the ChArUco board." },
        "board.cols": { label: "Cols", hint: "Total number of columns of squares on the ChArUco board." },
        "board.cell_size": {
            label: "Cell size",
            unit: "mm",
            hint: "Physical size of one board square in millimeters. Used for metric calibration.",
        },
        "board.marker_size_rel": {
            label: "Marker size (relative)",
            hint: "ArUco marker size as a fraction of the cell size (0.1-0.99). Larger markers are easier to detect.",
        },
        "board.dictionary": {
            label: "Dictionary",
            hint: "ArUco marker dictionary encoding. Must match the dictionary used to print the board.",
            enumLabels: Object.fromEntries(dictionaries.map((name) => [name, dictionaryLabel(name)])),
        },
        "board.border_bits": {
            label: "Border bits",
            hint: "ArUco quiet-zone width in marker bits, as printed on the physical board. This describes the board, not a scan-time tuning knob — the detector derives its scan border width from this value.",
        },
        px_per_square: {
            label: "Pixels per square",
            hint: "Size of the rectified cell (in pixels) used to read ArUco marker codes. Higher values improve decode accuracy at the cost of speed.",
        },
        inset_frac: {
            label: "Inset fraction",
            hint: "Fraction of a marker bit cell ignored next to each cell edge when sampling marker pixels (0–0.5). Higher → safer sampling, less likely to overlap neighbouring ink. Library default: 0.06.",
        },
        min_marker_inliers: {
            label: "Min marker inliers",
            hint: "Minimum number of decoded markers required to accept the board.",
        },
        advanced: {
            label: "ChArUco tuning",
            hint: "Board-level matcher and corner-validation tuning knobs. Unstable: not covered by the library's semver, and best left off unless a specific image fails.",
        },
    },
});
