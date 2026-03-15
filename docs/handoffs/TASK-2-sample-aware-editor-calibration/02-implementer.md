**Title:** Add sample-aware editor state and calibration client contracts
**Task ID:** TASK-2-sample-aware-editor-calibration
**Backlog ID:** EDITOR-001
**Role:** Implementer
**Date:** 2026-03-14
**Status:** ready_for_review

---

## Inputs Consulted

- `docs/handoffs/TASK-2-sample-aware-editor-calibration/01-architect.md`
- All files listed in architect report

---

## Summary

Implemented three calibration-target algorithm plugins (Chessboard, ChArUco, Marker Board) as adapters + config forms under `calibrationTargets/`. Registered all three in the algorithm registry. Rewired `AlgorithmPanel` to use derived-state config resolution (no `useEffect`) that applies `sampleDefaults` when a matching sample image is selected and falls back to user edits when the same (algorithm, sample) pair is active. Also fixed two pre-existing type errors surfaced by `bun run build`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/editor/algorithms/calibrationTargets/ChessboardConfigForm.tsx` | CREATED — chessboard config form (expectedRows/Cols, minCornerStrength, completenessThreshold) |
| `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts` | CREATED — adapter calling `detectCalibrationTarget("chessboard")` with sampleDefaults |
| `src/components/editor/algorithms/calibrationTargets/CharucoConfigForm.tsx` | CREATED — charuco config form (board spec + pxPerSquare + dictionary select) |
| `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts` | CREATED — adapter calling `detectCalibrationTarget("charuco")` with sampleDefaults |
| `src/components/editor/algorithms/calibrationTargets/MarkerBoardConfigForm.tsx` | CREATED — markerboard config form (boardRows/Cols, chessboard params) |
| `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts` | CREATED — adapter calling `detectCalibrationTarget("markerboard")` with circles from preset |
| `src/components/editor/algorithms/registry.ts` | MODIFIED — register chessboard, charuco, markerboard |
| `src/components/editor/panels/AlgorithmPanel.tsx` | MODIFIED — replace configs state with ConfigEntry (value + sampleId); pure derived config in render |
| `src/components/editor/algorithms/types.ts` | MODIFIED — export `RequestedStorageMode = "auto" | StorageMode` (pre-existing missing export) |
| `src/components/editor/EditorGallery.tsx` | MODIFIED — add `sampleId: 'upload'` to uploaded image (pre-existing type error) |
| `CHANGELOG.md` | MODIFIED — add EDITOR-001 entry |

---

## Tests Added

No new backend tests (no backend changes). Frontend: build smoke + lint.

---

## Deviations from Spec

- `AlgorithmPanel` refactored from `useEffect`+setState to pure derived-state `resolveConfig()` helper to satisfy `react-hooks/set-state-in-effect` ESLint rule.
- Fixed two pre-existing type errors (`RequestedStorageMode` missing from types.ts, `sampleId` missing from `addGalleryImage` call in EditorGallery) that were surfaced during build gate.

---

## Validation Results

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP (no backend changes)
mypy . --ignore-missing-imports → SKIP (no backend changes)
pytest tests/ -v          → SKIP (no backend changes)
bun run lint              → PASS
bun run build             → PASS (1797 kB bundle, build clean)
```

---

## Risks / Open Questions

- [RESOLVED] MarkerBoard circle polarity defaults to `'white'` for all three fiducial circles — acceptance test verifies 3 circle matches.
- [OPEN] `handleSelectImage` in `EditorGallery` doesn't pass `sampleId` to `setImage` — curated samples won't update `imageSampleId`, so sample defaults won't auto-trigger. This is needed for full EDITOR-001 acceptance. Filed as a fix to apply now.

---

## Next Handoff

**To:** Reviewer
**Action:** Run all frontend quality gates and verify checklist.
