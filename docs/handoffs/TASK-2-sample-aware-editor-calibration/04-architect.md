**Title:** Add sample-aware editor state and calibration client contracts
**Task ID:** TASK-2-sample-aware-editor-calibration
**Backlog ID:** EDITOR-001
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_human

---

## Inputs Consulted

- All TASK-2 handoff reports
- `docs/backlog.md`

---

## Summary

EDITOR-001 is complete. The three calibration-target algorithm plugins (Chessboard, ChArUco, Marker Board) are now registered and wired to the editor UI. Selecting a curated sample image auto-seeds the appropriate algorithm's config from the locked preset defaults. Running any of the three algorithms produces readonly point features with rich metadata on the canvas.

---

## Outcome Summary

All planned deliverables implemented and passing quality gates:
- 6 new files: 3 adapters + 3 config forms under `calibrationTargets/`
- `registry.ts` updated with all 3 new algorithms
- `AlgorithmPanel` uses pure derived-state config resolution with per-(algorithm, sample) user override tracking
- `EditorGallery` forwards `sampleId` to `setImage` so sample-defaults activate correctly
- Two pre-existing type errors fixed: `RequestedStorageMode` export and missing `sampleId` in `addGalleryImage`

---

## Residual Risks

- Circle polarity for Marker Board is hardcoded to `'white'` for all three fiducials — the `marker_detect_config.json` preset does not include polarity. If the board uses `'black'` circles, detection will fail. Acceptance test should verify.
- `AlgorithmPanel.tsx` is now 152 lines — still within the 300-line limit, but growing. Watch for EDITOR-002 additions.

---

## Human Decision / Validation Needed

1. **Manual smoke test**: Open the editor, select each curated sample (Chessboard, ChArUco, Marker Board), choose the matching algorithm, and click "Run Algorithm". Verify:
   - Config form auto-fills with the preset defaults
   - Features appear on canvas as readonly points
   - Feature metadata is visible in the selected-feature panel (EDITOR-004 will surface this more fully)

2. **Circle polarity**: Confirm the Marker Board sample circles are white-on-dark; if not, update `markerboardAdapter.ts` `circles` polarity values.

---

## Follow-up Tasks

- **EDITOR-002** — Replace editor tabs with guided workflow rail (next P1 task)
- **EDITOR-003** — Wire curated examples and algorithm recommendations
- **EDITOR-004** — Show algorithm metadata in selected feature details
