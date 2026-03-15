**Title:** Add API key enforcement tests and Python quality gates in CI
**Task ID:** TASK-7-api-key-tests-ci-gates
**Backlog ID:** TEST-001
**Role:** Reviewer
**Date:** 2026-03-15
**Status:** approved_with_minor_followups

---

## Inputs Consulted

- `docs/handoffs/TASK-7-api-key-tests-ci-gates/01-architect.md`
- `docs/handoffs/TASK-7-api-key-tests-ci-gates/02-implementer.md`
- All changed source files

---

## Summary

All quality gates pass. The auth enforcement tests cover all four protected endpoint groups
with both 401 (missing key) and 403 (wrong key) paths. The CI `lint-backend` job is well-
structured and runs in parallel with `test-backend`. Pre-existing lint/format/type violations
are cleanly resolved without logic changes. One minor follow-up (test isolation) is noted but
does not block merge.

---

## Gate Results

| Gate | Result |
|------|--------|
| ruff check | PASS |
| ruff format | PASS |
| mypy | PASS (0 errors, 11 files) |
| pytest | PASS (24 passed, clean state) |
| bun lint | SKIP (no frontend changes) |
| bun build | SKIP (no frontend changes) |

---

## Issues Found

### Blocking

None.

### Important

None.

### Minor

- **Test isolation**: `test_upload_ticket_returns_local_descriptor` and
  `test_local_upload_ticket_includes_api_key_header_when_auth_enabled` fail on second local run
  when `LOCAL_STORAGE_ROOT` is not cleaned between runs (content-addressed storage returns
  `exists: true` for previously seen images). Does not affect CI (fresh runner). Should be
  addressed under QA-001 using `pytest` `tmp_path` fixtures to isolate each test session.

---

## Unit Test Coverage

| Endpoint / function | Happy path | Error path |
|---------------------|-----------|-----------|
| `POST /api/v1/storage/upload-ticket` — key enforced | ✓ `test_valid_api_key_accepted` | ✓ `test_upload_ticket_requires_api_key` (401), `test_wrong_api_key_rejected` (403) |
| `PUT /api/v1/storage/local-upload/{key}` — key enforced | ✓ existing tests | ✓ `test_local_upload_requires_api_key` (401) |
| `POST /api/v1/cv/chess-corners` — key enforced | ✓ existing tests | ✓ `test_chess_corners_requires_api_key` (401) |
| `POST /api/v1/cv/calibration-targets/detect` — key enforced | ✓ existing tests | ✓ `test_calibration_targets_requires_api_key` (401) |
| `cast(StorageMode, ...)` in `storage_service.py` | already covered by upload/CV tests | n/a (type-only change) |

---

## Verdict

**approved_with_minor_followups** — merge is safe. The minor test isolation issue should be
logged under QA-001 and does not warrant blocking this task.
