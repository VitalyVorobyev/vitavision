import { mergeConfig } from "../../../lib/wasm/worker/util";
import { initialConfig as charucoInitial } from "./calibrationTargets/charuco/config";
import { initialConfig as chessboardInitial } from "./calibrationTargets/chessboard/config";
import { initialConfig as markerboardInitial } from "./calibrationTargets/markerboard/config";
import { initialConfig as chessCornersInitial } from "./chessCorners/config";
import { initialConfig as puzzleboardInitial } from "./puzzleboard/config";
import { initialConfig as radsymInitial, radiusRange } from "./radsym/config";
import { initialConfig as ringgridInitial } from "./ringgrid/config";
import type { ConfigDocument } from "./types";

/*
 * Old deep links.
 *
 * Until the config forms were generated from the WASM packages' JSON Schemas, every
 * algorithm kept a flat camelCase config of its own (`{ nmsRadius, pyramidLevels, ... }`)
 * and its adapter turned that into the package's nested snake_case document on each run.
 * A `?config=` URL saved by that editor still carries the flat shape. This module is the
 * one place that shape survives: it recognises it by its keys and rebuilds the document the
 * old adapter would have sent, so the link opens on the same settings.
 *
 * Keys a flat config does not carry (a link saved before a field existed) take the
 * editor's current default, which is what the old adapters' deep-merge over the library
 * defaults amounted to for every field the editor ever had.
 */

type Flat = Record<string, unknown>;

/** Keys that exist in a flat config and in no current config document: any one gives it away. */
const SIGNATURE_KEYS: Record<string, string[]> = {
    "chess-corners": ["nmsRadius", "minClusterSize", "broadMode", "pyramidLevels", "pyramidMinSize", "upscaleFactor", "refiner"],
    chessboard: ["minCornerStrength", "minLabeledCorners", "maxComponents"],
    charuco: ["cellSize", "markerSizeRel", "pxPerSquare", "chessMinCornerStrength", "borderBits", "minMarkerInliers"],
    markerboard: ["boardRows", "boardCols", "circleDiameterRel", "circleScorePatchSize", "matchMinOffsetInliers"],
    ringgrid: ["longRowCols", "pitchMm", "markerOuterRadiusMm", "diameterMinPx", "profile"],
    radsym: ["minRadius", "maxRadius", "gradientThreshold", "smoothingFactor", "nmsRadius", "nmsThreshold", "maxDetections", "gradientOperator"],
    puzzleboard: ["boardRows", "boardCols", "originRow", "decodeMinWindow", "chessMinCornerStrength"],
};

const isRecord = (value: unknown): value is Flat =>
    value !== null && typeof value === "object" && !Array.isArray(value);

/** Whether `config` is the flat shape an older editor saved for `algorithmId`. */
export function isLegacyConfig(algorithmId: string, config: unknown): boolean {
    const signature = SIGNATURE_KEYS[algorithmId];
    return signature !== undefined && isRecord(config) && signature.some((key) => key in config);
}

// ── Reading a flat config ───────────────────────────────────────────────────

const num = (flat: Flat, key: string): number | undefined =>
    typeof flat[key] === "number" ? flat[key] : undefined;
const bool = (flat: Flat, key: string): boolean | undefined =>
    typeof flat[key] === "boolean" ? flat[key] : undefined;
const str = (flat: Flat, key: string): string | undefined =>
    typeof flat[key] === "string" ? flat[key] : undefined;

/** An object holding only the entries whose value is defined: an absent field is not overridden. */
const defined = (entries: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));

/** `base` with `overrides` merged in; an override that is `{}` after dropping undefined changes nothing. */
const apply = (base: ConfigDocument, overrides: Record<string, unknown>): ConfigDocument =>
    mergeConfig(base, overrides);

// ── Per algorithm ───────────────────────────────────────────────────────────

/** The tuning struct each refiner variant starts with (`ForstnerConfig::default()` etc.). */
export const LEGACY_REFINERS: Record<string, Record<string, unknown>> = {
    center_of_mass: { center_of_mass: { radius: 2 } },
    forstner: { forstner: { max_condition_number: 50, max_offset: 1.5, min_det: 0.001, min_trace: 25, radius: 2 } },
    saddle_point: { saddle_point: { det_margin: 0.001, max_offset: 1.5, min_abs_det: 0.0001, radius: 2 } },
};

