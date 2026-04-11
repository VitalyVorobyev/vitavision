/**
 * Shared type definitions for CV algorithm results and configurations.
 *
 * These types describe the shapes of WASM detection results consumed by
 * adapters, overlays, and UI components. Previously they also described
 * server API contracts — the backend has been removed; all processing
 * is now client-side via WASM.
 */

export type StorageMode = "r2" | "local";
export type ConfidenceLevel = "low" | "medium" | "high";
export type CalibrationTargetAlgorithm = "chessboard" | "charuco" | "markerboard";
export type CalibrationTargetKind = "chessboard" | "charuco" | "checkerboard_marker";
export type DictionaryName =
    | "DICT_4X4_1000"
    | "DICT_4X4_100"
    | "DICT_4X4_250"
    | "DICT_4X4_50"
    | "DICT_5X5_1000"
    | "DICT_5X5_100"
    | "DICT_5X5_250"
    | "DICT_5X5_50"
    | "DICT_6X6_1000"
    | "DICT_6X6_100"
    | "DICT_6X6_250"
    | "DICT_6X6_50"
    | "DICT_7X7_1000"
    | "DICT_7X7_100"
    | "DICT_7X7_250"
    | "DICT_7X7_50"
    | "DICT_APRILTAG_16h5"
    | "DICT_APRILTAG_25h9"
    | "DICT_APRILTAG_36h10"
    | "DICT_APRILTAG_36h11"
    | "DICT_ARUCO_MIP_36h12"
    | "DICT_ARUCO_ORIGINAL";

// ── Chess Corners ───────────────────────────────────────────────────────────

export interface ChessCornerFeature {
    id: string;
    x: number;
    y: number;
    x_norm: number;
    y_norm: number;
    response: number;
    orientation_rad: number;
    orientation_deg: number;
    direction: { dx: number; dy: number };
    confidence: number;
    confidence_level: ConfidenceLevel;
    subpixel_offset_px: number;
}

export interface ChessCornersResult {
    status: "success";
    key: string;
    storage_mode: StorageMode;
    image_width: number;
    image_height: number;
    frame: {
        name: "image_px_center";
        origin: "top_left";
        x_axis: "right";
        y_axis: "down";
        units: "pixels";
    };
    config: {
        use_ml_refiner: boolean;
        threshold_rel: number | null;
        threshold_abs: number | null;
        nms_radius: number;
        min_cluster_size: number;
        pyramid_num_levels: number;
        pyramid_min_size: number;
        refinement_radius: number;
        merge_radius: number;
        use_radius10: boolean;
        descriptor_use_radius10: boolean | null;
        refiner: string;
    };
    summary: {
        count: number;
        response_min: number | null;
        response_max: number | null;
        response_mean: number | null;
        confidence_min: number | null;
        confidence_max: number | null;
        runtime_ms: number;
    };
    corners: ChessCornerFeature[];
}

// ── Calibration Targets ─────────────────────────────────────────────────────

export interface FramePoint {
    x: number;
    y: number;
}

export interface MarkerCircleSpec {
    i: number;
    j: number;
    polarity: "white" | "black";
}

export interface CalibrationCorner {
    id: string;
    x: number;
    y: number;
    x_norm: number;
    y_norm: number;
    score: number;
    grid: { i: number; j: number } | null;
    corner_id: number | null;
    target_position: FramePoint | null;
}

export interface CalibrationMarker {
    id: number;
    grid_cell: { gx: number; gy: number };
    rotation: number;
    hamming: number;
    score: number;
    border_score: number;
    code: number;
    inverted: boolean;
    corners_rect: FramePoint[];
    corners_img: FramePoint[] | null;
}

export interface CalibrationCircleCandidate {
    center_img: FramePoint;
    cell: { i: number; j: number };
    polarity: "white" | "black";
    score: number;
    contrast: number;
}

export interface CalibrationCircleMatch {
    expected: {
        cell: { i: number; j: number };
        polarity: "white" | "black";
    };
    matched_index: number | null;
    distance_cells: number | null;
    offset_cells: { di: number; dj: number } | null;
}

export interface CalibrationTargetResult {
    status: "success";
    key: string;
    storage_mode: StorageMode;
    algorithm: CalibrationTargetAlgorithm;
    image_width: number;
    image_height: number;
    frame: {
        name: "image_px_center";
        origin: "top_left";
        x_axis: "right";
        y_axis: "down";
        units: "pixels";
    };
    summary: {
        corner_count: number;
        marker_count: number | null;
        circle_candidate_count: number | null;
        circle_match_count: number | null;
        alignment_inliers: number | null;
        runtime_ms: number;
    };
    detection: {
        kind: CalibrationTargetKind;
        corners: CalibrationCorner[];
    };
    markers: CalibrationMarker[] | null;
    alignment: {
        transform: { a: number; b: number; c: number; d: number };
        translation: [number, number];
    } | null;
    circle_candidates: CalibrationCircleCandidate[] | null;
    circle_matches: CalibrationCircleMatch[] | null;
}

// ── Ringgrid ────────────────────────────────────────────────────────────────

export interface RinggridEllipse {
    cx: number;
    cy: number;
    a: number;
    b: number;
    angle: number;
}

export interface RinggridDecodeMetrics {
    best_id: number;
    best_rotation: number;
    best_dist: number;
    margin: number;
    decode_confidence: number;
}

export interface RinggridFitMetrics {
    rms_residual_outer: number | null;
    rms_residual_inner: number | null;
    ransac_inlier_ratio_outer: number | null;
    ransac_inlier_ratio_inner: number | null;
}

export interface RinggridDetectedMarker {
    id: number;
    confidence: number;
    center: FramePoint;
    ellipse_outer: RinggridEllipse;
    ellipse_inner: RinggridEllipse;
    decode: RinggridDecodeMetrics | null;
    fit: RinggridFitMetrics | null;
    board_xy_mm: FramePoint | null;
}

export interface RinggridDetectResult {
    status: "success";
    key: string;
    storage_mode: StorageMode;
    image_width: number;
    image_height: number;
    summary: {
        marker_count: number;
        runtime_ms: number;
    };
    markers: RinggridDetectedMarker[];
}

// ── Radsym ──────────────────────────────────────────────────────────────────

export interface RadsymCircle {
    id: string;
    x: number;
    y: number;
    radius: number;
    score: number;
}

export interface RadsymResult {
    status: "success";
    key: string;
    storage_mode: StorageMode;
    image_width: number;
    image_height: number;
    frame: {
        name: "image_px_center";
        origin: "top_left";
        x_axis: "right";
        y_axis: "down";
        units: "pixels";
    };
    summary: {
        count: number;
        runtime_ms: number;
    };
    circles: RadsymCircle[];
}
