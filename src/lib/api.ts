import { API_BASE_URL, apiHeaders } from "./http";
import type { StorageMode } from "./storage";

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

export interface ChessDetectorConfig {
    thresholdRel?: number;
    thresholdAbs?: number;
    nmsRadius?: number;
    minClusterSize?: number;
    pyramidNumLevels?: number;
    pyramidMinSize?: number;
    refinementRadius?: number;
    mergeRadius?: number;
    useRadius10?: boolean;
    descriptorUseRadius10?: boolean;
    refiner?: "center_of_mass" | "forstner" | "saddle_point";
}

export interface DetectChessCornersRequest {
    key: string;
    storageMode: StorageMode;
    useMlRefiner?: boolean;
    config?: ChessDetectorConfig;
}

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

export interface CalibrationChessCornerParams {
    useRadius10?: boolean;
    descriptorUseRadius10?: boolean;
    thresholdRel?: number;
    thresholdAbs?: number;
    nmsRadius?: number;
    minClusterSize?: number;
}

export interface CalibrationPyramidParams {
    numLevels?: number;
    minSize?: number;
}

export interface CalibrationCoarseToFineParams {
    pyramid?: CalibrationPyramidParams;
    refinementRadius?: number;
    mergeRadius?: number;
}

export interface CalibrationChessConfig {
    params?: CalibrationChessCornerParams;
    multiscale?: CalibrationCoarseToFineParams;
}

export interface OrientationClusteringParams {
    numBins?: number;
    maxIters?: number;
    peakMinSeparationDeg?: number;
    outlierThresholdDeg?: number;
    minPeakWeightFraction?: number;
    useWeights?: boolean;
}

export interface ChessboardDetectorParams {
    minCornerStrength?: number;
    minCorners?: number;
    expectedRows?: number;
    expectedCols?: number;
    completenessThreshold?: number;
    useOrientationClustering?: boolean;
    orientationClusteringParams?: OrientationClusteringParams;
}

export interface GridGraphParams {
    minSpacingPix?: number;
    maxSpacingPix?: number;
    kNeighbors?: number;
    orientationToleranceDeg?: number;
}

export interface ScanDecodeConfig {
    borderBits?: number;
    insetFrac?: number;
    markerSizeRel?: number;
    minBorderScore?: number;
    dedupById?: boolean;
}

export interface CharucoBoardSpec {
    rows: number;
    cols: number;
    cellSize: number;
    markerSizeRel: number;
    dictionary: DictionaryName;
    markerLayout?: "opencv_charuco";
}

export interface MarkerCircleSpec {
    i: number;
    j: number;
    polarity: "white" | "black";
}

export interface MarkerBoardLayout {
    rows: number;
    cols: number;
    circles: MarkerCircleSpec[];
    cellSize?: number;
}

export interface CircleScoreParams {
    patchSize?: number;
    diameterFrac?: number;
    ringThicknessFrac?: number;
    ringRadiusMul?: number;
    minContrast?: number;
    samples?: number;
    centerSearchPx?: number;
}

export interface CircleMatchParams {
    maxCandidatesPerPolarity?: number;
    maxDistanceCells?: number;
    minOffsetInliers?: number;
}

export interface DetectChessboardRequest {
    algorithm: "chessboard";
    key: string;
    storageMode: StorageMode;
    config?: {
        chessCfg?: CalibrationChessConfig;
        detector?: ChessboardDetectorParams;
    };
}

export interface DetectCharucoRequest {
    algorithm: "charuco";
    key: string;
    storageMode: StorageMode;
    config: {
        chessCfg?: CalibrationChessConfig;
        board: CharucoBoardSpec;
        pxPerSquare?: number;
        chessboard?: ChessboardDetectorParams;
        graph?: GridGraphParams;
        scan?: ScanDecodeConfig;
        maxHamming?: number;
        minMarkerInliers?: number;
    };
}

export interface DetectMarkerBoardRequest {
    algorithm: "markerboard";
    key: string;
    storageMode: StorageMode;
    config?: {
        chessCfg?: CalibrationChessConfig;
        layout?: MarkerBoardLayout;
        chessboard?: ChessboardDetectorParams;
        gridGraph?: GridGraphParams;
        circleScore?: CircleScoreParams;
        matchParams?: CircleMatchParams;
        roiCells?: [number, number, number, number];
    };
}

