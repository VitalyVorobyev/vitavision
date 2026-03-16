import base64
import io
import math
import os
import re as _re
import time
from enum import Enum
from typing import Annotated, Any, Literal
from uuid import uuid4

import calib_targets
import chess_corners
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator

from limiter import limiter
from services import storage_service

router = APIRouter(tags=["Computer Vision"])

# Maximum image dimension accepted by CV endpoints (pixels per side).
_MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "16000"))

# Storage keys use content-addressed format: "{prefix}/{sha256}" where sha256 is 64 hex chars.
_KEY_PATTERN = _re.compile(r"^[a-z0-9_-]+/[0-9a-f]{64}$")
_CALIB_TARGET_DICTIONARIES = set(calib_targets.DICTIONARY_NAMES)


class RefinerName(str, Enum):
    CENTER_OF_MASS = "center_of_mass"
    FORSTNER = "forstner"
    SADDLE_POINT = "saddle_point"


class ChessDetectorConfigOverrides(BaseModel):
    threshold_rel: float | None = Field(default=None, ge=0.0, le=1.0)
    threshold_abs: float | None = Field(default=None, ge=0.0)
    nms_radius: int | None = Field(default=None, ge=1, le=64)
    min_cluster_size: int | None = Field(default=None, ge=1, le=512)
    pyramid_num_levels: int | None = Field(default=None, ge=1, le=8)
    pyramid_min_size: int | None = Field(default=None, ge=16, le=4096)
    refinement_radius: int | None = Field(default=None, ge=1, le=32)
    merge_radius: float | None = Field(default=None, gt=0.0, le=128.0)
    use_radius10: bool | None = None
    descriptor_use_radius10: bool | None = None
    refiner: RefinerName | None = None


class ChessCornersRequest(BaseModel):
    key: str = Field(..., min_length=3, max_length=2048)
    storage_mode: Literal["r2", "local"] | None = None
    use_ml_refiner: bool = False
    config: ChessDetectorConfigOverrides = Field(
        default_factory=ChessDetectorConfigOverrides
    )

    @field_validator("key")
    @classmethod
    def validate_key_format(cls, v: str) -> str:
        if not _KEY_PATTERN.match(v):
            raise ValueError("key does not match expected storage key format")
        return v


class DirectionVector(BaseModel):
    dx: float
    dy: float


class CornerFeature(BaseModel):
    id: str
    x: float
    y: float
    x_norm: float
    y_norm: float
    response: float
    orientation_rad: float
    orientation_deg: float
    direction: DirectionVector
    confidence: float
    confidence_level: Literal["low", "medium", "high"]


class DetectionFrame(BaseModel):
    name: Literal["image_px_center"] = "image_px_center"
    origin: Literal["top_left"] = "top_left"
    x_axis: Literal["right"] = "right"
    y_axis: Literal["down"] = "down"
    units: Literal["pixels"] = "pixels"


class DetectionSummary(BaseModel):
    count: int
    response_min: float | None = None
    response_max: float | None = None
    response_mean: float | None = None
    confidence_min: float | None = None
    confidence_max: float | None = None
    runtime_ms: float


class EffectiveConfig(BaseModel):
    use_ml_refiner: bool
    threshold_rel: float | None = None
    threshold_abs: float | None = None
    nms_radius: int
    min_cluster_size: int
    pyramid_num_levels: int
    pyramid_min_size: int
    refinement_radius: int
    merge_radius: float
    use_radius10: bool
    descriptor_use_radius10: bool | None = None
    refiner: str


class ChessCornersResponse(BaseModel):
    status: Literal["success"]
    key: str
    storage_mode: Literal["r2", "local"]
    image_width: int
    image_height: int
    frame: DetectionFrame
    config: EffectiveConfig
    summary: DetectionSummary
    corners: list[CornerFeature]


class CalibrationChessCornerParamsRequest(BaseModel):
    use_radius10: bool | None = None
    descriptor_use_radius10: bool | None = None
    threshold_rel: float | None = Field(default=None, ge=0.0, le=1.0)
    threshold_abs: float | None = Field(default=None, ge=0.0)
    nms_radius: int | None = Field(default=None, ge=1, le=256)
    min_cluster_size: int | None = Field(default=None, ge=1, le=4096)


class CalibrationPyramidParamsRequest(BaseModel):
    num_levels: int | None = Field(default=None, ge=1, le=16)
    min_size: int | None = Field(default=None, ge=8, le=4096)


class CalibrationCoarseToFineParamsRequest(BaseModel):
    pyramid: CalibrationPyramidParamsRequest | None = None
    refinement_radius: int | None = Field(default=None, ge=1, le=256)
    merge_radius: float | None = Field(default=None, gt=0.0, le=512.0)


class CalibrationChessConfigRequest(BaseModel):
    params: CalibrationChessCornerParamsRequest | None = None
    multiscale: CalibrationCoarseToFineParamsRequest | None = None


class OrientationClusteringParamsRequest(BaseModel):
    num_bins: int | None = Field(default=None, ge=1, le=360)
    max_iters: int | None = Field(default=None, ge=1, le=1024)
    peak_min_separation_deg: float | None = Field(default=None, ge=0.0, le=180.0)
    outlier_threshold_deg: float | None = Field(default=None, ge=0.0, le=180.0)
    min_peak_weight_fraction: float | None = Field(default=None, ge=0.0, le=1.0)
    use_weights: bool | None = None


