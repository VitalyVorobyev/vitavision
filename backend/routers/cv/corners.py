import asyncio
import functools
import logging
import math
import time
from typing import Literal
from uuid import uuid4

import chess_corners
import numpy as np
from fastapi import APIRouter, HTTPException, Request

from limiter import limiter
from services import storage_service

from ._shared import CV_TIMEOUT_SECONDS, decode_grayscale_image
from .models import (
    ChessDetectorConfigOverrides,
    ChessCornersRequest,
    ChessCornersResponse,
    CornerFeature,
    DetectionFrame,
    DetectionSummary,
    DirectionVector,
    EffectiveConfig,
    RefinerName,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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


@router.post("/chess-corners", response_model=ChessCornersResponse)
@limiter.limit("10/minute")
async def detect_chess_corners(request: Request, payload: ChessCornersRequest):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    object_bytes = storage_service.load_object_bytes(payload.key, storage_mode)
    image_u8, image_width, image_height = decode_grayscale_image(object_bytes)

    cfg = chess_corners.ChessConfig()
    _apply_config_overrides(cfg, payload.config)

    loop = asyncio.get_running_loop()
    detect_fn = (
        chess_corners.find_chess_corners_with_ml
        if payload.use_ml_refiner
        else chess_corners.find_chess_corners
    )
    started = time.perf_counter()
    try:
        corners_raw = await asyncio.wait_for(
            loop.run_in_executor(None, functools.partial(detect_fn, image_u8, cfg)),
            timeout=CV_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Algorithm timed out")
    runtime_ms = (time.perf_counter() - started) * 1000.0

    logger.info(
        "chess-corners: %dx%d, %s, %.1fms",
        image_width,
        image_height,
        "ml" if payload.use_ml_refiner else "classic",
        runtime_ms,
    )

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
