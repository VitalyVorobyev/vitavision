import type { Feature } from "./editorTypes";

/**
 * The feature file format. Version 1 (a bare JSON array, no `version`) stored coordinates with the
 * corner of pixel 0 at 0 and its centre at 0.5, because the editor painted the image at (0, 0) and
 * the adapters added 0.5 to every detector position. Version 2
 * (`{ version: 2, features: [...] }`) stores coordinates with the centre of pixel `i` at `i`:
 * the detectors' own frame (`image_px_center`) and the one `@vitavision/stage2d` draws in.
 */
export const FEATURE_FILE_VERSION = 2;

/** What a version 1 coordinate adds to a version 2 one (corner-of-pixel-0 origin to centre-of-pixel-0 origin). */
export const V1_TO_V2_SHIFT = -0.5;

const shift = (value: number): number => value + V1_TO_V2_SHIFT;

/** Shift a flat `[x0, y0, x1, y1, …]` list; the result keeps the length of its input (and so a tuple type). */
function shiftFlat<T extends readonly number[]>(points: T): { -readonly [K in keyof T]: number } {
    return points.map(shift) as { -readonly [K in keyof T]: number };
}

/**
 * Detections a version 1 file already stored in the detector's own frame: the PuzzleBoard
 * adapter never added the 0.5, so its features need no shift.
 */
const NATIVE_IN_V1 = new Set(["puzzleboard"]);

/**
 * Move one version 1 feature into the version 2 frame: its pixel coordinates shift by -0.5.
 * Lengths (radii, widths, heights), angles, directions, scores and board millimetres do not.
 */
function migrateFeatureV1(feature: Feature): Feature {
    if (feature.algorithmId !== undefined && NATIVE_IN_V1.has(feature.algorithmId)) return feature;
    switch (feature.type) {
        case "point":
        case "bbox":
        case "ellipse":
        case "directed_point":
        case "circle":
        case "labeled_point":
            return { ...feature, x: shift(feature.x), y: shift(feature.y) };
        case "line":
        case "polyline":
        case "polygon":
            return { ...feature, points: shiftFlat(feature.points) } as Feature;
        case "ring_marker":
            // The ringgrid adapter added 0.5 to the marker centre but copied the fitted
            // ellipses' centres as the detector reported them, so only the centre moves.
            return { ...feature, x: shift(feature.x), y: shift(feature.y) };
        case "aruco_marker":
            return {
                ...feature,
                x: shift(feature.x),
                y: shift(feature.y),
                corners: shiftFlat(feature.corners),
            };
    }
}

/**
 * The features of a version 1 file, as version 2 features: the coordinates version 1 offset by
 * 0.5 shift back by -0.5 (see `FEATURE_FILE_VERSION`). Pure; the input is not changed.
 */
export function migrateFeaturesV1(features: readonly Feature[]): Feature[] {
    return features.map(migrateFeatureV1);
}