class ChessboardDetectorParamsRequest(BaseModel):
    min_corner_strength: float | None = Field(default=None, ge=0.0)
    min_corners: int | None = Field(default=None, ge=1, le=100000)
    expected_rows: int | None = Field(default=None, ge=1, le=1024)
    expected_cols: int | None = Field(default=None, ge=1, le=1024)
    completeness_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    use_orientation_clustering: bool | None = None
    orientation_clustering_params: OrientationClusteringParamsRequest | None = None


class GridGraphParamsRequest(BaseModel):
    min_spacing_pix: float | None = Field(default=None, gt=0.0)
    max_spacing_pix: float | None = Field(default=None, gt=0.0)
    k_neighbors: int | None = Field(default=None, ge=1, le=64)
    orientation_tolerance_deg: float | None = Field(default=None, ge=0.0, le=180.0)


class ScanDecodeConfigRequest(BaseModel):
    border_bits: int | None = Field(default=None, ge=0, le=16)
    inset_frac: float | None = Field(default=None, ge=0.0, le=1.0)
    marker_size_rel: float | None = Field(default=None, gt=0.0, lt=1.0)
    min_border_score: float | None = Field(default=None, ge=0.0)
    dedup_by_id: bool | None = None


class CharucoBoardSpecRequest(BaseModel):
    rows: int = Field(..., ge=2, le=1024)
    cols: int = Field(..., ge=2, le=1024)
    cell_size: float = Field(..., gt=0.0)
    marker_size_rel: float = Field(..., gt=0.0, lt=1.0)
    dictionary: str = Field(..., min_length=1)
    marker_layout: Literal["opencv_charuco"] = "opencv_charuco"

    @field_validator("dictionary")
    @classmethod
    def validate_dictionary(cls, value: str) -> str:
        if value not in _CALIB_TARGET_DICTIONARIES:
            raise ValueError(
                f"dictionary must be one of {sorted(_CALIB_TARGET_DICTIONARIES)}"
            )
        return value


class MarkerCircleSpecRequest(BaseModel):
    i: int
    j: int
    polarity: Literal["white", "black"]


class MarkerBoardLayoutRequest(BaseModel):
    rows: int = Field(..., ge=1, le=2048)
    cols: int = Field(..., ge=1, le=2048)
    circles: list[MarkerCircleSpecRequest] = Field(..., min_length=3, max_length=3)
    cell_size: float | None = Field(default=None, gt=0.0)


class CircleScoreParamsRequest(BaseModel):
    patch_size: int | None = Field(default=None, ge=1, le=512)
    diameter_frac: float | None = Field(default=None, gt=0.0, le=2.0)
    ring_thickness_frac: float | None = Field(default=None, gt=0.0, le=2.0)
    ring_radius_mul: float | None = Field(default=None, gt=0.0, le=10.0)
    min_contrast: float | None = Field(default=None, ge=0.0)
    samples: int | None = Field(default=None, ge=1, le=1024)
    center_search_px: int | None = Field(default=None, ge=0, le=256)


class CircleMatchParamsRequest(BaseModel):
    max_candidates_per_polarity: int | None = Field(default=None, ge=1, le=2048)
    max_distance_cells: float | None = Field(default=None, ge=0.0)
    min_offset_inliers: int | None = Field(default=None, ge=0, le=2048)


class ChessboardAlgorithmConfigRequest(BaseModel):
    chess_cfg: CalibrationChessConfigRequest | None = None
    detector: ChessboardDetectorParamsRequest | None = None


class CharucoAlgorithmConfigRequest(BaseModel):
    chess_cfg: CalibrationChessConfigRequest | None = None
    board: CharucoBoardSpecRequest
    px_per_square: float | None = Field(default=None, gt=0.0)
    chessboard: ChessboardDetectorParamsRequest | None = None
    graph: GridGraphParamsRequest | None = None
    scan: ScanDecodeConfigRequest | None = None
    max_hamming: int | None = Field(default=None, ge=0, le=32)
    min_marker_inliers: int | None = Field(default=None, ge=0, le=1024)


class MarkerBoardAlgorithmConfigRequest(BaseModel):
    chess_cfg: CalibrationChessConfigRequest | None = None
    layout: MarkerBoardLayoutRequest | None = None
    chessboard: ChessboardDetectorParamsRequest | None = None
    grid_graph: GridGraphParamsRequest | None = None
    circle_score: CircleScoreParamsRequest | None = None
    match_params: CircleMatchParamsRequest | None = None
    roi_cells: tuple[int, int, int, int] | None = None


class CalibrationTargetRequestBase(BaseModel):
    key: str = Field(..., min_length=3, max_length=2048)
    storage_mode: Literal["r2", "local"] | None = None

    @field_validator("key")
    @classmethod
    def validate_key_format(cls, value: str) -> str:
        if not _KEY_PATTERN.match(value):
            raise ValueError("key does not match expected storage key format")
        return value


class ChessboardDetectionRequest(CalibrationTargetRequestBase):
    algorithm: Literal["chessboard"]
    config: ChessboardAlgorithmConfigRequest = Field(
        default_factory=ChessboardAlgorithmConfigRequest
    )


class CharucoDetectionRequest(CalibrationTargetRequestBase):
    algorithm: Literal["charuco"]
    config: CharucoAlgorithmConfigRequest


class MarkerBoardDetectionRequest(CalibrationTargetRequestBase):
    algorithm: Literal["markerboard"]
    config: MarkerBoardAlgorithmConfigRequest = Field(
        default_factory=MarkerBoardAlgorithmConfigRequest
    )


