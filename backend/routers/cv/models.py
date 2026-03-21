import re
from enum import Enum
from typing import Annotated, Literal

import calib_targets
from pydantic import BaseModel, Field, field_validator

_KEY_PATTERN = re.compile(r"^[a-z0-9_-]+/[0-9a-f]{64}$")
_CALIB_TARGET_DICTIONARIES = set(calib_targets.DICTIONARY_NAMES)


# ── Chess corners models ────────────────────────────────────────────────────


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


# ── Calibration target models ────────────────────────────────────────────────


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


# ── Shared response models ───────────────────────────────────────────────────


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
