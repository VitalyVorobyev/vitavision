# TASK-34: Backend security hardening (BE-015 through BE-022)
Backlog: BE-015, BE-016, BE-017, BE-018, BE-019, BE-020, BE-021, BE-022 | Date: 2026-03-22

## Plan

### Summary
Harden the backend against resource-abuse attacks and improve code quality. The main risks are unbounded CV concurrency (CPU/memory exhaustion via large images processed in parallel) and exception message leakage. Also adds missing test coverage, documentation, and type safety improvements.

### Current State
- CV endpoints use the default thread pool executor (unbounded workers)
- `MAX_IMAGE_DIMENSION=16000` allows 256 MB arrays with no pixel-count cap
- No `--limit-concurrency` on uvicorn
- `calibration_targets.py:458` leaks `str(exc)` from Rust exceptions
- No ringgrid integration test
- `CV_TIMEOUT_SECONDS` not in `.env.example`
- `_run_detection` returns `Any`

### Affected Files
- `backend/routers/cv/_shared.py` — add dedicated executor, pixel count limit, lower default timeout
- `backend/routers/cv/corners.py` — use dedicated executor
- `backend/routers/cv/calibration_targets.py` — use dedicated executor, sanitize exception, fix return type
- `backend/routers/cv/ringgrid.py` — use dedicated executor
- `backend/main.py` — shutdown executor in lifespan
- `backend/Dockerfile` — add `--limit-concurrency`
- `backend/.env.example` — add `CV_TIMEOUT_SECONDS`, `CV_MAX_WORKERS`, `UVICORN_LIMIT_CONCURRENCY`
- `backend/tests/test_api.py` — add ringgrid integration test
- `backend/services/storage_service.py` — no changes needed (memory bounded by executor limit)

### Implementation Steps

1. **BE-015 + BE-016: Dedicated CV executor** (`_shared.py`)
   - Create a module-level `ThreadPoolExecutor` with `max_workers` from `CV_MAX_WORKERS` env var (default 2)
   - Export it as `cv_executor`
   - Lower `CV_TIMEOUT_SECONDS` default from 120 to 30
   - Update `corners.py`, `calibration_targets.py`, `ringgrid.py` to use `cv_executor` instead of `None`
   - Add executor shutdown in `main.py` lifespan teardown

2. **BE-017: Pixel count limit** (`_shared.py`)
   - Add `MAX_IMAGE_PIXELS` env var (default 64_000_000)
   - Check `width * height > MAX_IMAGE_PIXELS` in `decode_grayscale_image`
   - Also set `PIL.Image.MAX_IMAGE_PIXELS` at module level

3. **BE-018: Uvicorn concurrency limit** (`Dockerfile`)
   - Add `--limit-concurrency 20` to CMD (configurable via env var pattern)

4. **BE-019: Sanitize exception messages** (`calibration_targets.py`)
   - Replace `detail=f"Calibration target detection failed: {exc}"` with generic message
   - Log the actual exception at WARNING level

5. **BE-020: Ringgrid integration test** (`tests/test_api.py`)
   - Add test using a synthetic or sample image

6. **BE-021: Document CV_TIMEOUT_SECONDS** (`.env.example`)
   - Add `CV_TIMEOUT_SECONDS`, `CV_MAX_WORKERS`, `MAX_IMAGE_PIXELS`

7. **BE-022: Remove Any from calibration_targets** (`calibration_targets.py`)
   - Use a union type for the three detection result types

### Test Plan
- `test_ringgrid_detect_basic` — POST ringgrid/detect with sample image, verify 200 + markers list
- Existing tests validate CV endpoints still work with the new executor
- Existing timeout test (if any) validates lower default

### Open Questions
None.

## Implementation
- **Files changed:** `routers/cv/_shared.py`, `routers/cv/corners.py`, `routers/cv/calibration_targets.py`, `routers/cv/ringgrid.py`, `main.py`, `Dockerfile`, `.env.example`, `tests/test_api.py`, `CHANGELOG.md`
- **Deviations:** None
- **Gate results:**

| Gate | Result |
|------|--------|
| ruff check | pass |
| ruff format | pass (1 file reformatted) |
| mypy | pass (8 pre-existing ringgrid stub errors only) |
| pytest | 42/42 pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** Pre-existing mypy errors in `ringgrid.py` (PyO3 stub issue, unrelated to this task)
