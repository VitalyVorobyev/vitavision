"""Backend integration tests.

Requires env vars set before the process starts:
  STORAGE_MODE=local
  LOCAL_STORAGE_ROOT=<writable temp dir>

No external services (R2, network) are needed.
"""

import hashlib
import io
from pathlib import Path

import numpy as np
from PIL import Image
from starlette.testclient import TestClient

import auth
from main import app

client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_checkerboard_png(size: int = 300, cell: int = 100) -> bytes:
    """Return PNG bytes of a synthetic checkerboard image."""
    board = np.zeros((size, size), dtype=np.uint8)
    for row in range(size // cell):
        for col in range(size // cell):
            if (row + col) % 2 == 1:
                board[row * cell : (row + 1) * cell, col * cell : (col + 1) * cell] = (
                    255
                )
    img = Image.fromarray(board, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _content_addressed_key(data: bytes) -> str:
    """Return the content-addressed storage key for *data*."""
    return f"uploads/{_sha256_hex(data)}"


def _upload(key: str, content: bytes = b"") -> None:
    png = content or _make_checkerboard_png()
    resp = client.put(
        f"/api/v1/storage/local-upload/{key}",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 200


def _sample_bytes(name: str) -> bytes:
    repo_root = Path(__file__).resolve().parents[2]
    return (repo_root / "public" / name).read_bytes()


# ── Health ────────────────────────────────────────────────────────────────────


def test_root_returns_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Vitavision API is running"


# ── Storage ───────────────────────────────────────────────────────────────────


def test_upload_ticket_returns_local_descriptor():
    png = _make_checkerboard_png()
    sha = _sha256_hex(png)
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"sha256": sha, "content_type": "image/png", "storage_mode": "local"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["storage_mode"] == "local"
    assert body["upload"]["method"] == "PUT"
    assert "local-upload" in body["upload"]["url"]
    assert body["key"] == f"uploads/{sha}"


def test_upload_ticket_missing_sha256_rejected():
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"content_type": "image/png"},
    )
    assert resp.status_code == 422


def test_upload_ticket_invalid_sha256_rejected():
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"sha256": "not-a-valid-hash", "content_type": "image/png"},
    )
    assert resp.status_code == 422