function fromChessCorners(flat: Flat): ConfigDocument {
    const upscale = num(flat, "upscaleFactor");
    const refiner = str(flat, "refiner");
    const broad = bool(flat, "broadMode");
    return apply(chessCornersInitial, defined({
        threshold: num(flat, "threshold"),
        upscale: upscale === undefined ? undefined : upscale >= 2 ? { fixed: upscale } : "disabled",
        multiscale: defined({
            pyramid: defined({ levels: num(flat, "pyramidLevels"), min_size: num(flat, "pyramidMinSize") }),
        }),
        detection: defined({ nms_radius: num(flat, "nmsRadius"), min_cluster_size: num(flat, "minClusterSize") }),
        strategy: {
            chess: defined({
                ring: broad === undefined ? undefined : broad ? "broad" : "canonical",
                refiner: refiner === undefined ? undefined : LEGACY_REFINERS[refiner],
            }),
        },
    }));
}

function fromChessboard(flat: Flat): ConfigDocument {
    const strength = num(flat, "minCornerStrength");
    return apply(chessboardInitial, {
        chess: defined({ threshold: strength }),
        params: defined({
            min_corner_strength: strength,
            min_labeled_corners: num(flat, "minLabeledCorners"),
            max_components: num(flat, "maxComponents"),
        }),
    });
}

function fromCharuco(flat: Flat): ConfigDocument {
    const strength = num(flat, "chessMinCornerStrength");
    return apply(charucoInitial, {
        chess: defined({ threshold: strength }),
        px_per_square: num(flat, "pxPerSquare"),
        board: defined({
            rows: num(flat, "rows"),
            cols: num(flat, "cols"),
            cell_size: num(flat, "cellSize"),
            marker_size_rel: num(flat, "markerSizeRel"),
            dictionary: str(flat, "dictionary"),
            border_bits: num(flat, "borderBits"),
        }),
        chessboard: defined({
            min_corner_strength: strength,
            min_labeled_corners: num(flat, "chessMinLabeledCorners"),
            max_components: num(flat, "chessMaxComponents"),
        }),
        scan: defined({
            inset_frac: num(flat, "scanInsetFrac"),
            min_border_score: num(flat, "scanMinBorderScore"),
            dedup_by_id: bool(flat, "scanDedupById"),
            multi_threshold: bool(flat, "scanMultiThreshold"),
        }),
        min_marker_inliers: num(flat, "minMarkerInliers"),
    });
}

/** The flat config held circles as app (row, col); the library's cell is `i` = column, `j` = row. */
function circlesFromFlat(value: unknown): unknown[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.map((circle: unknown) => {
        const { row, col, polarity }: Flat = isRecord(circle) ? circle : {};
        return { cell: { i: col, j: row }, polarity };
    });
}

function fromMarkerboard(flat: Flat): ConfigDocument {
    const strength = num(flat, "minCornerStrength");
    return apply(markerboardInitial, {
        board: defined({
            rows: num(flat, "boardRows"),
            cols: num(flat, "boardCols"),
            circle_diameter_rel: num(flat, "circleDiameterRel"),
            circles: circlesFromFlat(flat.circles),
        }),
        chess: defined({ threshold: strength }),
        chessboard: defined({
            min_corner_strength: strength,
            min_labeled_corners: num(flat, "minLabeledCorners"),
            max_components: num(flat, "maxComponents"),
        }),
        circle_score: defined({
            patch_size: num(flat, "circleScorePatchSize"),
            ring_thickness_frac: num(flat, "circleScoreRingThicknessFrac"),
            ring_radius_mul: num(flat, "circleScoreRingRadiusMul"),
            min_contrast: num(flat, "circleScoreMinContrast"),
            samples: num(flat, "circleScoreSamples"),
            center_search_px: num(flat, "circleScoreCenterSearchPx"),
        }),
        match_params: defined({
            max_candidates_per_polarity: num(flat, "matchMaxCandidatesPerPolarity"),
            min_offset_inliers: num(flat, "matchMinOffsetInliers"),
        }),
    });
}

