/*
 * The editor's data colours: what a feature IS listed in, not the chrome around it.
 *
 * These are literal on purpose (and exempt from the tokens-only lint rule). A feature's colour
 * is part of the feature: it is stored on it (`feature.color`), exported with it, and shown as its
 * swatch in the feature list, and has to keep its hue whatever the page theme does — a hand-drawn
 * bounding box is amber in the exported JSON on either theme.
 *
 * It is not what the image canvas paints. The canvas draws in the stage's overlay roles
 * (`@vitavision/stage2d`: feature, model, structure, selection), which are one set of colours on
 * either theme and never a score.
 */

/** Default colour of each hand-drawn annotation, by tool. Stored on the feature it creates. */
export const ANNOTATION_COLORS = {
    point: "#ff0000",
    line: "#00ffff",
    polyline: "#00ff00",
    polygon: "#8b5cf6",
    bbox: "#ffaa00",
    ellipse: "#ff00ff",
} as const;

/** The detection overlays: the swatch of each kind of detected thing in the feature list. */
export const DETECTION_COLORS = {
    /** A detected grid corner (chessboard, ChArUco, marker board, PuzzleBoard). */
    corner: "#f97316",
    /** A decoded ArUco marker, and a marker board's circles. */
    marker: "#b45309",
    /** A directed point's list swatch. */
    directedPoint: "#60a5fa",
    /** Any other feature without a colour of its own. */
    fallback: "#94a3b8",
} as const;

/** The ringgrid swatch: its outer ring. */
export const RING_COLORS = {
    outer: "#0f766e",
} as const;
