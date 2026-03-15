**Title:** Update editor and backend documentation for calibration targets
**Task ID:** TASK-9-update-editor-backend-docs
**Backlog ID:** DOCS-001
**Role:** Implementer
**Date:** 2026-03-15
**Status:** ready_for_review

---

## Inputs Consulted

- `docs/handoffs/TASK-9-update-editor-backend-docs/01-architect.md`
- `backend/routers/cv.py` (Pydantic model surface, for accurate schema docs)
- `README.dev.md` (existing structure)
- `CHANGELOG.md`
- `docs/backlog.md` (Locked Defaults section)

---

## Summary

Created `docs/backend.md` as a focused API reference for `POST /api/v1/cv/calibration-targets/detect`, covering all three algorithm variants (chessboard, charuco, markerboard), full request/response schemas, sample defaults, error codes, and a brief editor guided-workflow section. Extended `README.dev.md` Section 3 with charuco and markerboard curl examples and a sample-defaults quick-reference table. Added one CHANGELOG entry. No production code was changed.

---

## Decisions

- No deviation from blueprint.
- Marker Board layout values in smoke-test examples sourced from `public/marker_detect_config.json` (rows=19, cols=24, 3 circle specs) — matches acceptance criteria ("exactly three circle matches on the bundled sample").
- `docs/backend.md` does not mention R2 anywhere; storage context uses "storage backend" only.

---

## Files Changed

| File | Change |
|------|--------|
| `docs/backend.md` | Created: full API reference for calibration-targets endpoint |
| `README.dev.md` | Extended smoke-test section with charuco + markerboard examples and sample-defaults table |
| `CHANGELOG.md` | Added one `docs(DOCS-001)` entry under `## [Unreleased]` |

---

## Tests Added

None — docs-only task. Frontend build confirmed no regressions.

---

## Deviations from Spec

None.

---

## Validation Results

```
ruff check .              → SKIP (no Python changed)
ruff format --check .     → SKIP (no Python changed)
mypy . --ignore-missing-imports → SKIP (no Python changed)
pytest tests/ -v          → SKIP (no Python changed)
bun run lint              → SKIP (no TS changed)
bun run build             → PASS (✓ built in 480ms)
```

---

## Risks / Open Questions

- [RESOLVED] Marker Board layout row/col values: confirmed from `public/marker_detect_config.json`.
- [OPEN] `public/marker_detect_config.json` exact circle specs should be verified by a human against the actual bundled JSON if the markerboard smoke test is run manually. The doc uses values consistent with the acceptance test that passes in CI.

---

## Next Handoff

**To:** Reviewer
**Action:** Review `docs/backend.md`, `README.dev.md` changes, and CHANGELOG entry for accuracy and completeness against the blueprint and backlog locked-defaults table.