CalibrationTargetRequest = Annotated[
    ChessboardDetectionRequest | CharucoDetectionRequest | MarkerBoardDetectionRequest,
    Field(discriminator="algorithm"),
]


class FramePoint(BaseModel):
    x: float
    y: float


class GridCoordsResponse(BaseModel):
    i: int
    j: int


class GridCellResponse(BaseModel):
    gx: int
    gy: int


class CellOffsetResponse(BaseModel):
    di: int
    dj: int


class CalibrationCornerResponse(BaseModel):
    id: str
    x: float
    y: float
    x_norm: float
    y_norm: float
    score: float
    grid: GridCoordsResponse | None = None
    corner_id: int | None = None
    target_position: FramePoint | None = None


class CalibrationDetectionResponse(BaseModel):
    kind: Literal["chessboard", "charuco", "checkerboard_marker"]
    corners: list[CalibrationCornerResponse]


class MarkerResponse(BaseModel):
    id: int
    grid_cell: GridCellResponse
    rotation: int
    hamming: int
    score: float
    border_score: float
    code: int
    inverted: bool
    corners_rect: list[FramePoint]
    corners_img: list[FramePoint] | None = None


class GridTransformResponse(BaseModel):
    a: int
    b: int
    c: int
    d: int


class AlignmentResponse(BaseModel):
    transform: GridTransformResponse
    translation: tuple[int, int]


class CircleCandidateResponse(BaseModel):
    center_img: FramePoint
    cell: GridCoordsResponse
    polarity: Literal["white", "black"]
    score: float
    contrast: float


class CircleMatchExpectedResponse(BaseModel):
    cell: GridCoordsResponse
    polarity: Literal["white", "black"]


class CircleMatchResponse(BaseModel):
    expected: CircleMatchExpectedResponse
    matched_index: int | None = None
    distance_cells: float | None = None
    offset_cells: CellOffsetResponse | None = None


class CalibrationSummaryResponse(BaseModel):
    corner_count: int
    marker_count: int | None = None
    circle_candidate_count: int | None = None
    circle_match_count: int | None = None
    alignment_inliers: int | None = None
    runtime_ms: float


class CalibrationTargetResponse(BaseModel):
    status: Literal["success"]
    key: str
    storage_mode: Literal["r2", "local"]
    algorithm: Literal["chessboard", "charuco", "markerboard"]
    image_width: int
    image_height: int
    frame: DetectionFrame
    summary: CalibrationSummaryResponse
    detection: CalibrationDetectionResponse
    markers: list[MarkerResponse] | None = None
    alignment: AlignmentResponse | None = None
    circle_candidates: list[CircleCandidateResponse] | None = None
    circle_matches: list[CircleMatchResponse] | None = None


def _decode_grayscale_image(data: bytes) -> tuple[np.ndarray, int, int]:
    try:
        with Image.open(io.BytesIO(data)) as image:
            gray = image.convert("L")
            width, height = gray.size
            arr = np.asarray(gray, dtype=np.uint8)
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400, detail="Uploaded object is not a supported image format"
        ) from exc
    except OSError as exc:
        raise HTTPException(status_code=400, detail="Failed to decode image") from exc

    if arr.ndim != 2:
        raise HTTPException(
            status_code=400, detail="Expected a grayscale 2D image after decoding"
        )
    if width <= 0 or height <= 0:
        raise HTTPException(
            status_code=400, detail="Decoded image has invalid dimensions"
        )
    if width > _MAX_IMAGE_DIMENSION or height > _MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions exceed maximum allowed {_MAX_IMAGE_DIMENSION}px per side",
        )
    return arr, width, height


def _apply_refiner(cfg: chess_corners.ChessConfig, refiner: RefinerName | None) -> None:
    if refiner is None:
        return
    if refiner == RefinerName.CENTER_OF_MASS:
        cfg.params.refiner = chess_corners.RefinerKind.center_of_mass(
            chess_corners.CenterOfMassConfig()
        )
    elif refiner == RefinerName.FORSTNER:
        cfg.params.refiner = chess_corners.RefinerKind.forstner(
            chess_corners.ForstnerConfig()
        )
    elif refiner == RefinerName.SADDLE_POINT:
        cfg.params.refiner = chess_corners.RefinerKind.saddle_point(
            chess_corners.SaddlePointConfig()
        )


def _apply_config_overrides(
    cfg: chess_corners.ChessConfig,
    overrides: ChessDetectorConfigOverrides,
) -> None:
    if overrides.threshold_rel is not None:
        cfg.threshold_rel = overrides.threshold_rel
    if overrides.threshold_abs is not None:
        cfg.threshold_abs = overrides.threshold_abs
    if overrides.nms_radius is not None:
        cfg.nms_radius = overrides.nms_radius
    if overrides.min_cluster_size is not None:
        cfg.min_cluster_size = overrides.min_cluster_size
    if overrides.pyramid_num_levels is not None:
        cfg.pyramid_num_levels = overrides.pyramid_num_levels
    if overrides.pyramid_min_size is not None:
        cfg.pyramid_min_size = overrides.pyramid_min_size
    if overrides.refinement_radius is not None:
        cfg.refinement_radius = overrides.refinement_radius
    if overrides.merge_radius is not None:
        cfg.merge_radius = overrides.merge_radius
    if overrides.use_radius10 is not None:
        cfg.use_radius10 = overrides.use_radius10
    if overrides.descriptor_use_radius10 is not None:
        cfg.descriptor_use_radius10 = overrides.descriptor_use_radius10
    _apply_refiner(cfg, overrides.refiner)