export type DetectCalibrationTargetRequest =
    | DetectChessboardRequest
    | DetectCharucoRequest
    | DetectMarkerBoardRequest;

export interface FramePoint {
    x: number;
    y: number;
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

function toBackendConfig(config?: ChessDetectorConfig): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        threshold_rel: config.thresholdRel,
        threshold_abs: config.thresholdAbs,
        nms_radius: config.nmsRadius,
        min_cluster_size: config.minClusterSize,
        pyramid_num_levels: config.pyramidNumLevels,
        pyramid_min_size: config.pyramidMinSize,
        refinement_radius: config.refinementRadius,
        merge_radius: config.mergeRadius,
        use_radius10: config.useRadius10,
        descriptor_use_radius10: config.descriptorUseRadius10,
        refiner: config.refiner,
    };
}

function toBackendCalibrationChessConfig(config?: CalibrationChessConfig): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        params: config.params
            ? {
                use_radius10: config.params.useRadius10,
                descriptor_use_radius10: config.params.descriptorUseRadius10,
                threshold_rel: config.params.thresholdRel,
                threshold_abs: config.params.thresholdAbs,
                nms_radius: config.params.nmsRadius,
                min_cluster_size: config.params.minClusterSize,
            }
            : undefined,
        multiscale: config.multiscale
            ? {
                pyramid: config.multiscale.pyramid
                    ? {
                        num_levels: config.multiscale.pyramid.numLevels,
                        min_size: config.multiscale.pyramid.minSize,
                    }
                    : undefined,
                refinement_radius: config.multiscale.refinementRadius,
                merge_radius: config.multiscale.mergeRadius,
            }
            : undefined,
    };
}

function toBackendOrientationClustering(config?: OrientationClusteringParams): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        num_bins: config.numBins,
        max_iters: config.maxIters,
        peak_min_separation_deg: config.peakMinSeparationDeg,
        outlier_threshold_deg: config.outlierThresholdDeg,
        min_peak_weight_fraction: config.minPeakWeightFraction,
        use_weights: config.useWeights,
    };
}

function toBackendChessboardParams(config?: ChessboardDetectorParams): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        min_corner_strength: config.minCornerStrength,
        min_corners: config.minCorners,
        expected_rows: config.expectedRows,
        expected_cols: config.expectedCols,
        completeness_threshold: config.completenessThreshold,
        use_orientation_clustering: config.useOrientationClustering,
        orientation_clustering_params: toBackendOrientationClustering(config.orientationClusteringParams),
    };
}

function toBackendGridGraph(config?: GridGraphParams): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        min_spacing_pix: config.minSpacingPix,
        max_spacing_pix: config.maxSpacingPix,
        k_neighbors: config.kNeighbors,
        orientation_tolerance_deg: config.orientationToleranceDeg,
    };
}

function toBackendScan(config?: ScanDecodeConfig): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        border_bits: config.borderBits,
        inset_frac: config.insetFrac,
        marker_size_rel: config.markerSizeRel,
        min_border_score: config.minBorderScore,
        dedup_by_id: config.dedupById,
    };
}

function toBackendMarkerLayout(config?: MarkerBoardLayout): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        rows: config.rows,
        cols: config.cols,
        circles: config.circles.map((circle) => ({
            i: circle.i,
            j: circle.j,
            polarity: circle.polarity,
        })),
        cell_size: config.cellSize,
    };
}

function toBackendCircleScore(config?: CircleScoreParams): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        patch_size: config.patchSize,
        diameter_frac: config.diameterFrac,
        ring_thickness_frac: config.ringThicknessFrac,
        ring_radius_mul: config.ringRadiusMul,
        min_contrast: config.minContrast,
        samples: config.samples,
        center_search_px: config.centerSearchPx,
    };
}

function toBackendCircleMatch(config?: CircleMatchParams): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        max_candidates_per_polarity: config.maxCandidatesPerPolarity,
        max_distance_cells: config.maxDistanceCells,
        min_offset_inliers: config.minOffsetInliers,
    };
}

