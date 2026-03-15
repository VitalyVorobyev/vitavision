**Title:** Add API key enforcement tests and Python quality gates in CI
**Task ID:** TASK-7-api-key-tests-ci-gates
**Backlog ID:** TEST-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `.claude/CLAUDE.md`
- `docs/handoffs.md`
- `backend/tests/test_api.py`
- `backend/auth.py`
- `backend/main.py`
- `backend/test_chess.py`
- `backend/services/storage_service.py`
- `.github/workflows/ci.yml`

---

## Summary

TEST-001 adds API key enforcement tests and a `lint-backend` CI job (ruff + mypy). Both were
partially implemented in the previous session: `TestApiKeyEnforcement` (6 tests) is complete and
all 24 tests pass; the `lint-backend` job is present in CI. However, the job will fail on push
because of pre-existing lint/format/type violations in the codebase. This task fixes those
violations so the new CI gate is green end-to-end.

---

## Decisions

- **`main.py` E402**: The late imports after `load_dotenv()` / `_configure_logging()` are
  intentional (dotenv must load before modules that read env at import time). Suppress with
  `# noqa: E402` rather than restructuring, to preserve the intent.
- **`main.py:117` mypy**: `add_exception_handler` with an async handler triggers a known
  starlette stub incompatibility. Suppress with `# type: ignore[arg-type]` — the runtime
  behaviour is correct.
- **`storage_service.py:86`**: The `in {"r2", "local"}` guard is logically correct but mypy
  can't narrow `str | None` to `Literal["r2","local"]`. Fix with `cast(StorageMode, requested_mode)`.
- **`ruff format`**: Run `ruff format` on the 4 flagged files; no logic changes.
- **`auth.py`**: Remove the unused `Depends` import.
- **`test_chess.py`**: Remove the unused `cv2` import.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `backend/auth.py` | Remove unused `Depends` import |
| `backend/main.py` | Add `# noqa: E402` to 4 late imports; `# type: ignore[arg-type]` on line 117; apply ruff format |
| `backend/test_chess.py` | Remove unused `cv2` import |
| `backend/services/storage_service.py` | `cast(StorageMode, requested_mode)` at line 86; apply ruff format |
| `backend/routers/storage.py` | Apply ruff format only |
| `backend/services/__init__.py` | Apply ruff format only |
| `CHANGELOG.md` | Add entry under `## [Unreleased]` |

---

## API Contract

n/a — no endpoint changes.

---

## Test Plan / Tests Added

All tests already exist. No new tests needed.

| Test name | File | What it checks |
|-----------|------|----------------|
| `TestApiKeyEnforcement::test_upload_ticket_requires_api_key` | `backend/tests/test_api.py` | 401 when key configured but header absent |
| `TestApiKeyEnforcement::test_local_upload_requires_api_key` | `backend/tests/test_api.py` | 401 on PUT without key |
| `TestApiKeyEnforcement::test_chess_corners_requires_api_key` | `backend/tests/test_api.py` | 401 on POST without key |
| `TestApiKeyEnforcement::test_calibration_targets_requires_api_key` | `backend/tests/test_api.py` | 401 on POST without key |
| `TestApiKeyEnforcement::test_valid_api_key_accepted` | `backend/tests/test_api.py` | 200 with correct key |
| `TestApiKeyEnforcement::test_wrong_api_key_rejected` | `backend/tests/test_api.py` | 403 with wrong key |

---

## Validation

All quality gates must pass after implementation:

```
ruff check .              → PASS
ruff format --check .     → PASS
mypy . --ignore-missing-imports → PASS
pytest tests/ -v          → PASS (24 passed)
bun run lint              → SKIP (no frontend changes)
bun run build             → SKIP (no frontend changes)
```

---

## Invariants Checklist

- CV logic only in `backend/routers/cv.py` — not touched
- Storage logic only in `backend/services/storage_service.py` — type cast only, no logic change
- Frontend API calls only in `src/lib/api.ts` — not touched
- Algorithm adapters — not touched
- `bun` not `npm` — not touched
- `HTTPException` raises include `from exc` — not changing any raises
- Algorithm features carry `readonly: true` etc. — not touched
- Storage keys match pattern — not touched

---

## Risks / Open Questions

- [RESOLVED] E402 in main.py is intentional; noqa is the correct fix.
- [RESOLVED] mypy starlette stub issue is a known false positive; type: ignore is correct.

---

## Next Handoff

**To:** Implementer
**Action:** Fix the 6 ruff/mypy violations listed above, run all gates, write `02-implementer.md`.
