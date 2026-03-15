# Task Handoff Report

<!--
Required metadata — fill in every field, no blanks.
Status values:
  Architect:    ready_for_implementer | blocked | needs_human_decision
  Implementer:  ready_for_review | blocked | needs_architect_clarification
  Reviewer:     approved | approved_with_minor_followups | changes_requested
  Architect:    ready_for_human
-->

**Title:** <!-- task title from backlog -->
**Task ID:** <!-- TASK-NNN-slug -->
**Backlog ID:** <!-- CV-001 / EDITOR-001 / etc., or n/a -->
**Role:** <!-- Architect | Implementer | Reviewer -->
**Date:** <!-- YYYY-MM-DD -->
**Status:** <!-- see values above -->

---

## Inputs Consulted

<!-- List every file or document read before producing this report. -->
- `docs/backlog.md`
- `CLAUDE.md`
- ...

---

## Summary

<!-- 2–4 sentences: what this task is, why it matters, what was done (or planned). -->

---

## Decisions

<!-- Non-obvious design choices and rationale. One bullet per decision. -->
- ...

---

## Files / Modules Affected

<!-- Exact file paths, one-line description of the change. -->
| File | Change |
|------|--------|
| `backend/routers/cv.py` | ... |

---

## API Contract

<!-- Only for tasks that add or change an endpoint. Otherwise write "n/a". -->

**Endpoint:** `METHOD /path`
**Request:**
```json
{}
```
**Response:**
```json
{}
```
**Error cases:**
- `400` — ...
- `422` — validation error (automatic)

---

## Test Plan / Tests Added

<!-- Architect: list planned tests. Implementer: list tests actually written. -->
| Test name | File | What it checks |
|-----------|------|----------------|
| `test_...` | `backend/tests/test_api.py` | ... |

---

## Validation

<!-- Implementer / Reviewer: record every quality gate command and its outcome. -->

```
ruff check .              → PASS / FAIL
ruff format --check .     → PASS / FAIL
mypy . --ignore-missing-imports → PASS / FAIL
pytest tests/ -v          → PASS / FAIL  (N passed, N failed)
bun run lint              → PASS / FAIL / SKIP
bun run build             → PASS / FAIL / SKIP
```

---

## Risks / Open Questions

<!-- Anything uncertain, deferred, or requiring follow-up. Mark each as [OPEN] or [RESOLVED]. -->
- [OPEN] ...

---

## Next Handoff

<!-- Who acts next and what they must do. -->
**To:** Implementer / Reviewer / Architect / Human
**Action:** ...
