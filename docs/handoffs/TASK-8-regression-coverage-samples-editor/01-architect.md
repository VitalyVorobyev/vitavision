**Title:** Add regression coverage for bundled samples and editor workflow
**Task ID:** TASK-8-regression-coverage-samples-editor
**Backlog ID:** QA-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `.claude/CLAUDE.md`
- `docs/handoffs.md`
- `backend/tests/test_api.py` (full)
- `backend/services/storage_service.py` (local_storage_root, local_path_for_key)
- `.github/workflows/ci.yml`

---

## Summary

QA-001 adds reliable regression coverage for the three bundled calibration samples
(Chessboard, ChArUco, Marker Board) and baseline editor workflow coverage. The three sample
tests already exist and pass on a clean run. The frontend build + lint already runs in CI.
The only gap is **test isolation**: two tests (`test_upload_ticket_returns_local_descriptor`
and `test_local_upload_ticket_includes_api_key_header_when_auth_enabled`) fail on every
second local run because the content-addressed storage key they depend on being `exists: false`
persists across sessions. The fix is a `conftest.py` with a session-scoped autouse fixture
that supplies each pytest session a fresh temp directory — guaranteed by
`tmp_path_factory.mktemp`, which creates a unique directory on every invocation.

---

## Current State

**Complete:**
- `test_calibration_targets_chessboard_sample` — passes ✓
- `test_calibration_targets_charuco_sample` — passes ✓
- `test_calibration_targets_markerboard_sample` — passes ✓
- Frontend: `bun run lint` + `bun run build` in CI `build-frontend` job ✓

**Broken:**
- `test_upload_ticket_returns_local_descriptor` — fails on 2nd run (checks `upload != None`,
  but ticket returns `exists: true` with `upload: null` after the first run)
- `test_local_upload_ticket_includes_api_key_header_when_auth_enabled` — fails on 2nd run
  (asserts `ticket["exists"] is False`)

**Root cause:** `local_storage_root()` in `storage_service.py` resolves `LOCAL_STORAGE_ROOT`
at call time from `os.getenv`. A fixture that sets this env var before any test request is
made will redirect all storage I/O to a fresh directory, ensuring `exists: false` for every
new session.

**Missing:**
- `backend/tests/conftest.py` — does not exist yet

---

## Affected Files

| File | Change |
|------|--------|
| `backend/tests/conftest.py` | **New.** Session-scoped autouse fixture that redirects `LOCAL_STORAGE_ROOT` to a fresh `tmp_path_factory` dir and sets `STORAGE_MODE=local` |
| `CHANGELOG.md` | Add entry under `## [Unreleased]` |

No production code changes. No frontend changes.

---

## Implementation Steps

### Phase 1 — conftest.py

Create `backend/tests/conftest.py`:

```python
import os
import pytest

@pytest.fixture(scope="session", autouse=True)
def isolated_storage(tmp_path_factory):
    """Redirect every test session to a fresh storage directory.

    Guarantees that content-addressed upload tickets always start from
    exists=False, preventing inter-session state pollution when tests
    are run repeatedly without manual cleanup.
    """
    root = tmp_path_factory.mktemp("vitavision_storage")
    os.environ["STORAGE_MODE"] = "local"
    os.environ["LOCAL_STORAGE_ROOT"] = str(root)
    yield root
```

**Why this works:** `storage_service.local_storage_root()` calls `os.getenv("LOCAL_STORAGE_ROOT")`
at request time, not at import time. Pytest runs session-scoped fixtures before any test
functions execute, so by the time `client.post(...)` is called, the env var points to the
fresh directory.

**Why it doesn't break CI:** CI sets `LOCAL_STORAGE_ROOT: /tmp/vitavision-test-storage` via
workflow `env:`, which sets the env var before Python starts. The conftest fixture then
*overwrites* it with a new `tmp_path` dir. The CI result is the same — a clean directory —
but the conftest value is used instead of the CI-specified one. CI stays green.

**Side effect:** The `STORAGE_MODE=local LOCAL_STORAGE_ROOT=...` prefix is no longer strictly
needed on the local `pytest` command line, though it still works as an override if you want
a specific directory for debugging.

### Phase 2 — CHANGELOG

Append one line to `CHANGELOG.md` under `## [Unreleased]`.

---

## API Contract

n/a — no endpoint changes.

---

## Test Plan / Tests Added

No new test functions. The fixture makes existing tests reliable:

| Test (previously flaky) | File | Fix |
|-------------------------|------|-----|
| `test_upload_ticket_returns_local_descriptor` | `test_api.py:78` | Fresh dir → `exists: false` guaranteed |
| `test_local_upload_ticket_includes_api_key_header_when_auth_enabled` | `test_api.py:177` | Fresh dir → `exists: false` guaranteed |

All 24 existing tests must pass on both the first and second consecutive run without any
manual cleanup.

---

## Validation

After implementation, run twice back-to-back without cleaning storage:

```
# Run 1
STORAGE_MODE=local LOCAL_STORAGE_ROOT=/tmp/vv-test pytest tests/ -v  → 24 passed

# Run 2 (same command, no cleanup)
STORAGE_MODE=local LOCAL_STORAGE_ROOT=/tmp/vv-test pytest tests/ -v  → 24 passed
```

Also run without any env vars to confirm conftest handles it:

```
cd backend && source .venv/bin/activate && pytest tests/ -v  → 24 passed
```

---

## Invariants Checklist

- CV logic only in `backend/routers/cv.py` — not touched
- Storage logic only in `backend/services/storage_service.py` — not touched
- Frontend API calls only in `src/lib/api.ts` — not touched
- Algorithm adapters — not touched
- `bun` not `npm` — not applicable
- `HTTPException` raises include `from exc` — not touching any raises
- Algorithm features carry `readonly: true` etc. — not touched
- Storage keys match pattern — not touched

---

## Docs to Update

- `CHANGELOG.md` — yes, one line
- `README.md` — no user-visible capability change

---

## Quality Gate Plan

Backend only (no frontend changes):
- `ruff check .` — should pass (no new production code)
- `ruff format --check .` — should pass (conftest.py is a simple new file)
- `mypy . --ignore-missing-imports` — should pass
- `pytest tests/ -v` (run twice) — must pass both times

---

## Risks / Open Questions

- [RESOLVED] The two flaky tests depend on `exists: false` from upload-ticket. The conftest
  fixture guarantees a fresh `LOCAL_STORAGE_ROOT` every pytest session, eliminating staleness.
- [RESOLVED] `local_storage_root()` reads `os.getenv` at call time, so a fixture that sets
  the env var before requests are made is sufficient — no app restart needed.

---

## Next Handoff

**To:** Implementer
**Action:** Create `backend/tests/conftest.py` with the session-scoped autouse fixture, run
quality gates, verify tests pass on two consecutive runs, write `02-implementer.md`.