function fromPuzzleboard(flat: Flat): ConfigDocument {
    const searchMode = str(flat, "decodeSearchMode");
    const scoringMode = str(flat, "decodeScoringMode");
    return apply(puzzleboardInitial, {
        px_per_square: num(flat, "pxPerSquare"),
        board: defined({
            rows: num(flat, "boardRows"),
            cols: num(flat, "boardCols"),
            cell_size: num(flat, "cellSize"),
            origin_row: num(flat, "originRow"),
            origin_col: num(flat, "originCol"),
        }),
        chessboard: defined({
            min_corner_strength: num(flat, "chessMinCornerStrength"),
            min_labeled_corners: num(flat, "chessMinLabeledCorners"),
            max_components: num(flat, "chessMaxComponents"),
        }),
        decode: defined({
            min_window: num(flat, "decodeMinWindow"),
            min_bit_confidence: num(flat, "decodeMinBitConfidence"),
            max_bit_error_rate: num(flat, "decodeMaxBitErrorRate"),
            sample_radius_rel: num(flat, "decodeSampleRadiusRel"),
            search_all_components: bool(flat, "decodeSearchAllComponents"),
            search_mode: searchMode === undefined ? undefined : { kind: searchMode },
            scoring_mode: scoringMode === undefined ? undefined : { kind: scoringMode },
        }),
    });
}

function fromRinggrid(flat: Flat): ConfigDocument {
    const extended = str(flat, "profile") === "extended";
    const board = ringgridInitial.board as ConfigDocument;
    return {
        board: apply(board, {
            lattice: defined({ rows: num(flat, "rows"), long_row_cols: num(flat, "longRowCols"), pitch_mm: num(flat, "pitchMm") }),
            marker: defined({
                outer_radius_mm: num(flat, "markerOuterRadiusMm"),
                inner_radius_mm: num(flat, "markerInnerRadiusMm"),
            }),
            // The codebook is a property of the printed target now (`board.coding`); the
            // detection config derives its own profile from it.
            coding: defined({
                ring_width_mm: num(flat, "markerRingWidthMm"),
                codebook_profile: extended ? "extended" : "base",
            }),
        }),
        config: apply(ringgridInitial.config as ConfigDocument, {
            marker_scale: defined({ diameter_min_px: num(flat, "diameterMinPx"), diameter_max_px: num(flat, "diameterMaxPx") }),
            self_undistort: defined({ enable: bool(flat, "enableSelfUndistort") }),
            advanced: {
                proposal: defined({ grad_threshold: num(flat, "gradThreshold") }),
                decode: defined({
                    max_decode_dist: num(flat, "maxDecodeDist"),
                    min_decode_confidence: num(flat, "minDecodeConfidence"),
                }),
                completion: defined({ enable: bool(flat, "enableCompletion") }),
            },
        }),
    };
}

/** The radsym enums kept their lowercase spelling in the flat config and are `"Bright"` etc. in the document. */
const capitalize = (value: string | undefined): string | undefined =>
    value === undefined ? undefined : value.charAt(0).toUpperCase() + value.slice(1);

function fromRadsym(flat: Flat): ConfigDocument {
    const min = num(flat, "minRadius");
    const max = num(flat, "maxRadius");
    const lowest = Math.min(min ?? max ?? 0, max ?? min ?? 0);
    const highest = Math.max(min ?? max ?? 0, max ?? min ?? 0);
    const detect = apply(radsymInitial.config as ConfigDocument, defined({
        radii: min === undefined && max === undefined ? undefined : radiusRange(lowest, highest),
        polarity: capitalize(str(flat, "polarity")),
        gradient_operator: capitalize(str(flat, "gradientOperator")),
        advanced: {
            frst: defined({
                alpha: num(flat, "alpha"),
                gradient_threshold: num(flat, "gradientThreshold"),
                smoothing_factor: num(flat, "smoothingFactor"),
            }),
            nms: defined({
                radius: num(flat, "nmsRadius"),
                threshold: num(flat, "nmsThreshold"),
                max_detections: num(flat, "maxDetections"),
            }),
        },
    }));
    return { algorithm: str(flat, "algorithm") ?? "frst", config: detect };
}

const CONVERTERS: Record<string, (flat: Flat) => ConfigDocument> = {
    "chess-corners": fromChessCorners,
    chessboard: fromChessboard,
    charuco: fromCharuco,
    markerboard: fromMarkerboard,
    ringgrid: fromRinggrid,
    radsym: fromRadsym,
    puzzleboard: fromPuzzleboard,
};

/**
 * The current config document for a flat config saved by an older editor. A config that is
 * not in the flat shape (or an algorithm with no old shape) comes back unchanged.
 */
export function migrateLegacyConfig(algorithmId: string, config: unknown): unknown {
    const convert = CONVERTERS[algorithmId];
    if (convert === undefined || !isRecord(config) || !isLegacyConfig(algorithmId, config)) return config;
    return convert(config);
}
