import asyncio
import logging
import time
from typing import Any, Literal
from uuid import uuid4

import calib_targets
from fastapi import APIRouter, HTTPException, Request

from limiter import limiter
from services import storage_service

from ._shared import (
    CV_TIMEOUT_SECONDS,
    decode_grayscale_image,
    finite_float,
    frame_point_from_pair,
)
from .models import (
    AlignmentResponse,
    CalibrationChessConfigRequest,
    CalibrationCornerResponse,
    CalibrationDetectionResponse,
    CalibrationSummaryResponse,
    CalibrationTargetRequest,
    CalibrationTargetResponse,
    CellOffsetResponse,
    CharucoAlgorithmConfigRequest,
    ChessboardDetectorParamsRequest,
    CircleCandidateResponse,
    CircleMatchExpectedResponse,
    CircleMatchParamsRequest,
    CircleMatchResponse,
    CircleScoreParamsRequest,
    DetectionFrame,
    GridCellResponse,
    GridCoordsResponse,
    GridGraphParamsRequest,
    GridTransformResponse,
    MarkerBoardAlgorithmConfigRequest,
    MarkerBoardLayoutRequest,
    MarkerResponse,
    OrientationClusteringParamsRequest,
    ScanDecodeConfigRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Config conversion helpers ────────────────────────────────────────────────


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


# ── Response builders ────────────────────────────────────────────────────────


def _target_kind_for_algorithm(
    algorithm: Literal["chessboard", "charuco", "markerboard"],
) -> Literal["chessboard", "charuco", "checkerboard_marker"]:
    if algorithm == "markerboard":
        return "checkerboard_marker"
    return algorithm


def _corner_response(
    corner: calib_targets.LabeledCorner,
    *,
    image_width: int,
    image_height: int,
) -> CalibrationCornerResponse:
    x = finite_float(corner.position[0], field_name="corner.position.x")
    y = finite_float(corner.position[1], field_name="corner.position.y")
    score = finite_float(corner.score, field_name="corner.score")
    target_position = None
    if corner.target_position is not None:
        target_position = frame_point_from_pair(
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
            frame_point_from_pair(point, field_name="marker.corners_img")
            for point in marker.corners_img
        ]

    return MarkerResponse(
        id=int(marker.id),
        grid_cell=GridCellResponse(gx=int(marker.gc.gx), gy=int(marker.gc.gy)),
        rotation=int(marker.rotation),
        hamming=int(marker.hamming),
        score=finite_float(marker.score, field_name="marker.score"),
        border_score=finite_float(
            marker.border_score, field_name="marker.border_score"
        ),
        code=int(marker.code),
        inverted=bool(marker.inverted),
        corners_rect=[
            frame_point_from_pair(point, field_name="marker.corners_rect")
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
        center_img=frame_point_from_pair(
            candidate.center_img, field_name="circle_candidate.center_img"
        ),
        cell=GridCoordsResponse(i=int(candidate.cell.i), j=int(candidate.cell.j)),
        polarity=candidate.polarity.value,
        score=finite_float(candidate.score, field_name="circle_candidate.score"),
        contrast=finite_float(
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
            finite_float(match.distance_cells, field_name="circle_match.distance_cells")
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


# ── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/calibration-targets/detect", response_model=CalibrationTargetResponse)
@limiter.limit("10/minute")
async def detect_calibration_target(
    request: Request, payload: CalibrationTargetRequest
):
    storage_mode = storage_service.resolve_storage_mode(payload.storage_mode)
    object_bytes = storage_service.load_object_bytes(payload.key, storage_mode)
    image_u8, image_width, image_height = decode_grayscale_image(object_bytes)

    def _run_detection() -> Any:
        if payload.algorithm == "chessboard":
            return calib_targets.detect_chessboard(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_chessboard_detector_params(payload.config.detector),
            )
        elif payload.algorithm == "charuco":
            return calib_targets.detect_charuco(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_charuco_params(payload.config),
            )
        else:
            return calib_targets.detect_marker_board(
                image_u8,
                chess_cfg=_to_calibration_chess_config(payload.config.chess_cfg),
                params=_to_marker_board_params(payload.config),
            )

    loop = asyncio.get_running_loop()
    started = time.perf_counter()
    raw_result: Any = None
    try:
        raw_result = await asyncio.wait_for(
            loop.run_in_executor(None, _run_detection),
            timeout=CV_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Algorithm timed out")
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
    logger.info(
        "calibration-targets/%s: %dx%d, %.1fms",
        payload.algorithm,
        image_width,
        image_height,
        runtime_ms,
    )
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
