**Title:** Update editor and backend documentation for calibration targets
**Task ID:** TASK-9-update-editor-backend-docs
**Backlog ID:** DOCS-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/handoffs.md`
- `docs/templates/task-handoff-report.md`
- `README.dev.md`
- `README.md`
- `CHANGELOG.md`
- `backend/routers/cv.py` (full Pydantic model surface)
- `git show HEAD:docs/backend.md` (deleted planning doc)

---

## Summary

`docs/backend.md` was deleted; it contained a temporary expansion plan, not a reference document. `README.dev.md` already covers the high-level architecture and one chessboard smoke-test example but lacks full request/response schemas, charuco/markerboard curl examples, and a locked-defaults table. This task creates a proper `docs/backend.md` API reference, expands `README.dev.md` with sample defaults and additional smoke-test examples, and adds a CHANGELOG entry. No production code is changed.

---

## Decisions

- Create `docs/backend.md` as a focused calibration-targets API reference (not a general backend guide — that role belongs to `README.dev.md`).
- Do not mention `R2` or storage vendors in user-facing sections of the new doc; use "object storage" or "storage backend" where necessary.
- Sample defaults come directly from `docs/backlog.md` ("Locked Defaults" section) — no invention.
- `README.dev.md` Section 3 (smoke tests) is extended with charuco and markerboard examples; structure and style stay consistent with the existing chessboard example.
- No changes to `README.md` (still just a 3-line project pointer).

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `docs/backend.md` | Create: backend API reference for `POST /api/v1/cv/calibration-targets/detect` |
| `README.dev.md` | Extend Section 3 smoke tests with charuco + markerboard examples; add locked-defaults table |
| `CHANGELOG.md` | Append one entry under `## [Unreleased]` |

---

## API Contract

n/a — no endpoint changes.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| n/a — docs only | — | No new tests; quality gate is `bun run build` to confirm no TS breakage |

---

## Validation

```
ruff check .              → SKIP (no Python changed)
ruff format --check .     → SKIP (no Python changed)
mypy . --ignore-missing-imports → SKIP (no Python changed)
pytest tests/ -v          → SKIP (no Python changed)
bun run lint              → PASS (docs only, lint is for TS/TSX)
bun run build             → PASS (docs only, confirms no TS breakage)
```

---

## Risks / Open Questions

- [RESOLVED] All locked defaults sourced from `docs/backlog.md` — no guessing needed.
- [RESOLVED] R2 storage-vendor neutrality: `README.dev.md` Section 1 already correctly mentions R2 only in a dev-setup context (acceptable); new docs avoid it entirely.

---

## Next Handoff

**To:** Implementer
**Action:** Create `docs/backend.md`, extend `README.dev.md` Section 3, append CHANGELOG entry. Run `bun run build` to confirm no breakage.
