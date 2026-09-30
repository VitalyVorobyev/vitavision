/*
 * The editor's data colours: what a feature IS drawn in, not the chrome around it.
 *
 * These are literal on purpose (and exempt from the tokens-only lint rule). A feature's colour
 * is part of the feature: it is stored on it (`feature.color`), exported with it, shown as its
 * swatch in the feature list, and has to keep its hue whatever the page theme does — a hand-drawn
 * bounding box is amber in the exported JSON on either theme, and a detector's grid rows and
 * columns are told apart by hue on any photograph.
 *
 * Chrome drawn on the canvas — selection, hover, halos, labels, verdict (score) colours — comes
 * from the ui tokens instead, through `useCanvasTokens` in `src/lib/canvasTokens.ts`.
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

/** The detection overlays: what each detected thing is drawn in. */
export const DETECTION_COLORS = {
    /** A detected grid corner (chessboard, ChArUco, marker board, PuzzleBoard). */
    corner: "#f97316",
    /** Grid edges along a row, and along a column: the two board axes. */
    gridRow: "#f97316",
    gridCol: "#38bdf8",
    /** A decoded ArUco marker: its outline and its tint. */
    marker: "#b45309",
    markerTint: "#d97706",
    /** A radial-symmetry proposal's radius, drawn dashed around its centre. */
    symmetryRadius: "#3b82f6",
    /** A directed point's list swatch (the glyph itself is coloured by its score). */
    directedPoint: "#60a5fa",
    /** Any other feature without a colour of its own. */
    fallback: "#94a3b8",
} as const;

/** The ringgrid palette: outer and inner ring, and the centre dot. */
export const RING_COLORS = {
    outer: "#0f766e",
    inner: "#b45309",
    center: "#f8fafc",
    centerAccent: "#0f766e",
} as const;

/**
 * The printed polarity of a target element — a white or a black circle or dot — as the
 * overlay outlines it on the photograph.
 */
export const POLARITY_COLORS = {
    white: "#f8fafc",
    black: "#0f172a",
    /** PuzzleBoard edge dots: white (bit 1) and black (bit 0). */
    whiteBit: "#38bdf8",
    blackBit: "#f97316",
} as const;
