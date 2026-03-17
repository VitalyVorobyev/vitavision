"""Tests for POST /api/v1/cv/calibration-targets/generate (TGEN-002).

Skipped: the backend generate endpoint has not been implemented yet.
These tests are ready to enable once the route is added to routers/cv.py.
"""

import pytest

pytestmark = pytest.mark.skip(reason="generate endpoint not implemented yet (TGEN-002)")

import base64
import json

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

HEADERS = {"X-API-Key": "test"}


# ── Chessboard ────────────────────────────────────────────────────────────────


def test_chessboard_default_page():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "chessboard",
                "inner_rows": 5,
                "inner_cols": 7,
                "square_size_mm": 20.0,
            },
            "page": {"orientation": "landscape"},
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["target_type"] == "chessboard"
    assert body["svg"].startswith("<?xml")
    assert body["png_base64"] is None
    config = json.loads(body["config_json"])
    assert config["target"]["inner_rows"] == 5


def test_chessboard_with_png():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "chessboard",
                "inner_rows": 3,
                "inner_cols": 4,
                "square_size_mm": 15.0,
            },
            "include_png": True,
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    png_bytes = base64.b64decode(body["png_base64"])
    assert png_bytes[:4] == b"\x89PNG"


# ── ChArUco ───────────────────────────────────────────────────────────────────


def test_charuco_generation():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "charuco",
                "rows": 5,
                "cols": 7,
                "square_size_mm": 20.0,
                "marker_size_rel": 0.6,
                "dictionary": "DICT_4X4_50",
            },
            "page": {"orientation": "landscape"},
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["target_type"] == "charuco"
    assert "<svg" in body["svg"]


def test_charuco_invalid_dictionary():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "charuco",
                "rows": 5,
                "cols": 7,
                "square_size_mm": 20.0,
                "marker_size_rel": 0.6,
                "dictionary": "INVALID_DICT",
            },
        },
        headers=HEADERS,
    )
    assert resp.status_code == 422


# ── Marker Board ──────────────────────────────────────────────────────────────


def test_markerboard_default_circles():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "markerboard",
                "inner_rows": 5,
                "inner_cols": 7,
                "square_size_mm": 20.0,
            },
            "page": {"orientation": "landscape"},
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["target_type"] == "markerboard"
    assert body["svg"].startswith("<?xml")


def test_markerboard_custom_circles():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "markerboard",
                "inner_rows": 5,
                "inner_cols": 7,
                "square_size_mm": 20.0,
                "circles": [
                    {"i": 3, "j": 2, "polarity": "white"},
                    {"i": 4, "j": 2, "polarity": "black"},
                    {"i": 4, "j": 3, "polarity": "white"},
                ],
            },
            "page": {"orientation": "landscape"},
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200


# ── Paper validation ──────────────────────────────────────────────────────────


def test_board_too_large_returns_422():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "chessboard",
                "inner_rows": 20,
                "inner_cols": 20,
                "square_size_mm": 30.0,
            },
        },
        headers=HEADERS,
    )
    assert resp.status_code == 422
    assert "does not fit" in resp.json()["detail"].lower()


def test_custom_page_size():
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "chessboard",
                "inner_rows": 3,
                "inner_cols": 4,
                "square_size_mm": 10.0,
            },
            "page": {
                "size": {"kind": "custom", "width_mm": 200.0, "height_mm": 150.0},
                "margin_mm": 5.0,
            },
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
    assert "200mm" in resp.json()["svg"] or "150mm" in resp.json()["svg"]


def test_large_custom_page():
    """Use custom page with A3 dimensions (297x420mm)."""
    resp = client.post(
        "/api/v1/cv/calibration-targets/generate",
        json={
            "config": {
                "target_type": "chessboard",
                "inner_rows": 7,
                "inner_cols": 9,
                "square_size_mm": 25.0,
            },
            "page": {
                "size": {
                    "kind": "custom",
                    "width_mm": 420.0,
                    "height_mm": 297.0,
                },
                "orientation": "landscape",
            },
        },
        headers=HEADERS,
    )
    assert resp.status_code == 200
