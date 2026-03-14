# Task Handoff Report

**Title:** Add fully editable Chessboard, ChArUco, and Marker Board config surfaces
**Task ID:** TASK-6-editable-calib-config-surfaces
**Backlog ID:** CV-002
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md` — CV-002 task description, acceptance scenarios, locked defaults
- `CLAUDE.md` — architecture, algorithm plugin system, repo boundaries
- `docs/handoffs.md` — handoff workflow rules
- `public/board_charuco.json` — ChArUco preset: rows=22, cols=22, cell_size_mm=4.8, marker_size_rel=0.75, dictionary=DICT_4X4_1000
- `public/marker_detect_config.json` — Marker Board preset: board layout, chessboard params, graph params, circle_score params
- `src/components/editor/algorithms/calibrationTargets/ChessboardConfigForm.tsx`
- `src/components/editor/algorithms/calibrationTargets/CharucoConfigForm.tsx`
- `src/components/editor/algorithms/calibrationTargets/MarkerBoardConfigForm.tsx`
- `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts`
- `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts`
- `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts`
- `src/components/editor/algorithms/calibrationTargets/shared.ts`
- `src/components/editor/algorithms/formFields.tsx`
- `src/components/editor/algorithms/types.ts`
- `src/lib/api.ts` — frontend types and serialization helpers for all three algorithms
- `backend/routers/cv.py` — backend Pydantic models for full config surface

---

## Summary

CV-002 adds fully editable config surfaces for Chessboard, ChArUco, and Marker Board algorithm plugins. Currently:
- **Chessboard** is complete (4 fields map directly to the backend `detector` block).
- **ChArUco** exposes only 6 of ~14 tunable backend params: missing `chessboard` sub-params (expectedRows/Cols, minCornerStrength, completenessThreshold), `graph` sub-params, `scan` sub-params, `maxHamming`, and `minMarkerInliers`.
- **Marker Board** exposes 6 params but missing `graph` sub-params (minSpacingPix=40, maxSpacingPix=160, kNeighbors=8, orientationToleranceDeg=22.5) and `circleScore` sub-params (patchSize=64, diameterFrac=0.5, etc.) from `marker_detect_config.json`. These missing params are NOT wired through the adapter to the backend, which is why full tuning requires editing the preset file directly.

The task must expand ChArUco and Marker Board forms and adapters to expose the relevant additional fields, seed them from the public preset JSON files, and keep all fields editable. No backend changes are needed — the backend already accepts all parameters.

---

## Decisions

- **Chessboard**: No changes needed. The form already exposes all four fields the backlog calls out as locked defaults, and the adapter correctly maps them.
- **ChArUco expansion scope**: Expose `chessboard` sub-params (4 fields) and `graph` sub-params (4 fields) grouped in separate `<Section>` blocks. Do not expose `scan` (6 params — too advanced for first slice), `maxHamming`, or `minMarkerInliers` (not in preset, not needed for acceptance). Seed chessboard sub-params from ChArUco-specific sensible defaults (same values as preset chessboard detector for markerboard, since charuco board is same 22×22 grid).
- **Marker Board expansion scope**: Expose `graph` sub-params (4 fields) and `circleScore` sub-params (7 fields) seeded from `marker_detect_config.json`. The `circles` array editing (polarity/position) is deferred per `EDITOR-005` note in backlog; keep the 3 hardcoded circles in `initialConfig`.
- **Wire adapters**: `charucoAdapter.ts` must pass the new `chessboard` and `graph` config sub-objects through `detectCalibrationTarget`. `markerboardAdapter.ts` must pass the new `gridGraph` and `circleScore` sub-objects.
- **Type extension**: `CharucoConfig` in `CharucoConfigForm.tsx` gains 8 new optional fields; `MarkerBoardConfig` in `MarkerBoardConfigForm.tsx` gains 11 new optional fields.
- **No backend changes**: The backend already accepts all parameters.
- **No `src/lib/api.ts` changes**: The frontend API layer already has `GridGraphParams`, `CircleScoreParams`, `ChessboardDetectorParams`, and serialization helpers. Adapters just need to pass them.
- **Preset seeding**: ChArUco `sampleDefaults.charuco` and `initialConfig` must include defaults from `board_charuco.json` for board fields (already done), plus reasonable chessboard/graph defaults. Marker Board `sampleDefaults.markerboard` and `initialConfig` must include graph and circleScore values from `marker_detect_config.json`.
- **Form layout**: Each new param group becomes a `<Section>` using the existing `Section` component. Use `NumberField` and `CheckboxField` from `formFields.tsx`.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/algorithms/calibrationTargets/CharucoConfigForm.tsx` | Add `ChessboardSubConfig` (4 fields) and `GraphSubConfig` (4 fields) sub-sections to `CharucoConfig`; extend form UI |
| `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts` | Pass new chessboard and graph config fields through `detectCalibrationTarget` call; update `initialConfig` and `sampleDefaults` |
| `src/components/editor/algorithms/calibrationTargets/MarkerBoardConfigForm.tsx` | Add `GraphSubConfig` (4 fields) and `CircleScoreSubConfig` (7 fields) sub-sections to `MarkerBoardConfig`; extend form UI |
| `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts` | Pass new gridGraph and circleScore config fields through `detectCalibrationTarget` call; update `initialConfig` and `sampleDefaults` |
| `CHANGELOG.md` | Add entry for CV-002 |

---

## API Contract

n/a — no new or changed backend endpoints. All params already accepted by `POST /api/v1/cv/calibration-targets/detect`.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| No new backend tests needed | — | Backend endpoint unchanged |
| Frontend: `bun run build` | — | Type-checks all new config fields in form + adapter |

The config surfaces are pure UI — no new pure functions requiring unit tests. Acceptance is confirmed by:
1. `bun run build` passes (type safety).
2. `bun run lint` passes.
3. Manual: MarkerBoard with seeded graph+circleScore defaults returns 3 circle matches on `markerboard.png`.
4. Manual: ChArUco with seeded chessboard+graph defaults returns non-empty corners on `charuco.png`.

---

## Validation

All quality gates are frontend-only for this task (no backend changes):

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP
mypy . --ignore-missing-imports → SKIP
pytest tests/ -v          → SKIP
bun run lint              → REQUIRED
bun run build             → REQUIRED
```

---

## Risks / Open Questions

- [RESOLVED] Do the missing `graph` and `circleScore` params affect acceptance? Yes — `marker_detect_config.json` specifies `graph.min_spacing_pix=40`, `max_spacing_pix=160`, `k_neighbors=8`, `orientation_tolerance_deg=22.5` and `circle_score.patch_size=64`, etc. Without these, the adapter uses backend defaults which may differ, risking the "exactly 3 circle matches" acceptance scenario.
- [RESOLVED] `circles` editing (polarity/position) is deferred to `EDITOR-005` per backlog note.
- [RESOLVED] `scan`, `maxHamming`, `minMarkerInliers` for ChArUco are not in any preset and are advanced; defer per spec note "keep out of first slice unless insufficient."

---

## Next Handoff

**To:** Implementer
**Action:** Implement exactly the four file changes listed above. Extend both config interfaces and forms with new sections; update both adapters to pass through the new fields. Run `bun run lint && bun run build` to confirm. No backend changes needed.
