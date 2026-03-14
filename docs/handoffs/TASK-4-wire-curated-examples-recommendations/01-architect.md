# Task Handoff Report

**Title:** Wire curated examples and algorithm recommendations
**Task ID:** TASK-4-wire-curated-examples-recommendations
**Backlog ID:** EDITOR-003
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md` — task definition, acceptance scenarios, locked defaults
- `CLAUDE.md` — architecture overview, invariants, commands
- `docs/handoffs.md` — workflow rules
- `src/store/editor/useEditorStore.ts` — gallery images, SampleId, GalleryImage type
- `src/components/editor/EditorGallery.tsx` — gallery card rendering
- `src/components/editor/panels/EditorRightPanel.tsx` — hint card + recommendedAlgorithms button lookup
- `src/components/editor/algorithms/registry.ts` — algorithm registry, DEFAULT_ALGORITHM_ID
- `src/components/editor/algorithms/chessCorners/adapter.ts` — ChESS title = "Chess Corners"
- `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts` — title = "Chessboard"
- `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts` — title = "ChArUco"
- `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts` — title = "Marker Board"
- `src/components/editor/algorithms/calibrationTargets/shared.ts` — feature helpers
- `src/components/editor/algorithms/types.ts` — AlgorithmDefinition interface
- `CHANGELOG.md` — existing unreleased entries

---

## Summary

EDITOR-003 requires wiring curated gallery sample cards to algorithm recommendations so that opening a sample image seeds the right algorithm picker and config defaults. Almost all infrastructure from EDITOR-001 and EDITOR-002 is already in place: three gallery cards exist in `useEditorStore.ts` with `description` and `recommendedAlgorithms`, and `EditorRightPanel` already renders a hint card with clickable algorithm buttons. The sole remaining defect is a title mismatch: the gallery card for `chessboard` specifies `recommendedAlgorithms: ['Chessboard', 'ChESS Corners']` but the ChESS adapter declares `title: "Chess Corners"`. The registry lookup `ALGORITHM_REGISTRY.find((a) => a.title === name)` silently returns `undefined` for "ChESS Corners", so the button is inert. Fixing that single title string closes the acceptance gap.

---

## Decisions

- Fix is in `src/components/editor/algorithms/chessCorners/adapter.ts`: rename `title` from `"Chess Corners"` to `"ChESS Corners"`. This matches the `recommendedAlgorithms` value already locked in the store and the backlog's "four guided contexts" naming (`ChESS`).
- Do **not** change the `recommendedAlgorithms` value in the store — the store data is already correct per the locked defaults.
- Do **not** change `DEFAULT_ALGORITHM_ID` (stays as `chess-corners`) — only the display title changes.
- No backend changes required; this is purely a frontend display string fix.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/algorithms/chessCorners/adapter.ts` | Rename `title` from `"Chess Corners"` to `"ChESS Corners"` |
| `CHANGELOG.md` | Add one line under `## [Unreleased]` |

---

## API Contract

n/a — no endpoint changes.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| n/a (frontend-only) | — | Frontend build smoke test: `bun run lint && bun run build` must pass |

No new backend tests required (no backend changes). No jest tests exist in this repo; the quality gate is the TypeScript build.

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

- [RESOLVED] Title mismatch was the only gap; all other EDITOR-003 acceptance criteria were already satisfied by EDITOR-001 and EDITOR-002.
- [RESOLVED] No open questions remain — the fix is unambiguous.

---

## Next Handoff

**To:** Implementer
**Action:** Rename `title` in `src/components/editor/algorithms/chessCorners/adapter.ts` from `"Chess Corners"` to `"ChESS Corners"`, run `bun run lint && bun run build`, append CHANGELOG entry, write `02-implementer.md`.