def _effective_config_snapshot(
    cfg: chess_corners.ChessConfig, use_ml_refiner: bool
) -> EffectiveConfig:
    # The binding exposes a nested `params.refiner.kind`.
    refiner_kind = getattr(cfg.params.refiner, "kind", "center_of_mass")
    return EffectiveConfig(
        use_ml_refiner=use_ml_refiner,
        threshold_rel=float(cfg.threshold_rel)
        if cfg.threshold_rel is not None
        else None,
        threshold_abs=float(cfg.threshold_abs)
        if cfg.threshold_abs is not None
        else None,
        nms_radius=int(cfg.nms_radius),
        min_cluster_size=int(cfg.min_cluster_size),
        pyramid_num_levels=int(cfg.pyramid_num_levels),
        pyramid_min_size=int(cfg.pyramid_min_size),
        refinement_radius=int(cfg.refinement_radius),
        merge_radius=float(cfg.merge_radius),
        use_radius10=bool(cfg.use_radius10),
        descriptor_use_radius10=(
            bool(cfg.descriptor_use_radius10)
            if cfg.descriptor_use_radius10 is not None
            else None
        ),
        refiner=str(refiner_kind),
    )


def _confidence_level(value: float) -> Literal["low", "medium", "high"]:
    if value >= 0.66:
        return "high"
    if value >= 0.33:
        return "medium"
    return "low"


@router.post("/calibrate")
@limiter.limit("30/minute")
async def calibrate_image(request: Request):
    return {
        "status": "success",
        "camera_matrix": [
            [1000.0, 0.0, 320.0],
            [0.0, 1000.0, 240.0],
            [0.0, 0.0, 1.0],
        ],
        "dist_coeffs": [-0.1, 0.01, 0.0, 0.0, 0.0],
        "message": "Dummy calibration parameters returned.",
    }


@router.post("/chess-corners", response_model=ChessCornersResponse)
@limiter.limit("10/minute")
async def detect_chess_corners(request: Request, payload: ChessCornersRequest):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    object_bytes = storage_service.load_object_bytes(payload.key, storage_mode)
    image_u8, image_width, image_height = _decode_grayscale_image(object_bytes)

    cfg = chess_corners.ChessConfig()
    _apply_config_overrides(cfg, payload.config)

    started = time.perf_counter()
    if payload.use_ml_refiner:
        corners_raw = chess_corners.find_chess_corners_with_ml(image_u8, cfg)
    else:
        corners_raw = chess_corners.find_chess_corners(image_u8, cfg)
    runtime_ms = (time.perf_counter() - started) * 1000.0

    if (
        not isinstance(corners_raw, np.ndarray)
        or corners_raw.ndim != 2
        or corners_raw.shape[1] < 4
    ):
        raise HTTPException(status_code=500, detail="Unexpected detector output format")

    finite_mask = np.all(np.isfinite(corners_raw[:, :4]), axis=1)
    filtered = corners_raw[finite_mask]

    if filtered.shape[0] == 0:
        return ChessCornersResponse(
            status="success",
            key=payload.key,
            storage_mode=storage_mode,
            image_width=image_width,
            image_height=image_height,
            frame=DetectionFrame(),
            config=_effective_config_snapshot(cfg, payload.use_ml_refiner),
            summary=DetectionSummary(count=0, runtime_ms=runtime_ms),
            corners=[],
        )

    responses = filtered[:, 2].astype(np.float64)
    response_min = float(np.min(responses))
    response_max = float(np.max(responses))
    response_mean = float(np.mean(responses))
    response_span = max(response_max - response_min, 1e-9)

    corners: list[CornerFeature] = []
    for row in filtered:
        x = float(row[0])
        y = float(row[1])
        response = float(row[2])
        orientation_rad = float(row[3])
        confidence = (
            (response - response_min) / response_span
            if response_max > response_min
            else 1.0
        )
        confidence = float(max(0.0, min(1.0, confidence)))
        corners.append(
            CornerFeature(
                id=str(uuid4()),
                x=x,
                y=y,
                x_norm=x / float(image_width),
                y_norm=y / float(image_height),
                response=response,
                orientation_rad=orientation_rad,
                orientation_deg=math.degrees(orientation_rad),
                direction=DirectionVector(
                    dx=math.cos(orientation_rad), dy=math.sin(orientation_rad)
                ),
                confidence=confidence,
                confidence_level=_confidence_level(confidence),
            )
        )

    corners.sort(key=lambda item: item.confidence, reverse=True)

    confidences = [item.confidence for item in corners]

    return ChessCornersResponse(
        status="success",
        key=payload.key,
        storage_mode=storage_mode,
        image_width=image_width,
        image_height=image_height,
        frame=DetectionFrame(),
        config=_effective_config_snapshot(cfg, payload.use_ml_refiner),
        summary=DetectionSummary(
            count=len(corners),
            response_min=response_min,
            response_max=response_max,
            response_mean=response_mean,
            confidence_min=min(confidences),
            confidence_max=max(confidences),
            runtime_ms=runtime_ms,
        ),
        corners=corners,
    )


def _finite_float(value: float, *, field_name: str) -> float:
    numeric = float(value)
    if not math.isfinite(numeric):
        raise HTTPException(
            status_code=500, detail=f"Detector returned non-finite {field_name}"
        )
    return numeric


def _target_kind_for_algorithm(
    algorithm: Literal["chessboard", "charuco", "markerboard"],
) -> Literal["chessboard", "charuco", "checkerboard_marker"]:
    if algorithm == "markerboard":
        return "checkerboard_marker"
    return algorithm


