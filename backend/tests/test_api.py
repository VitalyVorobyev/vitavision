"""Backend integration tests.

Requires env vars set before the process starts:
  STORAGE_MODE=local
  LOCAL_STORAGE_ROOT=<writable temp dir>

No external services (R2, network) are needed.
"""

import io

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
                board[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell] = 255
    img = Image.fromarray(board, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _upload(key: str, content: bytes = b"") -> None:
    png = content or _make_checkerboard_png()
    resp = client.put(
        f"/api/v1/storage/local-upload/{key}",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 200


def _valid_cv_key(name: str, suffix: int = 0) -> str:
    # Matches backend pattern: "{prefix}/{uuid}-{filename}".
    return f"uploads/123e4567-e89b-12d3-a456-4266141740{suffix:02d}-{name}"


# ── Health ────────────────────────────────────────────────────────────────────

def test_root_returns_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Vitavision API is running"


# ── Storage ───────────────────────────────────────────────────────────────────

def test_upload_ticket_returns_local_descriptor():
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"filename": "test.png", "content_type": "image/png", "storage_mode": "local"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["storage_mode"] == "local"
    assert body["upload"]["method"] == "PUT"
    assert "local-upload" in body["upload"]["url"]
    assert body["key"].endswith(".png")


def test_upload_ticket_missing_filename_rejected():
    resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"content_type": "image/png"},
    )
    assert resp.status_code == 422


def test_local_upload_and_round_trip():
    key = "uploads/ci-round-trip.png"
    png = _make_checkerboard_png()

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
    resp = client.get("/api/v1/storage/local-object/uploads/does-not-exist.png")
    assert resp.status_code == 404


def test_local_upload_empty_body_rejected():
    resp = client.put(
        "/api/v1/storage/local-upload/uploads/empty.png",
        content=b"",
        headers={"Content-Type": "image/png"},
    )
    # FastAPI rejects missing/empty Body(...) at validation time (422),
    # before the endpoint's explicit `if not body` check (400).
    assert resp.status_code in (400, 422)


def test_local_upload_rejects_over_max_upload_bytes(monkeypatch):
    png = _make_checkerboard_png(size=40, cell=20)
    monkeypatch.setenv("MAX_UPLOAD_BYTES", str(len(png) - 1))

    resp = client.put(
        "/api/v1/storage/local-upload/uploads/too-large.png",
        content=png,
        headers={"Content-Type": "image/png"},
    )
    assert resp.status_code == 413


def test_local_upload_ticket_includes_api_key_header_when_auth_enabled(monkeypatch):
    monkeypatch.setattr(auth, "_api_key", "ci-secret")
    png = _make_checkerboard_png()

    ticket_resp = client.post(
        "/api/v1/storage/upload-ticket",
        json={"filename": "auth-local.png", "content_type": "image/png", "storage_mode": "local"},
        headers={"X-API-Key": "ci-secret"},
    )
    assert ticket_resp.status_code == 200

    ticket = ticket_resp.json()
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
    key = _valid_cv_key("ci-chess-basic.png", suffix=0)
    _upload(key)

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
    key = _valid_cv_key("no-such-image.png", suffix=1)
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
