**Title:** Add API key enforcement tests and Python quality gates in CI
**Task ID:** TASK-7-api-key-tests-ci-gates
**Backlog ID:** TEST-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_human

---

## Inputs Consulted

- `docs/handoffs/TASK-7-api-key-tests-ci-gates/01-architect.md`
- `docs/handoffs/TASK-7-api-key-tests-ci-gates/02-implementer.md`
- `docs/handoffs/TASK-7-api-key-tests-ci-gates/03-reviewer.md`

---

## Outcome Summary

TEST-001 is complete. The `lint-backend` CI job (ruff check, ruff format, mypy) now runs on
every PR and main push in parallel with `test-backend`. Six auth enforcement tests cover all
protected endpoints. Pre-existing ruff and mypy violations were resolved cleanly: one unused
import in `auth.py`, one in `test_chess.py`, four intentional E402 suppressions in `main.py`,
a mypy type narrowing cast in `storage_service.py`, and a starlette stub `type: ignore` in
`main.py`. All 24 tests pass; all three Python quality gates pass.

---

## Residual Risks

- **Test isolation (minor)**: Two existing tests fail on re-run without cleaning
  `LOCAL_STORAGE_ROOT`. This is harmless for CI but confusing locally. Track under QA-001.

---

## Human Decision / Validation Needed

1. **Push and confirm CI is green** — the `lint-backend` job has not yet run in GitHub Actions.
   Merge this branch to confirm all three gates (ruff, mypy, pytest) pass on the CI runner.

---

## Follow-up Tasks

- QA-001: When fixing test isolation, use `pytest` `tmp_path` or a session-scoped fixture to
  give each test run a fresh `LOCAL_STORAGE_ROOT`.
