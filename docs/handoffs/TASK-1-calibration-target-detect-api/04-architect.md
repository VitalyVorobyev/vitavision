# Task Handoff Report

**Title:** Add unified calibration-target detection API
**Task ID:** TASK-1-calibration-target-detect-api
**Backlog ID:** CV-001
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_human

---

## Outcome Summary

`POST /api/v1/cv/calibration-targets/detect` is implemented, tested, and passing all three acceptance scenarios (chessboard, ChArUco, marker-board with exactly 3 circle matches). The endpoint handles all algorithms through a single discriminated-union handler with shared image-decode and storage logic. Rate limit is 10/min per IP, consistent with the chess-corners endpoint.

---

## Residual Risks

- Pre-existing ruff lint warnings (`auth.py`, `main.py`, `test_chess.py`) and a mypy error in `storage_service.py` remain open; they should be addressed in a dedicated cleanup task.
- Pre-existing test isolation flakiness in `test_upload_ticket_returns_local_descriptor` when `/tmp` storage root is reused between runs — consider using `pytest` tmp fixtures.

---

## Human Decision / Validation Needed

- Manual smoke test recommended: upload a real camera image of each calibration target type via the editor and verify the overlay is visible (this is the EDITOR-001 wiring, which is the next task).
- The `markerboard.png` acceptance test asserts exactly 3 circle matches. If the bundled sample or the `calib_targets` library changes, this assertion may break — consider making it `>= 3` if the library ever returns additional matches.

---

## Follow-up Tasks

- **EDITOR-001** — wire `detectCalibrationTarget` in the frontend API layer and connect to the editor store (already in-progress in the working tree).
- **Cleanup** — fix pre-existing ruff/mypy issues in `auth.py`, `main.py`, `test_chess.py`, `storage_service.py`.
- **QA-001** — add broader regression coverage for the editor workflow and bundled samples.