def _to_calibration_chess_config(
    request_cfg: CalibrationChessConfigRequest | None,
) -> calib_targets.ChessConfig | None:
    if request_cfg is None:
        return None

    params = None
    if request_cfg.params is not None:
        params = calib_targets.ChessCornerParams(
            use_radius10=request_cfg.params.use_radius10,
            descriptor_use_radius10=request_cfg.params.descriptor_use_radius10,
            threshold_rel=request_cfg.params.threshold_rel,
            threshold_abs=request_cfg.params.threshold_abs,
            nms_radius=request_cfg.params.nms_radius,
            min_cluster_size=request_cfg.params.min_cluster_size,
        )

    multiscale = None
    if request_cfg.multiscale is not None:
        pyramid = None
        if request_cfg.multiscale.pyramid is not None:
            pyramid = calib_targets.PyramidParams(
                num_levels=request_cfg.multiscale.pyramid.num_levels,
                min_size=request_cfg.multiscale.pyramid.min_size,
            )
        multiscale = calib_targets.CoarseToFineParams(
            pyramid=pyramid,
            refinement_radius=request_cfg.multiscale.refinement_radius,
            merge_radius=request_cfg.multiscale.merge_radius,
        )

    return calib_targets.ChessConfig(params=params, multiscale=multiscale)


def _to_orientation_clustering_params(
    request_cfg: OrientationClusteringParamsRequest | None,
) -> calib_targets.OrientationClusteringParams | None:
    if request_cfg is None:
        return None
    return calib_targets.OrientationClusteringParams(
        num_bins=request_cfg.num_bins,
        max_iters=request_cfg.max_iters,
        peak_min_separation_deg=request_cfg.peak_min_separation_deg,
        outlier_threshold_deg=request_cfg.outlier_threshold_deg,
        min_peak_weight_fraction=request_cfg.min_peak_weight_fraction,
        use_weights=request_cfg.use_weights,
    )


def _to_chessboard_detector_params(
    request_cfg: ChessboardDetectorParamsRequest | None,
) -> calib_targets.ChessboardParams | None:
    if request_cfg is None:
        return None
    return calib_targets.ChessboardParams(
        min_corner_strength=request_cfg.min_corner_strength,
        min_corners=request_cfg.min_corners,
        expected_rows=request_cfg.expected_rows,
        expected_cols=request_cfg.expected_cols,
        completeness_threshold=request_cfg.completeness_threshold,
        use_orientation_clustering=request_cfg.use_orientation_clustering,
        orientation_clustering_params=_to_orientation_clustering_params(
            request_cfg.orientation_clustering_params
        ),
    )


def _to_grid_graph_params(
    request_cfg: GridGraphParamsRequest | None,
) -> calib_targets.GridGraphParams | None:
    if request_cfg is None:
        return None
    return calib_targets.GridGraphParams(
        min_spacing_pix=request_cfg.min_spacing_pix,
        max_spacing_pix=request_cfg.max_spacing_pix,
        k_neighbors=request_cfg.k_neighbors,
        orientation_tolerance_deg=request_cfg.orientation_tolerance_deg,
    )


def _to_scan_decode_config(
    request_cfg: ScanDecodeConfigRequest | None,
) -> calib_targets.ScanDecodeConfig | None:
    if request_cfg is None:
        return None
    return calib_targets.ScanDecodeConfig(
        border_bits=request_cfg.border_bits,
        inset_frac=request_cfg.inset_frac,
        marker_size_rel=request_cfg.marker_size_rel,
        min_border_score=request_cfg.min_border_score,
        dedup_by_id=request_cfg.dedup_by_id,
    )


def _to_charuco_params(
    request_cfg: CharucoAlgorithmConfigRequest,
) -> calib_targets.CharucoDetectorParams:
    return calib_targets.CharucoDetectorParams(
        board=calib_targets.CharucoBoardSpec(
            rows=request_cfg.board.rows,
            cols=request_cfg.board.cols,
            cell_size=request_cfg.board.cell_size,
            marker_size_rel=request_cfg.board.marker_size_rel,
            dictionary=request_cfg.board.dictionary,  # type: ignore[arg-type]
            marker_layout=calib_targets.MarkerLayout.OPENCV_CHARUCO,
        ),
        px_per_square=request_cfg.px_per_square,
        chessboard=_to_chessboard_detector_params(request_cfg.chessboard),
        graph=_to_grid_graph_params(request_cfg.graph),
        scan=_to_scan_decode_config(request_cfg.scan),
        max_hamming=request_cfg.max_hamming,
        min_marker_inliers=request_cfg.min_marker_inliers,
    )


def _to_marker_board_layout(
    request_cfg: MarkerBoardLayoutRequest | None,
) -> calib_targets.MarkerBoardLayout | None:
    if request_cfg is None:
        return None

    circles = tuple(
        calib_targets.MarkerCircleSpec(
            i=item.i,
            j=item.j,
            polarity=(
                calib_targets.CirclePolarity.WHITE
                if item.polarity == "white"
                else calib_targets.CirclePolarity.BLACK
            ),
        )
        for item in request_cfg.circles
    )
    return calib_targets.MarkerBoardLayout(
        rows=request_cfg.rows,
        cols=request_cfg.cols,
        circles=circles,  # type: ignore[arg-type]
        cell_size=request_cfg.cell_size,
    )


