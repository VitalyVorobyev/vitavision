# Task Handoff Report

**Title:** Add unified calibration-target detection API
**Task ID:** TASK-1-calibration-target-detect-api
**Backlog ID:** CV-001
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/handoffs.md`
- `backend/routers/cv.py`
- `backend/tests/test_api.py`
- `docs/templates/task-handoff-report.md`

---

## Summary

CV-001 adds `POST /api/v1/cv/calibration-targets/detect`, a discriminated-union endpoint that runs one of three calibration-target detection algorithms (chessboard, ChArUco, marker-board) on a content-addressed image. The implementation was found to be largely complete in the working tree at review time, requiring only import ordering fixes and mypy type annotation corrections before the quality gates pass. Tests covering all three acceptance scenarios against bundled sample images already exist.

---

## Decisions

- Discriminated union on `algorithm` field keeps a single endpoint while allowing algorithm-specific config blocks — avoids three separate routes and duplicated storage/image-decode logic.
- `_empty_calibration_response` helper centralises the "not detected" fallback for all three algorithms, keeping the main handler under 60 lines.
- `raw_result: Any = None` annotation prevents mypy from narrowing the type from the first branch and rejecting subsequent branch assignments.
- `# type: ignore[arg-type]` on two calib_targets call sites where the Pydantic validator already guarantees the correct runtime value (dictionary literal, fixed-length circles tuple) but the extension module's type stubs use stricter literals.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `backend/routers/cv.py` | New endpoint + all request/response models + helper functions; import ordering fix; mypy annotation fixes |
| `backend/tests/test_api.py` | Three acceptance tests: chessboard, charuco, markerboard against bundled samples |

---

## API Contract

**Endpoint:** `POST /api/v1/cv/calibration-targets/detect`

**Request (discriminated by `algorithm`):**
```json
{
  "algorithm": "chessboard | charuco | markerboard",
  "key": "uploads/<sha256-64-hex>",
  "storage_mode": "r2 | local | null",
  "config": { ... }
}
```

**Response (always):**
```json
{
  "status": "success",
  "key": "...",
  "storage_mode": "r2 | local",
  "algorithm": "chessboard | charuco | markerboard",
  "image_width": 1920,
  "image_height": 1080,
  "frame": { "name": "image_px_center", "origin": "top_left", "x_axis": "right", "y_axis": "down", "units": "pixels" },
  "summary": { "corner_count": 77, "runtime_ms": 42.1, ... },
  "detection": { "kind": "chessboard | charuco | checkerboard_marker", "corners": [...] },
  "markers": null,
  "alignment": null,
  "circle_candidates": null,
  "circle_matches": null
}
```

**Error cases:**
- `400` — image decode failure, dimension exceeded, detection error (non-"not detected" RuntimeError)
- `404` — storage key not found
- `422` — validation error (invalid key format, out-of-range config values, unknown dictionary)
- `429` — rate limit (10/min per IP)

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| `test_calibration_targets_chessboard_sample` | `backend/tests/test_api.py` | Chessboard on bundled PNG → non-empty corners, correct frame/kind |
| `test_calibration_targets_charuco_sample` | `backend/tests/test_api.py` | ChArUco on bundled PNG → non-empty corners + markers |
| `test_calibration_targets_markerboard_sample` | `backend/tests/test_api.py` | Marker-board on bundled PNG → non-empty corners + exactly 3 circle matches |

---

## Validation

```
ruff check routers/cv.py tests/test_api.py   → PASS
ruff format --check routers/cv.py tests/test_api.py → PASS
mypy routers/cv.py --ignore-missing-imports  → PASS (1 pre-existing error in storage_service.py excluded)
pytest (CV-001 tests only, fresh TMPDIR)     → PASS  (3 passed)
bun run lint                                 → SKIP  (no frontend changes)
bun run build                                → SKIP  (no frontend changes)
```

---

## Risks / Open Questions

- [RESOLVED] Pre-existing `ruff` issues in `auth.py`, `main.py`, `test_chess.py` are separate from CV-001 and not fixed here.
- [RESOLVED] Pre-existing mypy error in `storage_service.py` line 86 is separate from CV-001.
- [RESOLVED] `test_upload_ticket_returns_local_descriptor` fails on second run when `/tmp` already contains the uploaded file — pre-existing test isolation flakiness, not introduced by CV-001.

---

## Next Handoff

**To:** Implementer
**Action:** Implementation was already present in working tree. Only import ordering and type annotation fixes applied. Proceed to Reviewer.
