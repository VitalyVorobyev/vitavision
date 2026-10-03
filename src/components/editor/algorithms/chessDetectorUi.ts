import type { FieldUi } from "@vitavision/forms";

/*
 * The ChESS corner front-end is one document, `DetectorConfig`, wherever it appears: it IS
 * the chess-corners config, and it is the `chess` block of every calib-targets params
 * document. Its labels, hints and paths live here once; each algorithm's UiSchema places
 * them under its own prefix ("" for chess-corners, "chess" for the board detectors).
 *
 * The detector `strategy` (ChESS or Radon) is not offered: Radon reads `threshold` as a
 * fraction of the frame maximum instead of an absolute response floor, so every hint and
 * default here would be wrong for it. The ChESS knobs inside `strategy.chess` are listed
 * leaf by leaf, and the selector itself is hidden.
 */

const at = (prefix: string, path: string): string => (prefix === "" ? path : `${prefix}.${path}`);

/** The paths of the detector's primary knobs: what "Detection" shows. */
export function chessDetectionPaths(prefix: string): string[] {
    return [
        at(prefix, "threshold"),
        at(prefix, "detection.nms_radius"),
        at(prefix, "detection.min_cluster_size"),
        at(prefix, "strategy.chess.ring"),
    ];
}

/** The path of the coarse-to-fine pyramid block. */
export const chessPyramidPath = (prefix: string): string => at(prefix, "multiscale");

/** The paths of the detector's tuning knobs, behind "Advanced". */
export function chessAdvancedPaths(prefix: string): string[] {
    return [
        at(prefix, "upscale"),
        at(prefix, "strategy.chess.refiner"),
        at(prefix, "orientation_method"),
        at(prefix, "merge_radius"),
    ];
}

/** Every path the detector contributes, in the order the standalone form shows them. */
export const chessDetectorPaths = (prefix: string): string[] => [
    ...chessDetectionPaths(prefix),
    chessPyramidPath(prefix),
    ...chessAdvancedPaths(prefix),
];

/** Labels, hints and widgets under `prefix`. */
export function chessDetectorFields(prefix: string): Record<string, FieldUi> {
    const entries: Array<[string, FieldUi]> = [
        [
            "threshold",
            {
                label: "Response threshold",
                hint: "Absolute floor on the raw ChESS response. Lower values detect more corners but may increase false positives.",
            },
        ],
        [
            "detection.nms_radius",
            { label: "NMS radius", hint: "Non-maximum suppression radius in pixels. Prevents duplicate detections." },
        ],
        [
            "detection.min_cluster_size",
            {
                label: "Min cluster size",
                hint: "Minimum number of pixels in a detected cluster to accept a corner candidate.",
            },
        ],
        [
            "strategy.chess.ring",
            {
                label: "Detector ring",
                hint: "Canonical samples the paper's radius-5 ring. Broad samples a radius-10 ring: a wider search window for better recall, at the cost of more false positives.",
                enumLabels: { canonical: "Canonical", broad: "Broad" },
            },
        ],
        [
            "multiscale",
            {
                label: "Multiscale",
                hint: "Single scale runs the detector once on the full image. Pyramid detects seeds on a coarse level and refines them into the base image.",
                enumLabels: { single_scale: "Single scale", pyramid: "Pyramid" },
            },
        ],
        ["multiscale.pyramid.levels", { label: "Pyramid levels", hint: "Number of image pyramid levels for multiscale detection." }],
        [
            "multiscale.pyramid.min_size",
            { label: "Pyramid min size", hint: "Minimum image dimension at the coarsest pyramid level (pixels)." },
        ],
        [
            "multiscale.pyramid.refinement_radius",
            {
                label: "Refinement radius",
                hint: "Half-radius of the window, at the coarse level, in which each seed is refined into the base image.",
            },
        ],
        [
            "upscale",
            {
                label: "Upscale",
                hint: "Optional integer upscaling before detection, for detecting corners in very small images. Off, or a factor of 2, 3 or 4.",
                enumLabels: { disabled: "Off", fixed: "Fixed factor" },
            },
        ],
        ["upscale.fixed", { label: "Factor", unit: "×" }],
        [
            "strategy.chess.refiner",
            {
                label: "Refiner",
                hint: "Subpixel refinement method applied after initial corner detection.",
                widget: "select",
                enumLabels: { center_of_mass: "Center of mass", forstner: "Förstner", saddle_point: "Saddle point" },
            },
        ],
        [
            "orientation_method",
            {
                label: "Orientation method",
                hint: "How the two grid axes are fitted at each corner. Ring fit suits ordinary chessboards; disk fit suits strong projective skew. None skips the fit.",
                enumLabels: { ring_fit: "Ring fit", disk_fit: "Disk fit" },
            },
        ],
        [
            "merge_radius",
            {
                label: "Merge radius",
                hint: "Two refined corners closer than this are merged into one: raise it to remove duplicates, lower it if distinct corners get merged.",
            },
        ],
    ];
    return Object.fromEntries(entries.map(([path, ui]) => [at(prefix, path), ui]));
}

/** The detector strategy selector, which is not offered (see the note at the top). */
export const chessDetectorHidden = (prefix: string): string[] => [at(prefix, "strategy")];

/*
 * The chessboard-detector block (`ChessboardParams`) the board detectors share: its three
 * stable knobs, and the opt-in `advanced` tuning block behind a switch.
 */

/** The paths of the three stable knobs of a `ChessboardParams` document at `prefix`. */
export const chessboardKnobPaths = (prefix: string): string[] => [
    at(prefix, "min_corner_strength"),
    at(prefix, "min_labeled_corners"),
    at(prefix, "max_components"),
];

/** The path of the opt-in, unstable tuning block of a `ChessboardParams` document at `prefix`. */
export const chessboardTuningPath = (prefix: string): string => at(prefix, "advanced");

/** Labels and hints for a `ChessboardParams` document at `prefix`. */
export function chessboardFields(prefix: string): Record<string, FieldUi> {
    const entries: Array<[string, FieldUi]> = [
        [
            "min_corner_strength",
            {
                label: "Min corner strength",
                hint: "Absolute floor on the raw ChESS response. Lower values detect weaker corners but may increase false positives.",
            },
        ],
        [
            "min_labeled_corners",
            {
                label: "Min labeled corners",
                hint: "Fewest grid-labeled corners a detected board component may have. Raise it to ignore small fragments. Library default: 8.",
            },
        ],
        [
            "max_components",
            {
                label: "Max components",
                hint: "Most separate grid components returned per image. Library default: 3.",
            },
        ],
        [
            "advanced",
            {
                label: "Chessboard tuning",
                hint: "Per-stage tuning knobs of the chessboard detector. Unstable: not covered by the library's semver, and best left off unless a specific image fails. Off keeps the precision-by-construction defaults.",
            },
        ],
    ];
    return Object.fromEntries(entries.map(([path, ui]) => [at(prefix, path), ui]));
}
