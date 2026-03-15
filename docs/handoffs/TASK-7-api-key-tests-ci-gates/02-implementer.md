**Title:** Add API key enforcement tests and Python quality gates in CI
**Task ID:** TASK-7-api-key-tests-ci-gates
**Backlog ID:** TEST-001
**Role:** Implementer
**Date:** 2026-03-15
**Status:** ready_for_review

---

## Inputs Consulted

- `docs/handoffs/TASK-7-api-key-tests-ci-gates/01-architect.md`
- `backend/auth.py`
- `backend/main.py`
- `backend/test_chess.py`
- `backend/services/storage_service.py`
- `backend/routers/storage.py`
- `backend/services/__init__.py`
- `backend/tests/test_api.py`
- `.github/workflows/ci.yml`
- `CHANGELOG.md`

---

## Summary

All six auth enforcement tests and the `lint-backend` CI job were already in place from the
prior session. This phase fixed six pre-existing quality gate violations so the CI job passes
green: unused imports in `auth.py` and `test_chess.py`, intentional E402 suppression in
`main.py`, a mypy type narrowing gap in `storage_service.py`, a mypy starlette stub
incompatibility in `main.py`, and ruff formatting drift in four files.

---

## Decisions

- Used `# noqa: E402` on the four late imports in `main.py` (after `load_dotenv()`) rather than
  restructuring, preserving the intentional import-order guarantee.
- Used `cast(StorageMode, requested_mode)` in `storage_service.py` at the point already guarded
  by `in {"r2", "local"}` — no logic change, purely a type annotation fix.
- Used `# type: ignore[arg-type]` on `add_exception_handler` — known starlette stub false
  positive; runtime behaviour is correct.
- The two tests that fail on repeated local runs (`test_upload_ticket_returns_local_descriptor`
  and `test_local_upload_ticket_includes_api_key_header_when_auth_enabled`) are a pre-existing
  test isolation issue: content-addressed storage means the same synthetic image hash persists
  across runs. CI always uses a fresh directory, so this does not affect CI. Not fixed here as
  it is out of scope.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/auth.py` | Remove unused `Depends` import |
| `backend/main.py` | Add `# noqa: E402` to 4 late imports; `# type: ignore[arg-type]` on exception handler; ruff format |
| `backend/test_chess.py` | Remove unused `cv2` import |
| `backend/services/storage_service.py` | Add `cast` to `typing` import; use `cast(StorageMode, requested_mode)` at line 88; ruff format |
| `backend/routers/storage.py` | ruff format only |
| `backend/services/__init__.py` | ruff format only |
| `CHANGELOG.md` | Add `test(TEST-001)` entry under `## [Unreleased]` |

Previously added (prior session, not changed here):

| File | Change |
|------|--------|
| `backend/tests/test_api.py` | `TestApiKeyEnforcement` class with 6 tests |
| `.github/workflows/ci.yml` | `lint-backend` job (ruff check, ruff format, mypy) |

---

## Tests Added

All tests were added in the prior session. No new tests in this phase.

| Test name | What it checks |
|-----------|----------------|
| `TestApiKeyEnforcement::test_upload_ticket_requires_api_key` | 401 when key configured, header absent |
| `TestApiKeyEnforcement::test_local_upload_requires_api_key` | 401 on PUT without key |
| `TestApiKeyEnforcement::test_chess_corners_requires_api_key` | 401 on POST without key |
| `TestApiKeyEnforcement::test_calibration_targets_requires_api_key` | 401 on POST without key |
| `TestApiKeyEnforcement::test_valid_api_key_accepted` | 200 with correct key |
| `TestApiKeyEnforcement::test_wrong_api_key_rejected` | 403 with wrong key |

---

## Deviations from Spec

None. All fixes match the blueprint.

---

## Validation Results

```
ruff check .                     → PASS
ruff format --check .            → PASS
mypy . --ignore-missing-imports  → PASS  (0 errors, 11 files)
pytest tests/ -v (clean state)   → PASS  (24 passed)
bun run lint                     → SKIP  (no frontend changes)
bun run build                    → SKIP  (no frontend changes)
```

---

## Risks / Open Questions

- [OPEN] Pre-existing test isolation: running pytest twice locally without cleaning
  `LOCAL_STORAGE_ROOT` causes 2 test failures (ticket returns `exists: true` for previously
  uploaded synthetic images). Does not affect CI. Should be tracked as a separate QA-001
  sub-item using `pytest` `tmp_path` fixtures.

---

## Next Handoff

**To:** Reviewer
**Action:** Run all quality gates, check invariants, verify auth tests, issue verdict.
