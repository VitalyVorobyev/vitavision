**Title:** Update editor and backend documentation for calibration targets
**Task ID:** TASK-9-update-editor-backend-docs
**Backlog ID:** DOCS-001
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_human

---

## Inputs Consulted

- `docs/handoffs/TASK-9-update-editor-backend-docs/01-architect.md`
- `docs/handoffs/TASK-9-update-editor-backend-docs/02-implementer.md`
- `docs/handoffs/TASK-9-update-editor-backend-docs/03-reviewer.md`

---

## Outcome Summary

`docs/backend.md` was created as a focused backend API reference covering the full `POST /api/v1/cv/calibration-targets/detect` schema for all three algorithm variants (chessboard, charuco, markerboard), error codes, frame semantics, and an editor guided-workflow summary. `README.dev.md` was extended with charuco and markerboard smoke-test curl examples and a sample-defaults quick-reference table. A mid-task correction fixed the markerboard layout defaults (rows/cols/circles) to match the actual frontend adapter and `marker_detect_config.json`. `CHANGELOG.md` received a `docs(DOCS-001)` entry. All quality gates passed.

---

## Residual Risks

- The `storage_mode: "r2"` field appears in the API schema table in `docs/backend.md`. This is a documented API parameter, not public UI copy, so it is acceptable. If the storage API ever changes field names, this doc will need updating.
- `docs/backend.md` does not document the full `chess_cfg` / `multiscale` / `grid_graph` sub-parameter schemas in exhaustive detail — it documents the top-level defaults only. A future DOCS task could expand these if contributors need them.

---

## Human Decision / Validation Needed

- Optional: manually run the three smoke-test curl examples from `README.dev.md` against a local backend to confirm the markerboard example produces the expected result (three circle matches on `markerboard.png`).
- No blocking decisions needed before merging.

---

## Follow-up Tasks

- `EDITOR-005` (P2): richer readonly overlays for markers and circle matches — could link to `docs/backend.md` circle-candidate/circle-match schema once implemented.
