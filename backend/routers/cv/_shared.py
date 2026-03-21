import io
import math
import os
import re

import numpy as np
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from services import storage_service

from .models import FramePoint

# Maximum image dimension accepted by CV endpoints (pixels per side).
MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "16000"))
# Maximum time (seconds) a CV algorithm call may take before being aborted.
CV_TIMEOUT_SECONDS = int(os.getenv("CV_TIMEOUT_SECONDS", "120"))
# Storage keys use content-addressed format: "{prefix}/{sha256}".
KEY_PATTERN = re.compile(r"^[a-z0-9_-]+/[0-9a-f]{64}$")


def decode_grayscale_image(data: bytes) -> tuple[np.ndarray, int, int]:
    max_bytes = storage_service.max_upload_bytes()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image data exceeds maximum allowed size ({max_bytes} bytes)",
        )
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
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions exceed maximum allowed {MAX_IMAGE_DIMENSION}px per side",
        )
    return arr, width, height


def finite_float(value: float, *, field_name: str) -> float:
    numeric = float(value)
    if not math.isfinite(numeric):
        raise HTTPException(
            status_code=500, detail=f"Detector returned non-finite {field_name}"
        )
    return numeric


def frame_point_from_pair(
    point: tuple[float, float],
    *,
    field_name: str,
) -> FramePoint:
    return FramePoint(
        x=finite_float(point[0], field_name=f"{field_name}.x"),
        y=finite_float(point[1], field_name=f"{field_name}.y"),
    )
