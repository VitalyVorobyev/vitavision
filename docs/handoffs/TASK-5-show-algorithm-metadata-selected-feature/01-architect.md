**Title:** Show algorithm metadata in selected feature details
**Task ID:** TASK-5-show-algorithm-metadata-selected-feature
**Backlog ID:** EDITOR-004
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md` — EDITOR-004 task description and acceptance scenarios
- `CLAUDE.md` — architecture overview, repo boundary rules
- `docs/handoffs.md` — handoff workflow
- `src/store/editor/useEditorStore.ts` — Feature and FeatureMeta types
- `src/components/editor/panels/FeatureListPanel.tsx` — current selected-feature detail card
- `src/components/editor/panels/EditorRightPanel.tsx` — right panel structure
- `src/components/editor/algorithms/calibrationTargets/shared.ts` — how meta is populated
- `src/components/editor/algorithms/chessCorners/adapter.ts` — ChESS meta
- `src/components/editor/algorithms/types.ts` — AlgorithmDefinition type

---

## Summary

EDITOR-004 surfaces algorithm-generated metadata (grid coords, ids, score, target position, marker/circle metadata) in the selected-feature detail card inside `FeatureListPanel`. Currently when a user clicks a feature, the selected card shows only `type`, `x/y/score` (for directed_point), and a lock/delete button — no algorithm-specific metadata from `feature.meta` is displayed. This task adds a read-only metadata section to the detail card for algorithm features, without touching any manual editing tools. No backend changes are needed.

---

## Decisions

- **Frontend-only change**: the `FeatureMeta` type already captures all relevant fields; this is purely a display concern.
- **Single file change**: all display logic goes in `src/components/editor/panels/FeatureListPanel.tsx`, keeping the component under 300 lines.
- **Only show meta for algorithm features**: manual features never have `meta` populated, so the section is conditionally rendered when `feature.source === 'algorithm' && feature.meta` is truthy.
- **Flat key-value grid layout**: consistent with the existing `grid grid-cols-2` pattern already in the file.
- **Field labeling strategy**: use human-readable labels mapping from known FeatureMeta keys; skip `undefined`/`null` values.
- **No type changes**: `FeatureMeta` already has all required fields; `useEditorStore.ts` is not touched.
- **No new components**: the metadata rows are rendered inline inside `FeatureListPanel` using a helper function `renderMetaRows` (≤ 40 lines) to keep JSX clean.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/panels/FeatureListPanel.tsx` | Add metadata display section to the selected-feature detail card for algorithm features |
| `CHANGELOG.md` | Add one-line entry for EDITOR-004 |

---

## API Contract

n/a — no backend or API changes.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| (no new backend tests required) | n/a | Frontend-only change; no new pure functions requiring isolated unit tests |
| bun build smoke | — | TypeScript compile and Vite build pass with no errors |
| bun lint smoke | — | ESLint passes with no new warnings |

No jest/vitest tests exist in the project; acceptance is by visual inspection + build gate.

---

## Validation

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP
mypy . --ignore-missing-imports → SKIP
pytest tests/ -v          → SKIP
bun run lint              → must PASS
bun run build             → must PASS
```

---

## Risks / Open Questions

- [RESOLVED] `FeatureMeta` already covers all fields mentioned in the backlog (grid coords, ids, score, target position, marker/circle metadata). No schema additions needed.
- [RESOLVED] The file is currently 144 lines; adding the metadata section will keep it well under 300 lines.

---

## Next Handoff

**To:** Implementer
**Action:** Implement the metadata display section in `FeatureListPanel.tsx` per the blueprint. Run `bun run lint && bun run build`. Write `02-implementer.md`.

## Implementation Steps

### Phase 1 — Add metadata display to FeatureListPanel

File: `src/components/editor/panels/FeatureListPanel.tsx`

1. Add a helper function `renderMetaField(label: string, value: string | number | boolean | null | undefined): React.ReactNode | null` that returns `null` when value is `null` or `undefined`, otherwise a two-col row `<span class="text-muted-foreground">{label}</span> <span class="font-medium">{formattedValue}</span>`.

2. Add a function `renderMetaRows(meta: FeatureMeta): React.ReactNode[]` (≤ 40 lines) that maps each defined field in priority order:
   - `kind` → "Kind"
   - `score` → "Score" (toFixed(4))
   - `grid` → "Grid" (format: `i={i}, j={j}`)
   - `gridCell` → "Grid cell" (format: `gx={gx}, gy={gy}`)
   - `cornerId` → "Corner ID"
   - `markerId` → "Marker ID"
   - `targetPosition` → "Target pos" (format: `x={x.toFixed(2)}, y={y.toFixed(2)}`)
   - `rotation` → "Rotation" (degrees, toFixed(1))
   - `hamming` → "Hamming"
   - `borderScore` → "Border score" (toFixed(4))
   - `code` → "Code"
   - `inverted` → "Inverted" (boolean → "yes"/"no")
   - `polarity` → "Polarity"
   - `contrast` → "Contrast" (toFixed(3))
   - `distanceCells` → "Distance (cells)"
   - `offsetCells` → "Offset (cells)" (format: `di={di}, dj={dj}`)
   Skips fields where value is `undefined` or `null`.

3. Inside the selected-feature detail card (after the existing coordinate/score rows), add a conditional block:
   ```
   {feature.source === 'algorithm' && feature.meta && (
       <div className="pt-1 space-y-0.5">
           <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">Metadata</span>
           <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
               {renderMetaRows(feature.meta)}
           </div>
       </div>
   )}
   ```

4. Import `FeatureMeta` type at the top of the file from `useEditorStore`.

### Phase 2 — CHANGELOG

Add one line under `## [Unreleased]`:
```
- feat(EDITOR-004): surface algorithm metadata (grid coords, ids, score, target position, marker/circle fields) in selected-feature detail card
```