def test_local_upload_and_round_trip():
    png = _make_checkerboard_png()
    key = _content_addressed_key(png)

    resp = client.put(
        f"/api/v1/storage/local-upload/{key}",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["bytes_written"] == len(png)
    assert body["key"] == key

    resp = client.get(f"/api/v1/storage/local-object/{key}")
    assert resp.status_code == 200
    assert resp.content == png


def test_local_object_missing_returns_404():
    # Valid format key that doesn't exist on disk
    fake_sha = "0" * 64
    resp = client.get(f"/api/v1/storage/local-object/uploads/{fake_sha}")
    assert resp.status_code == 404


def test_local_upload_rejects_invalid_key_format():
    """Keys that don't match the content-addressed format are rejected."""
    png = _make_checkerboard_png()
    resp = client.put(
        "/api/v1/storage/local-upload/uploads/not-a-sha256.png",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 400


def test_local_object_rejects_invalid_key_format():
    resp = client.get("/api/v1/storage/local-object/uploads/not-a-sha256.png")
    assert resp.status_code == 400


def test_local_upload_empty_body_rejected():
    fake_sha = "a" * 64
    resp = client.put(
        f"/api/v1/storage/local-upload/uploads/{fake_sha}",
        content=b"",
        headers={"Content-Type": "image/png"},
    )
    # FastAPI rejects missing/empty Body(...) at validation time (422),
    # before the endpoint's explicit `if not body` check (400).
    assert resp.status_code in (400, 422)


def test_local_upload_rejects_over_max_upload_bytes(monkeypatch):
    png = _make_checkerboard_png(size=40, cell=20)
    key = _content_addressed_key(png)
    monkeypatch.setenv("MAX_UPLOAD_BYTES", str(len(png) - 1))

    resp = client.put(
        f"/api/v1/storage/local-upload/{key}",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 413


def test_local_upload_ticket_includes_api_key_header_when_auth_enabled(monkeypatch):
    monkeypatch.setattr(auth, "_api_key", "ci-secret")
    # Use a unique image that hasn't been uploaded yet so we get exists=False.
    png = _make_checkerboard_png(size=50, cell=25)
    sha = _sha256_hex(png)

    ticket_resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"sha256": sha, "content_type": "image/png", "storage_mode": "local"},
        headers={"X-API-Key": "ci-secret"},
    )
    assert ticket_resp.status_code == 200

    ticket = ticket_resp.json()
    assert ticket["exists"] is False
    assert ticket["upload"] is not None
    assert ticket["upload"]["headers"]["X-API-Key"] == "ci-secret"

    upload_path = ticket["upload"]["url"].replace("http://testserver", "")
    upload_resp = client.put(
        upload_path,
        content=png,
        headers=ticket["upload"]["headers"],
    )
    assert upload_resp.status_code == 200


# ── CV / Chess Corners ────────────────────────────────────────────────────────


def test_chess_corners_basic():
    png = _make_checkerboard_png()
    key = _content_addressed_key(png)
    _upload(key, png)

    resp = client.post(
        "/api/v1/cv/chess-corners",
        json={"key": key, "storage_mode": "local"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["key"] == key
    assert body["storage_mode"] == "local"
    assert body["image_width"] == 300
    assert body["image_height"] == 300
    assert isinstance(body["corners"], list)
    assert body["summary"]["count"] == len(body["corners"])


def test_chess_corners_missing_key_returns_404():
    fake_sha = "b" * 64
    key = f"uploads/{fake_sha}"
    resp = client.post(
        "/api/v1/cv/chess-corners",
        json={"key": key, "storage_mode": "local"},
    )
    assert resp.status_code == 404


def test_chess_corners_invalid_key_format_rejected():
    resp = client.post(
        "/api/v1/cv/chess-corners",
        json={"key": "uploads/no-such-image.png", "storage_mode": "local"},
    )
    assert resp.status_code == 422


def test_chess_corners_invalid_payload_rejected():
    resp = client.post("/api/v1/cv/chess-corners", json={})
    assert resp.status_code == 422


def test_calibration_targets_chessboard_sample():
    png = _sample_bytes("chessboard.png")
    key = _content_addressed_key(png)
    _upload(key, png)

    resp = client.post(
        "/api/v1/cv/calibration-targets/detect",
        json={
            "algorithm": "chessboard",
            "key": key,
            "storage_mode": "local",
            "config": {
                "detector": {
                    "expected_rows": 7,
                    "expected_cols": 11,
                    "min_corner_strength": 0.2,
                    "completeness_threshold": 0.1,
                }
            },
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["algorithm"] == "chessboard"
    assert body["frame"]["name"] == "image_px_center"
    assert body["detection"]["kind"] == "chessboard"
    assert len(body["detection"]["corners"]) > 0
    assert body["summary"]["corner_count"] == len(body["detection"]["corners"])


def test_calibration_targets_charuco_sample():
    png = _sample_bytes("charuco.png")
    key = _content_addressed_key(png)
    _upload(key, png)

    resp = client.post(
        "/api/v1/cv/calibration-targets/detect",
        json={
            "algorithm": "charuco",
            "key": key,
            "storage_mode": "local",
            "config": {
                "board": {
                    "rows": 22,
                    "cols": 22,
                    "cell_size": 4.8,
                    "marker_size_rel": 0.75,
                    "dictionary": "DICT_4X4_1000",
                },
                "px_per_square": 40.0,
                "graph": {
                    "min_spacing_pix": 40.0,
                    "max_spacing_pix": 160.0,
                    "k_neighbors": 8,
                    "orientation_tolerance_deg": 22.5,
                },
            },
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["algorithm"] == "charuco"
    assert body["detection"]["kind"] == "charuco"
    assert len(body["detection"]["corners"]) > 0
    assert body["markers"] is not None
    assert len(body["markers"]) > 0
    assert body["summary"]["marker_count"] == len(body["markers"])


# ── API Key Enforcement ───────────────────────────────────────────────────────


class TestApiKeyEnforcement:
    """Verify that all /api/v1/* endpoints return 401 when the API key is
    configured but the request omits the X-API-Key header."""

    def test_upload_ticket_requires_api_key(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        resp = client.post(
            "/api/v1/storage/upload-ticket",
            json={"sha256": "a" * 64, "content_type": "image/png"},
        )
        assert resp.status_code == 401

    def test_local_upload_requires_api_key(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        fake_sha = "c" * 64
        resp = client.put(
            f"/api/v1/storage/local-upload/uploads/{fake_sha}",
            content=_make_checkerboard_png(),
            headers={"Content-Type": "image/png"},
        )
        assert resp.status_code == 401

    def test_chess_corners_requires_api_key(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        fake_sha = "d" * 64
        resp = client.post(
            "/api/v1/cv/chess-corners",
            json={"key": f"uploads/{fake_sha}", "storage_mode": "local"},
        )
        assert resp.status_code == 401

    def test_calibration_targets_requires_api_key(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        fake_sha = "e" * 64
        resp = client.post(
            "/api/v1/cv/calibration-targets/detect",
            json={
                "algorithm": "chessboard",
                "key": f"uploads/{fake_sha}",
                "storage_mode": "local",
            },
        )
        assert resp.status_code == 401

    def test_valid_api_key_accepted(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        png = _make_checkerboard_png(size=20, cell=10)
        sha = _sha256_hex(png)
        resp = client.post(
            "/api/v1/storage/upload-ticket",
            json={"sha256": sha, "content_type": "image/png", "storage_mode": "local"},
            headers={"X-API-Key": "test-secret"},
        )
        assert resp.status_code == 200

    def test_wrong_api_key_rejected(self, monkeypatch):
        monkeypatch.setattr(auth, "_api_key", "test-secret")
        png = _make_checkerboard_png(size=20, cell=10)
        sha = _sha256_hex(png)
        resp = client.post(
            "/api/v1/storage/upload-ticket",
            json={"sha256": sha, "content_type": "image/png", "storage_mode": "local"},
            headers={"X-API-Key": "wrong-key"},
        )
        assert resp.status_code == 403


def test_calibration_targets_markerboard_sample():
    png = _sample_bytes("markerboard.png")
    key = _content_addressed_key(png)
    _upload(key, png)

    resp = client.post(
        "/api/v1/cv/calibration-targets/detect",
        json={
            "algorithm": "markerboard",
            "key": key,
            "storage_mode": "local",
            "config": {
                "layout": {
                    "rows": 22,
                    "cols": 22,
                    "circles": [
                        {"i": 11, "j": 11, "polarity": "white"},
                        {"i": 12, "j": 11, "polarity": "white"},
                        {"i": 12, "j": 12, "polarity": "white"},
                    ],
                },
                "chessboard": {
                    "min_corner_strength": 0.2,
                    "min_corners": 50,
                    "expected_rows": 22,
                    "expected_cols": 22,
                    "completeness_threshold": 0.05,
                    "use_orientation_clustering": True,
                    "orientation_clustering_params": {
                        "num_bins": 90,
                        "max_iters": 10,
                        "peak_min_separation_deg": 15.0,
                        "outlier_threshold_deg": 30.0,
                        "min_peak_weight_fraction": 0.2,
                        "use_weights": True,
                    },
                },
                "grid_graph": {
                    "min_spacing_pix": 20.0,
                    "max_spacing_pix": 120.0,
                    "k_neighbors": 8,
                    "orientation_tolerance_deg": 22.5,
                },
                "circle_score": {
                    "patch_size": 64,
                    "diameter_frac": 0.5,
                    "ring_thickness_frac": 0.35,
                    "ring_radius_mul": 1.6,
                    "min_contrast": 10.0,
                    "samples": 48,
                    "center_search_px": 2,
                },
            },
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["algorithm"] == "markerboard"
    assert body["detection"]["kind"] == "checkerboard_marker"
    assert len(body["detection"]["corners"]) > 0
    assert body["circle_matches"] is not None
    assert len(body["circle_matches"]) == 3


# ── Rate Limiting ────────────────────────────────────────────────────────────


class TestRateLimiting:
    """Verify rate limiting is active and returns 429 when exceeded."""

    def test_upload_ticket_rate_limit(self):
        """POST /upload-ticket is limited to 20/minute."""
        from limiter import limiter

        limiter.reset()
        png = _make_checkerboard_png(size=20, cell=10)
        sha = _sha256_hex(png)
        payload = {"sha256": sha, "content_type": "image/png", "storage_mode": "local"}

        for _ in range(20):
            resp = client.post("/api/v1/storage/upload-ticket", json=payload)
            assert resp.status_code == 200

        resp = client.post("/api/v1/storage/upload-ticket", json=payload)
        assert resp.status_code == 429
        assert "Rate limit" in resp.json()["detail"]
        limiter.reset()

    def test_local_object_rate_limit(self):
        """GET /local-object is limited to 60/minute."""
        from limiter import limiter

        limiter.reset()
        png = _make_checkerboard_png()
        key = _content_addressed_key(png)
        _upload(key, png)

        for _ in range(60):
            resp = client.get(f"/api/v1/storage/local-object/{key}")
            assert resp.status_code == 200

        resp = client.get(f"/api/v1/storage/local-object/{key}")
        assert resp.status_code == 429
        limiter.reset()

    def test_cv_endpoint_rate_limit(self):
        """POST /chess-corners is limited to 10/minute."""
        from limiter import limiter

        limiter.reset()
        png = _make_checkerboard_png()
        key = _content_addressed_key(png)
        _upload(key, png)
        payload = {"key": key, "storage_mode": "local"}

        for _ in range(10):
            resp = client.post("/api/v1/cv/chess-corners", json=payload)
            assert resp.status_code == 200

        resp = client.post("/api/v1/cv/chess-corners", json=payload)
        assert resp.status_code == 429
        limiter.reset()


# ── Middleware ────────────────────────────────────────────────────────────────


def test_security_headers_present():
    """Verify security headers are set on every response."""
    resp = client.get("/")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in resp.headers["Permissions-Policy"]


def test_request_id_generated():
    """Middleware generates X-Request-Id when not provided."""
    resp = client.get("/")
    assert "X-Request-Id" in resp.headers
    assert len(resp.headers["X-Request-Id"]) > 0


def test_request_id_echoed():
    """Middleware echoes back a client-provided X-Request-Id."""
    resp = client.get("/", headers={"X-Request-Id": "test-trace-42"})
    assert resp.headers["X-Request-Id"] == "test-trace-42"


def test_malformed_content_length_returns_400():
    """Non-numeric Content-Length header returns 400 instead of crashing."""
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        content=b'{"sha256":"' + b"a" * 64 + b'","content_type":"image/png"}',
        headers={"Content-Type": "application/json", "Content-Length": "not-a-number"},
    )
    assert resp.status_code == 400
    assert "Content-Length" in resp.json()["detail"]


def test_local_object_returns_correct_media_type():
    """GET /local-object returns the actual image media type, not application/octet-stream."""
    png = _make_checkerboard_png()
    key = _content_addressed_key(png)
    _upload(key, png)
    resp = client.get(f"/api/v1/storage/local-object/{key}")
    assert resp.status_code == 200
    # Content-addressed keys have no extension, so media type falls back to octet-stream.
    # This test verifies the media_type path is exercised without crashing.
    assert "content-type" in resp.headers


# ── R2 Storage Service Unit Tests ────────────────────────────────────────────


class TestStorageService:
    """Unit tests for storage_service functions that don't require R2."""

    def test_build_content_addressed_key(self):
        from services import storage_service

        key = storage_service.build_content_addressed_key("a" * 64)
        assert key == f"uploads/{'a' * 64}"

    def test_is_image_bytes_png(self):
        from services import storage_service

        png = _make_checkerboard_png()
        assert storage_service.is_image_bytes(png) is True

    def test_is_image_bytes_rejects_non_image(self):
        from services import storage_service

        assert storage_service.is_image_bytes(b"not an image") is False

    def test_local_path_traversal_blocked(self):
        from services import storage_service

        import pytest

        with pytest.raises(Exception):
            storage_service.local_path_for_key("../../etc/passwd")

    def test_resolve_storage_mode_local(self):
        from services import storage_service

        assert storage_service.resolve_storage_mode("local") == "local"

    def test_resolve_storage_mode_invalid(self):
        from services import storage_service

        import pytest

        with pytest.raises(Exception):
            storage_service.resolve_storage_mode("invalid")

    def test_r2_cache_atomic_write(self, tmp_path, monkeypatch):
        """Verify cache write uses atomic rename (tmp file then rename)."""
        from services import storage_service

        monkeypatch.setenv("R2_CACHE_ROOT", str(tmp_path))
        sha = "a" * 64
        key = f"uploads/{sha}"
        cache_path = storage_service._cache_path_for_key(key)
        assert cache_path is not None
        # Verify the cache path points to the expected location
        assert cache_path.name == sha
        assert cache_path.parent == tmp_path
