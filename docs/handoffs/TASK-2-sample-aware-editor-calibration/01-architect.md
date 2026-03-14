**Title:** Add sample-aware editor state and calibration client contracts
**Task ID:** TASK-2-sample-aware-editor-calibration
**Backlog ID:** EDITOR-001
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/handoffs.md`
- `src/lib/api.ts`
- `src/store/editor/useEditorStore.ts`
- `src/store/editor/featureSchema.ts`
- `src/components/editor/algorithms/types.ts`
- `src/components/editor/algorithms/calibrationTargets/shared.ts`
- `src/components/editor/algorithms/registry.ts`
- `src/components/editor/algorithms/chessCorners/adapter.ts`
- `src/components/editor/algorithms/chessCorners/ChessCornersConfigForm.tsx`
- `src/components/editor/panels/AlgorithmPanel.tsx`
- `src/components/editor/algorithms/formFields.tsx`
- `src/components/editor/algorithms/useAlgorithmRunner.ts`
- `public/board_charuco.json`
- `public/marker_detect_config.json`
- `CHANGELOG.md`

---

## Summary

EDITOR-001 adds three calibration-target algorithm plugins (Chessboard, ChArUco, Marker Board) to the editor's algorithm registry, each with a config form and adapter that calls the existing `detectCalibrationTarget` API. It also wires `sampleDefaults` in `AlgorithmPanel` so that selecting a curated sample image automatically seeds the algorithm config with the locked preset values from the backlog. The frontend contracts (`api.ts`, store types, featureSchema, `shared.ts`) are already complete; only the plugin files and panel wiring remain.

---

## Decisions

- Three separate adapter files under `calibrationTargets/` mirror the `chessCorners/` pattern.
- Config types are defined in each `*ConfigForm.tsx` file (same pattern as `ChessCornersConfigForm.tsx`).
- MarkerBoard circles are embedded in `initialConfig` from `marker_detect_config.json`; the form only exposes board-level + chessboard-level params.
- `AlgorithmPanel` applies `sampleDefaults` via a `useEffect` on `(algorithm.id, imageSampleId)` — resets to `{ ...initialConfig, ...sampleDefaults[sampleId] }` when either changes and defaults exist; leaves config unchanged when no defaults for that sample.
- `DEFAULT_ALGORITHM_ID` remains `"chess-corners"` (backward compatible).
- No backend changes required.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/algorithms/calibrationTargets/ChessboardConfigForm.tsx` | CREATE — config form for chessboard algorithm |
| `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts` | CREATE — adapter wiring `detectCalibrationTarget("chessboard")` |
| `src/components/editor/algorithms/calibrationTargets/CharucoConfigForm.tsx` | CREATE — config form for charuco algorithm |
| `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts` | CREATE — adapter wiring `detectCalibrationTarget("charuco")` |
| `src/components/editor/algorithms/calibrationTargets/MarkerBoardConfigForm.tsx` | CREATE — config form for markerboard algorithm |
| `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts` | CREATE — adapter wiring `detectCalibrationTarget("markerboard")` |
| `src/components/editor/algorithms/registry.ts` | MODIFY — register 3 new algorithms |
| `src/components/editor/panels/AlgorithmPanel.tsx` | MODIFY — wire `sampleDefaults` effect |
| `CHANGELOG.md` | MODIFY — add unreleased entry |

---

## API Contract

n/a — no new or changed endpoints; `detectCalibrationTarget` already exists in `src/lib/api.ts`.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| frontend build smoke | `bun run build` | TypeScript compiles; no type errors in new files |
| frontend lint | `bun run lint` | No ESLint violations |

No backend tests required (no backend changes).

---

## Validation

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP (no backend changes)
mypy . --ignore-missing-imports → SKIP (no backend changes)
pytest tests/ -v          → SKIP (no backend changes)
bun run lint              → must PASS
bun run build             → must PASS
```

---

## Risks / Open Questions

- [RESOLVED] MarkerBoard circle polarity not in `marker_detect_config.json` — default to `'white'` (all three fiducial circles). Backend default handles this fine; acceptance scenario verifies 3 circle matches.
- [RESOLVED] `sampleDefaults` wiring in `AlgorithmPanel` should reset config on `(algorithm.id, imageSampleId)` change when defaults exist, preserving the current config otherwise.

---

## Next Handoff

**To:** Implementer
**Action:** Create 6 new files and modify `registry.ts`, `AlgorithmPanel.tsx`, `CHANGELOG.md` per blueprint above.
