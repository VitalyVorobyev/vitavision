import asyncio
import functools
import logging
import time

import ringgrid
from fastapi import APIRouter, HTTPException, Request

from limiter import limiter
from services import storage_service

from ._shared import CV_TIMEOUT_SECONDS, decode_grayscale_image, finite_float, frame_point_from_pair
from .models import (
    DetectionFrame,
    FramePoint,
    RinggridDecodeResponse,
    RinggridDetectRequest,
    RinggridDetectResponse,
    RinggridEllipseResponse,
    RinggridFitResponse,
    RinggridMarkerResponse,
    RinggridSummaryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _ellipse_response(ell: ringgrid.Ellipse, label: str) -> RinggridEllipseResponse:
    return RinggridEllipseResponse(
        cx=finite_float(ell.cx, field_name=f"{label}.cx"),
        cy=finite_float(ell.cy, field_name=f"{label}.cy"),
        a=finite_float(ell.a, field_name=f"{label}.a"),
        b=finite_float(ell.b, field_name=f"{label}.b"),
        angle=finite_float(ell.angle, field_name=f"{label}.angle"),
    )


def _decode_response(dec: ringgrid.DecodeMetrics) -> RinggridDecodeResponse:
    return RinggridDecodeResponse(
        best_id=dec.best_id,
        best_rotation=dec.best_rotation,
        best_dist=dec.best_dist,
        margin=dec.margin,
        decode_confidence=finite_float(dec.decode_confidence, field_name="decode_confidence"),
    )


def _fit_response(fit: ringgrid.FitMetrics) -> RinggridFitResponse:
    return RinggridFitResponse(
        rms_residual_outer=(
            finite_float(fit.rms_residual_outer, field_name="rms_residual_outer")
            if fit.rms_residual_outer is not None
            else None
        ),
        rms_residual_inner=(
            finite_float(fit.rms_residual_inner, field_name="rms_residual_inner")
            if fit.rms_residual_inner is not None
            else None
        ),
        ransac_inlier_ratio_outer=(
            finite_float(fit.ransac_inlier_ratio_outer, field_name="ransac_inlier_ratio_outer")
            if fit.ransac_inlier_ratio_outer is not None
            else None
        ),
        ransac_inlier_ratio_inner=(
            finite_float(fit.ransac_inlier_ratio_inner, field_name="ransac_inlier_ratio_inner")
            if fit.ransac_inlier_ratio_inner is not None
            else None
        ),
    )


def _marker_response(marker: ringgrid.DetectedMarker) -> RinggridMarkerResponse | None:
    if marker.id is None or marker.ellipse_outer is None or marker.ellipse_inner is None:
        return None

    center = frame_point_from_pair(
        (marker.center[0], marker.center[1]),
        field_name="center",
    )

    board_xy: FramePoint | None = None
    if marker.board_xy_mm is not None:
        board_xy = frame_point_from_pair(
            (marker.board_xy_mm[0], marker.board_xy_mm[1]),
            field_name="board_xy_mm",
        )

    return RinggridMarkerResponse(
        id=marker.id,
        confidence=finite_float(marker.confidence, field_name="confidence"),
        center=center,
        ellipse_outer=_ellipse_response(marker.ellipse_outer, "ellipse_outer"),
        ellipse_inner=_ellipse_response(marker.ellipse_inner, "ellipse_inner"),
        decode=_decode_response(marker.decode) if marker.decode is not None else None,
        fit=_fit_response(marker.fit) if marker.fit is not None else None,
        board_xy_mm=board_xy,
    )


def _run_detection(image_u8, board_req, profile: str) -> ringgrid.DetectionResult:
    board = ringgrid.BoardLayout(
        schema="ringgrid.target.v4",
        name="api-request",
        pitch_mm=board_req.pitch_mm,
        rows=board_req.rows,
        long_row_cols=board_req.long_row_cols,
        marker_outer_radius_mm=board_req.marker_outer_radius_mm,
        marker_inner_radius_mm=board_req.marker_inner_radius_mm,
        marker_ring_width_mm=board_req.marker_ring_width_mm,
    )
    # Must populate internal _spec_json before creating detector
    board.to_spec_json()

    detector = ringgrid.Detector.from_board(board)
    return detector.detect_adaptive(image_u8)


@router.post("/ringgrid/detect", response_model=RinggridDetectResponse)
@limiter.limit("10/minute")
async def detect_ringgrid(request: Request, payload: RinggridDetectRequest):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    object_bytes = storage_service.load_object_bytes(payload.key, storage_mode)
    image_u8, image_width, image_height = decode_grayscale_image(object_bytes)

    loop = asyncio.get_running_loop()
    started = time.perf_counter()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                functools.partial(
                    _run_detection, image_u8, payload.board, payload.profile,
                ),
            ),
            timeout=CV_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Algorithm timed out")
    runtime_ms = (time.perf_counter() - started) * 1000.0

    markers: list[RinggridMarkerResponse] = []
    for det_marker in result.detected_markers:
        resp = _marker_response(det_marker)
        if resp is not None:
            markers.append(resp)

    logger.info(
        "ringgrid: %dx%d, %d markers, %.1fms",
        image_width,
        image_height,
        len(markers),
        runtime_ms,
    )

    return RinggridDetectResponse(
        status="success",
        key=payload.key,
        storage_mode=storage_mode,
        image_width=image_width,
        image_height=image_height,
        frame=DetectionFrame(),
        summary=RinggridSummaryResponse(
            marker_count=len(markers),
            runtime_ms=runtime_ms,
        ),
        markers=markers,
    )