def _to_circle_score_params(
    request_cfg: CircleScoreParamsRequest | None,
) -> calib_targets.CircleScoreParams | None:
    if request_cfg is None:
        return None
    return calib_targets.CircleScoreParams(
        patch_size=request_cfg.patch_size,
        diameter_frac=request_cfg.diameter_frac,
        ring_thickness_frac=request_cfg.ring_thickness_frac,
        ring_radius_mul=request_cfg.ring_radius_mul,
        min_contrast=request_cfg.min_contrast,
        samples=request_cfg.samples,
        center_search_px=request_cfg.center_search_px,
    )


def _to_circle_match_params(
    request_cfg: CircleMatchParamsRequest | None,
) -> calib_targets.CircleMatchParams | None:
    if request_cfg is None:
        return None
    return calib_targets.CircleMatchParams(
        max_candidates_per_polarity=request_cfg.max_candidates_per_polarity,
        max_distance_cells=request_cfg.max_distance_cells,
        min_offset_inliers=request_cfg.min_offset_inliers,
    )


def _to_marker_board_params(
    request_cfg: MarkerBoardAlgorithmConfigRequest | None,
) -> calib_targets.MarkerBoardParams | None:
    if request_cfg is None:
        return None
    return calib_targets.MarkerBoardParams(
        layout=_to_marker_board_layout(request_cfg.layout),
        chessboard=_to_chessboard_detector_params(request_cfg.chessboard),
        grid_graph=_to_grid_graph_params(request_cfg.grid_graph),
        circle_score=_to_circle_score_params(request_cfg.circle_score),
        match_params=_to_circle_match_params(request_cfg.match_params),
        roi_cells=request_cfg.roi_cells,
    )


def _frame_point_from_pair(
    point: tuple[float, float],
    *,
    field_name: str,
) -> FramePoint:
    return FramePoint(
        x=_finite_float(point[0], field_name=f"{field_name}.x"),
        y=_finite_float(point[1], field_name=f"{field_name}.y"),
    )


def _corner_response(
    corner: calib_targets.LabeledCorner,
    *,
    image_width: int,
    image_height: int,
) -> CalibrationCornerResponse:
    x = _finite_float(corner.position[0], field_name="corner.position.x")
    y = _finite_float(corner.position[1], field_name="corner.position.y")
    score = _finite_float(corner.score, field_name="corner.score")
    target_position = None
    if corner.target_position is not None:
        target_position = _frame_point_from_pair(
            corner.target_position,
            field_name="corner.target_position",
        )

    return CalibrationCornerResponse(
        id=str(uuid4()),
        x=x,
        y=y,
        x_norm=x / float(image_width),
        y_norm=y / float(image_height),
        score=score,
        grid=(
            GridCoordsResponse(i=int(corner.grid.i), j=int(corner.grid.j))
            if corner.grid is not None
            else None
        ),
        corner_id=int(corner.id) if corner.id is not None else None,
        target_position=target_position,
    )


def _marker_response(marker: calib_targets.MarkerDetection) -> MarkerResponse:
    corners_img = None
    if marker.corners_img is not None:
        corners_img = [
            _frame_point_from_pair(point, field_name="marker.corners_img")
            for point in marker.corners_img
        ]

    return MarkerResponse(
        id=int(marker.id),
        grid_cell=GridCellResponse(gx=int(marker.gc.gx), gy=int(marker.gc.gy)),
        rotation=int(marker.rotation),
        hamming=int(marker.hamming),
        score=_finite_float(marker.score, field_name="marker.score"),
        border_score=_finite_float(
            marker.border_score, field_name="marker.border_score"
        ),
        code=int(marker.code),
        inverted=bool(marker.inverted),
        corners_rect=[
            _frame_point_from_pair(point, field_name="marker.corners_rect")
            for point in marker.corners_rect
        ],
        corners_img=corners_img,
    )


def _alignment_response(
    alignment: calib_targets.GridAlignment | None,
) -> AlignmentResponse | None:
    if alignment is None:
        return None
    return AlignmentResponse(
        transform=GridTransformResponse(
            a=int(alignment.transform.a),
            b=int(alignment.transform.b),
            c=int(alignment.transform.c),
            d=int(alignment.transform.d),
        ),
        translation=(int(alignment.translation[0]), int(alignment.translation[1])),
    )


def _circle_candidate_response(
    candidate: calib_targets.CircleCandidate,
) -> CircleCandidateResponse:
    return CircleCandidateResponse(
        center_img=_frame_point_from_pair(
            candidate.center_img, field_name="circle_candidate.center_img"
        ),
        cell=GridCoordsResponse(i=int(candidate.cell.i), j=int(candidate.cell.j)),
        polarity=candidate.polarity.value,
        score=_finite_float(candidate.score, field_name="circle_candidate.score"),
        contrast=_finite_float(
            candidate.contrast, field_name="circle_candidate.contrast"
        ),
    )


def _circle_match_response(
    match: calib_targets.CircleMatch,
) -> CircleMatchResponse:
    return CircleMatchResponse(
        expected=CircleMatchExpectedResponse(
            cell=GridCoordsResponse(
                i=int(match.expected.cell.i), j=int(match.expected.cell.j)
            ),
            polarity=match.expected.polarity.value,
        ),
        matched_index=int(match.matched_index)
        if match.matched_index is not None
        else None,
        distance_cells=(
            _finite_float(
                match.distance_cells, field_name="circle_match.distance_cells"
            )
            if match.distance_cells is not None
            else None
        ),
        offset_cells=(
            CellOffsetResponse(
                di=int(match.offset_cells.di), dj=int(match.offset_cells.dj)
            )
            if match.offset_cells is not None
            else None
        ),
    )