function toBackendCalibrationTargetPayload(payload: DetectCalibrationTargetRequest): Record<string, unknown> {
    if (payload.algorithm === "chessboard") {
        return {
            algorithm: payload.algorithm,
            key: payload.key,
            storage_mode: payload.storageMode,
            config: {
                chess_cfg: toBackendCalibrationChessConfig(payload.config?.chessCfg),
                detector: toBackendChessboardParams(payload.config?.detector),
            },
        };
    }

    if (payload.algorithm === "charuco") {
        return {
            algorithm: payload.algorithm,
            key: payload.key,
            storage_mode: payload.storageMode,
            config: {
                chess_cfg: toBackendCalibrationChessConfig(payload.config.chessCfg),
                board: {
                    rows: payload.config.board.rows,
                    cols: payload.config.board.cols,
                    cell_size: payload.config.board.cellSize,
                    marker_size_rel: payload.config.board.markerSizeRel,
                    dictionary: payload.config.board.dictionary,
                    marker_layout: payload.config.board.markerLayout ?? "opencv_charuco",
                },
                px_per_square: payload.config.pxPerSquare,
                chessboard: toBackendChessboardParams(payload.config.chessboard),
                graph: toBackendGridGraph(payload.config.graph),
                scan: toBackendScan(payload.config.scan),
                max_hamming: payload.config.maxHamming,
                min_marker_inliers: payload.config.minMarkerInliers,
            },
        };
    }

    return {
        algorithm: payload.algorithm,
        key: payload.key,
        storage_mode: payload.storageMode,
        config: {
            chess_cfg: toBackendCalibrationChessConfig(payload.config?.chessCfg),
            layout: toBackendMarkerLayout(payload.config?.layout),
            chessboard: toBackendChessboardParams(payload.config?.chessboard),
            grid_graph: toBackendGridGraph(payload.config?.gridGraph),
            circle_score: toBackendCircleScore(payload.config?.circleScore),
            match_params: toBackendCircleMatch(payload.config?.matchParams),
            roi_cells: payload.config?.roiCells,
        },
    };
}

export async function detectChessCorners(payload: DetectChessCornersRequest): Promise<ChessCornersResult> {
    const response = await fetch(`${API_BASE_URL}/cv/chess-corners`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            key: payload.key,
            storage_mode: payload.storageMode,
            use_ml_refiner: payload.useMlRefiner ?? false,
            config: toBackendConfig(payload.config),
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Chess corners request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<ChessCornersResult>;
}

export async function detectCalibrationTarget(
    payload: DetectCalibrationTargetRequest,
): Promise<CalibrationTargetResult> {
    const response = await fetch(`${API_BASE_URL}/cv/calibration-targets/detect`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(toBackendCalibrationTargetPayload(payload)),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Calibration target request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<CalibrationTargetResult>;
}

// ── Ringgrid types ─────────────────────────────────────────────────────────

export interface RinggridBoardConfig {
    rows: number;
    longRowCols: number;
    pitchMm: number;
    markerOuterRadiusMm: number;
    markerInnerRadiusMm: number;
    markerRingWidthMm: number;
}

export interface DetectRinggridRequest {
    key: string;
    storageMode: StorageMode;
    board: RinggridBoardConfig;
    profile: "baseline" | "extended";
}

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

export async function detectRinggrid(payload: DetectRinggridRequest): Promise<RinggridDetectResult> {
    const response = await fetch(`${API_BASE_URL}/cv/ringgrid/detect`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            key: payload.key,
            storage_mode: payload.storageMode,
            board: {
                rows: payload.board.rows,
                long_row_cols: payload.board.longRowCols,
                pitch_mm: payload.board.pitchMm,
                marker_outer_radius_mm: payload.board.markerOuterRadiusMm,
                marker_inner_radius_mm: payload.board.markerInnerRadiusMm,
                marker_ring_width_mm: payload.board.markerRingWidthMm,
            },
            profile: payload.profile,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ringgrid detection request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<RinggridDetectResult>;
}
