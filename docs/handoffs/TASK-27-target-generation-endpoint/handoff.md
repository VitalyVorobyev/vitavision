# TASK-27: Add calibration target generation endpoint and tests
Backlog: TGEN-001, TGEN-002 | Date: 2026-03-16

## Plan
- Add `POST /api/v1/cv/calibration-targets/generate` endpoint to `backend/routers/cv.py`
- Discriminated union request: chessboard / charuco / markerboard via `target_type` field
- Paper config: A4 / Letter / custom with orientation and margin
- Returns SVG text + JSON config + optional PNG (base64 when `include_png: true`)
- 422 when board doesn't fit page
- Rate limit 30/min
- 9 tests in `backend/tests/test_generate_target.py`

## Implementation
- **Files changed:** `backend/routers/cv.py`, `backend/tests/test_generate_target.py`, `CHANGELOG.md`
- **Deviations:** A3 page size not supported by `calib_targets` library (only a4/letter/custom); removed from Literal type. Custom page with A3 dimensions used instead.
- **Gate results:**

| Gate | Result |
|------|--------|
| ruff check | pass |
| ruff format | pass |
| mypy | pass |
| pytest (33 tests) | pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** None
