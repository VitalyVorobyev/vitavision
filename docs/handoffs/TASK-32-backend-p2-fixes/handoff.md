# TASK-32: Backend P2 fixes (BE-005 through BE-014)
Backlog: BE-005 through BE-014 | Date: 2026-03-21

## Plan
Fix all 10 P2 backend issues from the pre-release review:
- BE-005: Remove dummy /calibrate endpoint
- BE-006: Use actual media type for local-object GET
- BE-007: Split cv.py into routers/cv/ package
- BE-008: Atomic R2 cache writes
- BE-009: Timeout protection for CV calls
- BE-010: run_in_executor for blocking CV calls
- BE-011: Request ID propagation via contextvars
- BE-012: Middleware tests (partially done in BE-004, completed here)
- BE-013: Storage service unit tests
- BE-014: Moot (endpoint removed in BE-005)

## Implementation
- **Files changed:**
  - `backend/main.py` — added contextvars for request ID, simplified access log
  - `backend/routers/cv.py` — deleted (replaced by package)
  - `backend/routers/cv/__init__.py` — new, combines sub-routers
  - `backend/routers/cv/models.py` — all Pydantic models
  - `backend/routers/cv/_shared.py` — shared helpers (decode, finite_float)
  - `backend/routers/cv/corners.py` — chess corners endpoint
  - `backend/routers/cv/calibration_targets.py` — calibration targets endpoint
  - `backend/routers/storage.py` — use local_media_type_for_key()
  - `backend/services/storage_service.py` — atomic cache write
  - `backend/tests/test_api.py` — 8 new tests
  - `CHANGELOG.md` — 9 new entries

- **Deviations:**
  - BE-014 skipped (endpoint removed in BE-005)
  - BE-012 merged with BE-013 since middleware tests were partially done in BE-004

- **Gate results:**

  | Gate | Result |
  |------|--------|
  | ruff check | Pass |
  | ruff format | Pass (after auto-format) |
  | mypy | Pass (after fixing type annotation) |
  | pytest (39 tests) | Pass |
  | bun run build | Pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:**
  - mypy error: `ChessCornersRequest.config.__class__` type annotation → replaced with `ChessDetectorConfigOverrides`
  - ruff format: calibration_targets.py import ordering
- **Residual risks:** None
