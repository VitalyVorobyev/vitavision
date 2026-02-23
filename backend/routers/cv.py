import io
import math
import os
import time
from enum import Enum
from typing import Literal
from uuid import uuid4

import chess_corners
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator

from services import storage_service
from limiter import limiter

router = APIRouter(tags=["Computer Vision"])

# Maximum image dimension accepted by CV endpoints (pixels per side).
_MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "16000"))

# Storage keys use content-addressed format: "{prefix}/{sha256}" where sha256 is 64 hex chars.
import re as _re
_KEY_PATTERN = _re.compile(r"^[a-z0-9_-]+/[0-9a-f]{64}$")


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
    config: ChessDetectorConfigOverrides = Field(default_factory=ChessDetectorConfigOverrides)

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
    subpixel_offset_px: float


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
    subpixel_mean_offset_px: float | None = None


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


def _decode_grayscale_image(data: bytes) -> tuple[np.ndarray, int, int]:
    try:
        with Image.open(io.BytesIO(data)) as image:
            gray = image.convert("L")
            width, height = gray.size
            arr = np.asarray(gray, dtype=np.uint8)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded object is not a supported image format") from exc
    except OSError as exc:
        raise HTTPException(status_code=400, detail="Failed to decode image") from exc

    if arr.ndim != 2:
        raise HTTPException(status_code=400, detail="Expected a grayscale 2D image after decoding")
    if width <= 0 or height <= 0:
        raise HTTPException(status_code=400, detail="Decoded image has invalid dimensions")
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
        cfg.params.refiner = chess_corners.RefinerKind.center_of_mass(chess_corners.CenterOfMassConfig())
    elif refiner == RefinerName.FORSTNER:
        cfg.params.refiner = chess_corners.RefinerKind.forstner(chess_corners.ForstnerConfig())
    elif refiner == RefinerName.SADDLE_POINT:
        cfg.params.refiner = chess_corners.RefinerKind.saddle_point(chess_corners.SaddlePointConfig())


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


def _effective_config_snapshot(cfg: chess_corners.ChessConfig, use_ml_refiner: bool) -> EffectiveConfig:
    # The binding exposes a nested `params.refiner.kind`.
    refiner_kind = getattr(cfg.params.refiner, "kind", "center_of_mass")
    return EffectiveConfig(
        use_ml_refiner=use_ml_refiner,
        threshold_rel=float(cfg.threshold_rel) if cfg.threshold_rel is not None else None,
        threshold_abs=float(cfg.threshold_abs) if cfg.threshold_abs is not None else None,
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

    if not isinstance(corners_raw, np.ndarray) or corners_raw.ndim != 2 or corners_raw.shape[1] < 4:
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
        confidence = (response - response_min) / response_span if response_max > response_min else 1.0
        confidence = float(max(0.0, min(1.0, confidence)))

        nearest_x = float(round(x))
        nearest_y = float(round(y))
        subpixel_offset = math.hypot(x - nearest_x, y - nearest_y)
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
                direction=DirectionVector(dx=math.cos(orientation_rad), dy=math.sin(orientation_rad)),
                confidence=confidence,
                confidence_level=_confidence_level(confidence),
                subpixel_offset_px=subpixel_offset,
            )
        )

    corners.sort(key=lambda item: item.confidence, reverse=True)

    confidences = [item.confidence for item in corners]
    subpixel_offsets = [item.subpixel_offset_px for item in corners]

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
            subpixel_mean_offset_px=float(np.mean(subpixel_offsets)),
        ),
        corners=corners,
    )