def _empty_calibration_response(
    *,
    algorithm: Literal["chessboard", "charuco", "markerboard"],
    key: str,
    storage_mode: Literal["r2", "local"],
    image_width: int,
    image_height: int,
    runtime_ms: float,
) -> CalibrationTargetResponse:
    return CalibrationTargetResponse(
        status="success",
        key=key,
        storage_mode=storage_mode,
        algorithm=algorithm,
        image_width=image_width,
        image_height=image_height,
        frame=DetectionFrame(),
        summary=CalibrationSummaryResponse(
            corner_count=0,
            marker_count=0 if algorithm == "charuco" else None,
            circle_candidate_count=0 if algorithm == "markerboard" else None,
            circle_match_count=0 if algorithm == "markerboard" else None,
            alignment_inliers=0 if algorithm == "markerboard" else None,
            runtime_ms=runtime_ms,
        ),
        detection=CalibrationDetectionResponse(
            kind=_target_kind_for_algorithm(algorithm),
            corners=[],
        ),
        markers=[] if algorithm == "charuco" else None,
        circle_candidates=[] if algorithm == "markerboard" else None,
        circle_matches=[] if algorithm == "markerboard" else None,
    )


@router.post("/calibration-targets/detect", response_model=CalibrationTargetResponse)
@limiter.limit("10/minute")
async def detect_calibration_target(
    request: Request, payload: CalibrationTargetRequest
):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    object_bytes = storage_service.load_object_bytes(payload.key, storage_mode)
    image_u8, image_width, image_height = _decode_grayscale_image(object_bytes)

    started = time.perf_counter()
    raw_result: Any = None
    try:
        if payload.algorithm == "chessboard":
            raw_result = calib_targets.detect_chessboard(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_chessboard_detector_params(payload.config.detector),
            )
        elif payload.algorithm == "charuco":
            raw_result = calib_targets.detect_charuco(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_charuco_params(payload.config),
            )
        else:
            raw_result = calib_targets.detect_marker_board(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_marker_board_params(payload.config),
            )
    except RuntimeError as exc:
        runtime_ms = (time.perf_counter() - started) * 1000.0
        if "not detected" in str(exc).lower():
            return _empty_calibration_response(
                algorithm=payload.algorithm,
                key=payload.key,
                storage_mode=storage_mode,
                image_width=image_width,
                image_height=image_height,
                runtime_ms=runtime_ms,
            )
        raise HTTPException(
            status_code=400, detail=f"Calibration target detection failed: {exc}"
        ) from exc

    runtime_ms = (time.perf_counter() - started) * 1000.0
    if raw_result is None:
        return _empty_calibration_response(
            algorithm=payload.algorithm,
            key=payload.key,
            storage_mode=storage_mode,
            image_width=image_width,
            image_height=image_height,
            runtime_ms=runtime_ms,
        )

    corners = [
        _corner_response(corner, image_width=image_width, image_height=image_height)
        for corner in raw_result.detection.corners
    ]

    markers = None
    alignment = None
    circle_candidates = None
    circle_matches = None
    alignment_inliers = None

    if isinstance(raw_result, calib_targets.CharucoDetectionResult):
        markers = [_marker_response(marker) for marker in raw_result.markers]
    if isinstance(raw_result, calib_targets.MarkerBoardDetectionResult):
        alignment = _alignment_response(raw_result.alignment)
        circle_candidates = [
            _circle_candidate_response(candidate)
            for candidate in raw_result.circle_candidates
        ]
        circle_matches = [
            _circle_match_response(match) for match in raw_result.circle_matches
        ]
        alignment_inliers = int(raw_result.alignment_inliers)

    return CalibrationTargetResponse(
        status="success",
        key=payload.key,
        storage_mode=storage_mode,
        algorithm=payload.algorithm,
        image_width=image_width,
        image_height=image_height,
        frame=DetectionFrame(),
        summary=CalibrationSummaryResponse(
            corner_count=len(corners),
            marker_count=len(markers) if markers is not None else None,
            circle_candidate_count=len(circle_candidates)
            if circle_candidates is not None
            else None,
            circle_match_count=len(circle_matches)
            if circle_matches is not None
            else None,
            alignment_inliers=alignment_inliers,
            runtime_ms=runtime_ms,
        ),
        detection=CalibrationDetectionResponse(
            kind=_target_kind_for_algorithm(payload.algorithm),
            corners=corners,
        ),
        markers=markers,
        alignment=alignment,
        circle_candidates=circle_candidates,
        circle_matches=circle_matches,
    )


# ── Target Generation ────────────────────────────────────────────────────────

_VALID_PAGE_KINDS = {"a4", "letter", "custom"}


class PageSizeRequest(BaseModel):
    kind: Literal["a4", "letter", "custom"] = "a4"
    width_mm: float | None = Field(default=None, gt=0.0, le=2000.0)
    height_mm: float | None = Field(default=None, gt=0.0, le=2000.0)

    @field_validator("width_mm", "height_mm")
    @classmethod
    def custom_requires_dimensions(cls, v: float | None, info: Any) -> float | None:
        return v


class PageSpecRequest(BaseModel):
    size: PageSizeRequest = Field(default_factory=PageSizeRequest)
    orientation: Literal["portrait", "landscape"] = "portrait"
    margin_mm: float = Field(default=10.0, ge=0.0, le=100.0)


class RenderOptionsRequest(BaseModel):
    debug_annotations: bool = False
    png_dpi: int = Field(default=300, ge=72, le=1200)


