import type { AlgorithmDefinition, AlgorithmPreset, DiagnosticEntry } from "../types";
import type { CalibrationTargetResult } from "../../../../lib/types";
import { detectMarkerboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import {
    calibrationCornerFeatures,
    calibrationCircleMatchFeatures,
    calibrationSummary,
} from "./shared";
import MarkerBoardConfigForm, { type MarkerBoardConfig } from "./MarkerBoardConfigForm";
import MarkerboardOverlay from "../../canvas/overlays/MarkerboardOverlay";

const initialConfig: MarkerBoardConfig = {
    boardRows: 22,
    boardCols: 22,
    // Equals the library default (default_marker_board_params().board) and the
    // target generator's default; scripts/test-wasm-schemas.ts pins all three.
    circleDiameterRel: 0.5,
    // App coordinates (row, col), the layout the target generator prints by
    // default (targetgen/reducer.ts::defaultCircles): a white circle, a black
    // one below it, a white one to the right of that. Polarity follows the
    // generator's rule: white when (row + col) is even.
    //
    // This is also the layout of the bundled sample (public/markerboard.png).
    // The previous values (black, white, white in a different arrangement)
    // matched only 2 of its 3 circles; calib-targets 0.14 accepted that at
    // min_offset_inliers = 1 and returned an alignment one cell off the
    // 3-inlier solution, and 0.15 refuses it as ambiguous. Verified on the sample: these three give 3 inliers, a
    // runner-up of 2, and an unambiguous identity alignment.
    circles: [
        { row: 11, col: 11, polarity: "white" },
        { row: 12, col: 11, polarity: "black" },
        { row: 12, col: 12, polarity: "white" },
    ],
    expectedRows: 22,
    expectedCols: 22,
    minCornerStrength: 15,
    completenessThreshold: 0.05,
    graphMinSpacingPix: 20,
    graphMaxSpacingPix: 160,
    graphKNeighbors: 8,
    graphOrientationToleranceDeg: 22.5,
    circleScorePatchSize: 64,
    circleScoreRingThicknessFrac: 0.35,
    circleScoreRingRadiusMul: 1.6,
    circleScoreMinContrast: 10,
    circleScoreSamples: 48,
    circleScoreCenterSearchPx: 2,
    matchMaxCandidatesPerPolarity: 6,
    matchMinOffsetInliers: 3,
};

const presets: AlgorithmPreset[] = [
    { label: "22×22 default", description: "Standard marker board with centered triangle", config: { ...initialConfig } },
    {
        label: "10×14 compact",
        description: "Smaller board",
        config: {
            ...initialConfig,
            boardRows: 10,
            boardCols: 14,
            expectedRows: 10,
            expectedCols: 14,
            // Centred like the generator's default for a board this size; the
            // polarities obey the parity rule above (the former preset had three
            // white circles, impossible on a real board). Round-tripped through
            // the generator and the detector: identity alignment, 3 inliers.
            circles: [
                { row: 4, col: 6, polarity: "white" as const },
                { row: 5, col: 6, polarity: "black" as const },
                { row: 5, col: 7, polarity: "white" as const },
            ] as MarkerBoardConfig["circles"],
        },
    },
];

const toDiagnostics = (result: CalibrationTargetResult): DiagnosticEntry[] => {
    const entries: DiagnosticEntry[] = [];
    if (result.summary.corner_count === 0) {
        entries.push({ level: "error", message: "No corners detected", detail: "Check board dimensions and corner strength threshold." });
    }
    if (result.summary.circle_match_count === 0 && result.circle_matches !== null) {
        entries.push({ level: "warning", message: "No circle markers matched", detail: "Verify circle positions match the physical board or adjust circle score parameters." });
    }
    if (result.summary.alignment_inliers !== null && result.summary.alignment_inliers < 2) {
        entries.push({ level: "warning", message: `Low alignment inliers: ${result.summary.alignment_inliers}`, detail: "Grid alignment may be unreliable." });
    }
    return entries;
};

const toFeatures = (result: CalibrationTargetResult, runId: string) => [
    ...calibrationCornerFeatures(result, runId, "markerboard"),
    ...calibrationCircleMatchFeatures(result.circle_matches, result.circle_candidates, runId, "markerboard"),
];

export const markerboardAlgorithm: AlgorithmDefinition = {
    id: "markerboard",
    title: "Marker Board",
    description: "Detect checkerboard corners and fiducial circle markers.",
    initialConfig,
    presets,
    executionModes: ["wasm"],
    sampleDefaults: {
        markerboard: { ...initialConfig },
    },
    ConfigComponent: MarkerBoardConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: () => Promise.reject(new Error("Marker Board detection is only available via client-side WASM.")),
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as MarkerBoardConfig;
        return detectMarkerboardWasm(pixels, width, height, {
            // calib-targets 0.11 collapsed the tagged
            // `threshold: { relative | absolute }` enum back to a plain f32,
            // dropping relative mode entirely — the value is now an ABSOLUTE
            // floor on the raw ChESS response (default_chess_config() ships 15).
            // Passing the old `{ relative: v }` object throws
            // "invalid type: JsValue(Object(...)), expected f32" at detect time.
            chessCfg: { threshold: c.minCornerStrength },
            params: {
                // The schema key is `board`, not `layout`. Marker-board params
                // carry no `layout` field, and the WASM boundary silently drops
                // unknown keys — so every detection ran against the library's
                // default 6x8 board and its default circle cells, regardless of
                // what the user configured. Verified against 0.14.0: an invalid
                // payload under `board` throws, the same payload under `layout`
                // is accepted exactly like a made-up key.
                board: {
                    rows: c.boardRows,
                    cols: c.boardCols,
                    // calib-targets 0.15 moved the printed disk diameter from
                    // `circle_score.diameter_frac` (now removed, silently
                    // dropped if sent) onto the board spec. Verified live with
                    // an invalid-payload probe.
                    circle_diameter_rel: c.circleDiameterRel,
                    // Transpose into the library's convention. calib-targets
                    // uses "i right, j down", so its `i` is the COLUMN and its
                    // `j` is the ROW — the opposite of how this app names board
                    // cells in both the detector form above and the target
                    // generator. The same swap happens on the generation side
                    // in targetgen/printableDocument.ts; the two must agree or
                    // a board printed from cells (r, c) is looked for at (c, r).
                    //
                    // Passing app coordinates straight through was the previous
                    // behaviour, and it failed silently: the detector still
                    // reported a 3-of-3 circle match, but resolved the board
                    // frame with an alignment matrix of [[0,1],[1,0]] instead of
                    // the identity — a grid mirrored about the diagonal.
                    circles: c.circles.map((circle) => ({
                        cell: { i: circle.col, j: circle.row },
                        polarity: circle.polarity,
                    })),
                },
                chessboard: {
                    min_corner_strength: c.minCornerStrength,
                    expected_rows: c.expectedRows,
                    expected_cols: c.expectedCols,
                    completeness_threshold: c.completenessThreshold,
                    graph: {
                        min_spacing_pix: c.graphMinSpacingPix,
                        max_spacing_pix: c.graphMaxSpacingPix,
                        k_neighbors: c.graphKNeighbors,
                        orientation_tolerance_deg: c.graphOrientationToleranceDeg,
                    },
                },
                circle_score: {
                    patch_size: c.circleScorePatchSize,
                    ring_thickness_frac: c.circleScoreRingThicknessFrac,
                    ring_radius_mul: c.circleScoreRingRadiusMul,
                    min_contrast: c.circleScoreMinContrast,
                    samples: c.circleScoreSamples,
                    center_search_px: c.circleScoreCenterSearchPx,
                },
                match_params: {
                    max_candidates_per_polarity: c.matchMaxCandidatesPerPolarity,
                    min_offset_inliers: c.matchMinOffsetInliers,
                },
            },
        });
    },
    toFeatures: (result, runId) =>
        toFeatures(result as CalibrationTargetResult, runId),
    summary: (result) => calibrationSummary(result as CalibrationTargetResult),
    diagnostics: (result) => toDiagnostics(result as CalibrationTargetResult),
    OverlayComponent: MarkerboardOverlay,
};
