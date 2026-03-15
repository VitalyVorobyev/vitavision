**Title:** Add regression coverage for bundled samples and editor workflow
**Task ID:** TASK-8-regression-coverage-samples-editor
**Backlog ID:** QA-001
**Role:** Implementer
**Date:** 2026-03-15
**Status:** ready_for_review

---

## Inputs Consulted

- `docs/handoffs/TASK-8-regression-coverage-samples-editor/01-architect.md`
- `backend/services/storage_service.py` (confirmed `local_storage_root()` is call-time)
- `backend/tests/test_api.py` (confirmed module-level `TestClient` doesn't make requests at construction)

---

## Summary

Created `backend/tests/conftest.py` with a single session-scoped autouse fixture. The fixture
calls `tmp_path_factory.mktemp("vitavision_storage")` to produce a unique temp directory per
pytest session, then sets `STORAGE_MODE=local` and `LOCAL_STORAGE_ROOT` to that path. Because
`storage_service.local_storage_root()` reads `os.getenv` at call time, every test request in
the session transparently uses the fresh directory. All 24 tests pass on two consecutive runs
without any manual cleanup.

---

## Decisions

- `scope="session"` not `scope="function"`: a function-scoped fixture would re-create the
  directory for every single test, wiping uploaded files that later tests rely on (e.g.,
  `test_chess_corners_basic` uploads then immediately runs the CV endpoint). Session scope
  gives one shared fresh dir per pytest invocation — the right granularity.
- `autouse=True`: no test should opt out of storage isolation; requiring explicit use would
  be a foot-gun.
- No changes to the CI workflow: the conftest fixture overrides `LOCAL_STORAGE_ROOT` regardless
  of what the env provides, so CI continues to work without modification.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/tests/conftest.py` | **New.** 17-line file: session-scoped autouse `isolated_storage` fixture |
| `CHANGELOG.md` | Add `test(QA-001)` entry under `## [Unreleased]` |

---

## Tests Added

No new test functions. The fixture makes two previously flaky tests deterministically pass:

| Test | Was flaky | Now |
|------|-----------|-----|
| `test_upload_ticket_returns_local_descriptor` | Fails on 2nd run | Passes on every run |
| `test_local_upload_ticket_includes_api_key_header_when_auth_enabled` | Fails on 2nd run | Passes on every run |

---

## Deviations from Spec

None. Implementation matches the blueprint exactly.

---

## Validation Results

```
ruff check .              → PASS
ruff format --check .     → PASS  (12 files already formatted)
mypy . --ignore-missing-imports → PASS  (0 errors, 12 files)
pytest tests/ -v (run 1)  → PASS  (24 passed)
pytest tests/ -v (run 2, no cleanup) → PASS  (24 passed)
bun run lint              → SKIP  (no frontend changes)
bun run build             → SKIP  (no frontend changes)
```

---

## Risks / Open Questions

None.

---

## Next Handoff

**To:** Reviewer
**Action:** Run all quality gates, verify two-run determinism, issue verdict.
