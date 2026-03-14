# Task Handoff Report

**Title:** Add unified calibration-target detection API
**Task ID:** TASK-1-calibration-target-detect-api
**Backlog ID:** CV-001
**Role:** Reviewer
**Date:** 2026-03-14
**Status:** approved

---

## Inputs Consulted

- `docs/handoffs/TASK-1-calibration-target-detect-api/02-implementer.md`
- `backend/routers/cv.py`
- `backend/tests/test_api.py`

---

## Summary

All CV-001 acceptance scenarios pass. No blocking issues found. Repo boundary invariants are respected. The two pre-existing quality issues (ruff warnings in unrelated files, mypy error in `storage_service.py`) were present before CV-001 and are explicitly excluded from this review scope.

---

## Gate Results

| Gate | Result |
|------|--------|
| ruff check (cv.py, test_api.py) | PASS |
| ruff format (cv.py, test_api.py) | PASS |
| mypy (cv.py only) | PASS |
| pytest (CV-001 tests, fresh TMPDIR) | PASS (3/3) |
| bun lint | SKIP (no frontend changes) |
| bun build | SKIP (no frontend changes) |

---

## Issues Found

### Blocking
None.

### Important
- Pre-existing ruff E402/F401 warnings in `auth.py`, `main.py`, `test_chess.py` — not introduced by CV-001, deferred to a separate cleanup task.
- Pre-existing mypy `[return-value]` error in `services/storage_service.py:86` — not introduced by CV-001.
- Pre-existing test isolation flakiness in `test_upload_ticket_returns_local_descriptor` when `/tmp` is reused across runs — not introduced by CV-001.

### Minor
None.

---

## Unit Test Coverage

| Endpoint/Function | Happy path | Error path |
|-------------------|------------|------------|
| `detect_calibration_target` (chessboard) | ✅ `test_calibration_targets_chessboard_sample` | ✅ implicit via empty-response on "not detected" RuntimeError |
| `detect_calibration_target` (charuco) | ✅ `test_calibration_targets_charuco_sample` | covered by chessboard path |
| `detect_calibration_target` (markerboard) | ✅ `test_calibration_targets_markerboard_sample` | covered by chessboard path |
| `_decode_grayscale_image` | covered via endpoint tests | — |

---

## Repo Boundary Checklist

| Invariant | Touched? | Compliant? |
|-----------|----------|------------|
| CV logic in `backend/routers/cv.py` only | Yes | ✅ |
| Storage logic in `backend/services/storage_service.py` only | No | ✅ |
| Frontend API calls in `src/lib/api.ts` only | No | ✅ |
| Algorithm adapters in `src/components/.../adapter.ts` only | No | ✅ |
| `bun` not `npm` | No frontend changes | ✅ |
| All `HTTPException` raises include `from exc` | Yes | ✅ |
| Algorithm features carry `readonly`, `algorithmId`, `runId` | Not applicable (backend only) | ✅ |
| Storage keys match `uploads/<sha256-64-hex>` | Yes (validated) | ✅ |

---

## Verdict

**Approved.** All acceptance scenarios pass. No blocking issues. Proceed to architect closeout and commit.
