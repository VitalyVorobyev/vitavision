import type { AlgorithmsKind } from "../hooks/useAlgorithmsFilters.ts";

export interface AtlasTile {
    id: string;
    /** Unicode glyph or short emoji-style symbol used as a low-res icon. */
    icon: string;
    title: string;
    description: string;
    /** Filter set applied when the tile is clicked. `categoryId` only applies for non-"all" kinds. */
    apply: { kind?: AlgorithmsKind; categoryId?: string; tags?: string[] };
}

/**
 * Default 6 tiles surfaced on the first-visit landing.
 *
 * Tile filter sets are validated against real content in
 * `src/content/atlas-trails.test.ts` — every tile must return ≥3 entries on
 * the live atlas, otherwise the test fails. This catches drift when content
 * is added or categories renamed.
 */
export const atlasTiles: AtlasTile[] = [
    {
        id: "calibrate",
        icon: "📷",
        title: "Calibrate a camera",
        description: "Intrinsics, distortion, board-detection algorithms.",
        apply: { kind: "algorithm", tags: ["calibration"] },
    },
    {
        id: "detect-features",
        icon: "✦",
        title: "Detect features",
        description: "Corners, blobs, edges. Comparison-ready.",
        apply: { kind: "algorithm", tags: ["feature-detection"] },
    },
    {
        id: "find-checkerboards",
        icon: "▦",
        title: "Find checkerboards",
        description: "X-junction detectors and topology-based grid finders.",
        apply: { kind: "algorithm", tags: ["chessboard"] },
    },
    {
        id: "stitch-images",
        icon: "↔",
        title: "Stitch images",
        description: "Global homographies and locally-varying warps for panoramas.",
        apply: { kind: "algorithm", tags: ["image-stitching"] },
    },
    {
        id: "understand-math",
        icon: "Σ",
        title: "Understand the math",
        description: "Geometry primitives every page links to.",
        apply: { kind: "concept" },
    },
    {
        id: "browse-everything",
        icon: "≡",
        title: "Browse everything",
        description: "Classic list with filters and tags.",
        apply: {},
    },
];

export interface AtlasTrail {
    id: string;
    title: string;
    /** Page slugs in reading order. Each must exist as a non-draft page. */
    steps: string[];
}

/**
 * Curated reading paths surfaced under the tile grid.
 *
 * Trail step slugs are validated against published pages in the same test
 * suite as `atlasTiles` — a missing or drafted slug fails the build's lint
 * step (the test runs in vitest).
 */
export const atlasTrails: AtlasTrail[] = [
    {
        id: "checkerboard-101",
        title: "Checkerboard detection 101",
        steps: [
            "image-gradient",
            "scale-space",
            "harris-corner-detector",
            "chess-corners",
            "rochade",
        ],
    },
];
