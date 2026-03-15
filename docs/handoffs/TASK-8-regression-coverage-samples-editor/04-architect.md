**Title:** Add regression coverage for bundled samples and editor workflow
**Task ID:** TASK-8-regression-coverage-samples-editor
**Backlog ID:** QA-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_human

---

## Inputs Consulted

- `docs/handoffs/TASK-8-regression-coverage-samples-editor/01-architect.md`
- `docs/handoffs/TASK-8-regression-coverage-samples-editor/02-implementer.md`
- `docs/handoffs/TASK-8-regression-coverage-samples-editor/03-reviewer.md`

---

## Outcome Summary

QA-001 is complete. A 17-line `backend/tests/conftest.py` fixes the test isolation bug that
caused two tests to fail on every second local run. All 24 tests now pass deterministically
on repeated invocations without any manual cleanup. The three bundled sample tests
(chessboard, charuco, markerboard) remain fully passing. Frontend regression coverage
(build + lint) was already satisfied by the existing CI job and required no changes.

---

## Residual Risks

None.

---

## Human Decision / Validation Needed

1. **Optional: simplify CI workflow** — the `test-backend` job in `.github/workflows/ci.yml`
   still passes `STORAGE_MODE=local` and `LOCAL_STORAGE_ROOT: /tmp/vitavision-test-storage`
   as env vars. These are now redundant (conftest overrides them) but harmless. They can be
   removed for clarity in a future cleanup pass.

---

## Follow-up Tasks

None outstanding from this task.