class ChessboardGenConfigRequest(BaseModel):
    target_type: Literal["chessboard"]
    inner_rows: int = Field(..., ge=1, le=100)
    inner_cols: int = Field(..., ge=1, le=100)
    square_size_mm: float = Field(..., gt=0.0, le=500.0)


class CharucoGenConfigRequest(BaseModel):
    target_type: Literal["charuco"]
    rows: int = Field(..., ge=2, le=100)
    cols: int = Field(..., ge=2, le=100)
    square_size_mm: float = Field(..., gt=0.0, le=500.0)
    marker_size_rel: float = Field(..., gt=0.0, lt=1.0)
    dictionary: str = Field(..., min_length=1)
    border_bits: int = Field(default=1, ge=0, le=16)

    @field_validator("dictionary")
    @classmethod
    def validate_dictionary(cls, value: str) -> str:
        if value not in _CALIB_TARGET_DICTIONARIES:
            raise ValueError(
                f"dictionary must be one of {sorted(_CALIB_TARGET_DICTIONARIES)}"
            )
        return value


class MarkerBoardGenCircleRequest(BaseModel):
    i: int
    j: int
    polarity: Literal["white", "black"]


class MarkerBoardGenConfigRequest(BaseModel):
    target_type: Literal["markerboard"]
    inner_rows: int = Field(..., ge=1, le=100)
    inner_cols: int = Field(..., ge=1, le=100)
    square_size_mm: float = Field(..., gt=0.0, le=500.0)
    circles: list[MarkerBoardGenCircleRequest] | None = None
    circle_diameter_rel: float = Field(default=0.5, gt=0.0, lt=1.0)


GenerateTargetConfig = Annotated[
    ChessboardGenConfigRequest | CharucoGenConfigRequest | MarkerBoardGenConfigRequest,
    Field(discriminator="target_type"),
]


class GenerateTargetRequest(BaseModel):
    config: GenerateTargetConfig
    page: PageSpecRequest = Field(default_factory=PageSpecRequest)
    render: RenderOptionsRequest = Field(default_factory=RenderOptionsRequest)
    include_png: bool = False


class GenerateTargetResponse(BaseModel):
    status: Literal["success"]
    target_type: Literal["chessboard", "charuco", "markerboard"]
    svg: str
    config_json: str
    png_base64: str | None = None


def _build_page_spec(req: PageSpecRequest) -> calib_targets.PageSpec:
    size = calib_targets.PageSize(
        kind=req.size.kind,
        width_mm=req.size.width_mm,
        height_mm=req.size.height_mm,
    )
    return calib_targets.PageSpec(
        size=size,
        orientation=req.orientation,
        margin_mm=req.margin_mm,
    )


def _build_target_spec(
    config: GenerateTargetConfig,
) -> (
    calib_targets.ChessboardTargetSpec
    | calib_targets.CharucoTargetSpec
    | calib_targets.MarkerBoardTargetSpec
):
    if isinstance(config, ChessboardGenConfigRequest):
        return calib_targets.ChessboardTargetSpec(
            inner_rows=config.inner_rows,
            inner_cols=config.inner_cols,
            square_size_mm=config.square_size_mm,
        )
    if isinstance(config, CharucoGenConfigRequest):
        return calib_targets.CharucoTargetSpec(
            rows=config.rows,
            cols=config.cols,
            square_size_mm=config.square_size_mm,
            marker_size_rel=config.marker_size_rel,
            dictionary=config.dictionary,  # type: ignore[arg-type]
            marker_layout=calib_targets.MarkerLayout.OPENCV_CHARUCO,
            border_bits=config.border_bits,
        )
    # MarkerBoardGenConfigRequest
    if config.circles is not None:
        circles = tuple(
            calib_targets.MarkerCircleSpec(
                i=c.i,
                j=c.j,
                polarity=(
                    calib_targets.CirclePolarity.WHITE
                    if c.polarity == "white"
                    else calib_targets.CirclePolarity.BLACK
                ),
            )
            for c in config.circles
        )
    else:
        circles = calib_targets.MarkerBoardTargetSpec.default_circles(
            config.inner_rows, config.inner_cols
        )
    return calib_targets.MarkerBoardTargetSpec(
        inner_rows=config.inner_rows,
        inner_cols=config.inner_cols,
        square_size_mm=config.square_size_mm,
        circles=circles,  # type: ignore[arg-type]
        circle_diameter_rel=config.circle_diameter_rel,
    )


@router.post("/calibration-targets/generate", response_model=GenerateTargetResponse)
@limiter.limit("30/minute")
async def generate_calibration_target(request: Request, payload: GenerateTargetRequest):
    page = _build_page_spec(payload.page)
    target = _build_target_spec(payload.config)
    render = calib_targets.RenderOptions(
        debug_annotations=payload.render.debug_annotations,
        png_dpi=payload.render.png_dpi,
    )
    doc = calib_targets.PrintableTargetDocument(target=target, page=page, render=render)

    try:
        bundle = calib_targets.render_target_bundle(doc)
    except RuntimeError as exc:
        if "does not fit" in str(exc).lower():
            raise HTTPException(
                status_code=422,
                detail=f"Board does not fit page: {exc}",
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"Target generation failed: {exc}",
        ) from exc

    png_base64 = None
    if payload.include_png:
        png_base64 = base64.b64encode(bundle.png_bytes).decode("ascii")

    return GenerateTargetResponse(
        status="success",
        target_type=payload.config.target_type,
        svg=bundle.svg_text,
        config_json=bundle.json_text,
        png_base64=png_base64,
    )
