**Title:** Replace editor tabs with guided workflow rail
**Task ID:** TASK-3-replace-editor-tabs-workflow-rail
**Backlog ID:** EDITOR-002
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/handoffs.md`
- `src/components/editor/panels/EditorRightPanel.tsx`
- `src/components/editor/panels/AlgorithmPanel.tsx`
- `src/components/editor/panels/FeatureListPanel.tsx`
- `src/components/editor/EditorGallery.tsx`
- `src/store/editor/useEditorStore.ts`
- `src/components/editor/algorithms/registry.ts`
- `src/components/editor/algorithms/types.ts`
- `src/components/editor/algorithms/useAlgorithmRunner.ts`
- `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts`
- `src/pages/Editor.tsx`
- `CHANGELOG.md`

---

## Summary

EDITOR-002 replaces the two-tab (`Features` / `Algorithms`) layout of the right panel with a single scrollable "workflow rail." The rail presents sections in a fixed top-to-bottom order: (1) sample hint, (2) algorithm choice, (3) algorithm config, (4) run + run summary, (5) features list. This makes the workflow obvious without tabs. A secondary requirement is removing all public-facing `R2` storage mentions from the UI copy.

---

## Decisions

- **No tabs at all.** `EditorRightPanel` currently manages tab state (`RightPanelTab`). Replace the entire component so it renders a single scrollable column — no state for tabs required.
- **Storage mode selector removed from UI.** The storage mode dropdown currently exposes `R2` to users. Remove it from the panel; always pass `"auto"` internally. The `RequestedStorageMode` type and `useAlgorithmRunner` internal handling remain unchanged (no backend impact).
- **Sample hint section.** When an image is loaded that has a `recommendedAlgorithms` list in the gallery, render a short hint box above the algorithm selector showing the image name and recommended algorithms. When `imageSrc` is null, show an "open an image" prompt instead.
- **Section ordering.** Rendered top-to-bottom: hint → algorithm select → config form → run button + status/error + summary → features list. No section is hidden — they are always visible and scroll together.
- **Run summary stays inline.** Move the "Last Run Summary" block immediately after the Run button (before features).
- **Features always visible.** The `FeatureListPanel` content is inlined at the bottom of the rail rather than shown in a separate tab.
- **`AlgorithmPanel` is replaced, not extended.** Delete the tab logic from `EditorRightPanel`; inline the combined content directly in the new `EditorRightPanel`.
- **`AlgorithmPanel.tsx` is deleted** because all its logic moves into the new `EditorRightPanel.tsx`. This keeps the file count down.
- **`FeatureListPanel.tsx` stays as-is** so its content can be reused (it is a self-contained component).
- **Gallery cards.** The `EditorGallery` gallery card rendering should surface the `description` field already stored on each `GalleryImage`. Currently the card shows only the image name. Add a one-line description row under the title so users see the hint before selecting a sample.
- **`recommendedAlgorithms` hint** uses the same algorithm `title` strings already registered in `ALGORITHM_REGISTRY` for display — no new data source needed.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/panels/EditorRightPanel.tsx` | Full rewrite: remove tabs, render single scrollable workflow rail (hint → algo select → config → run+summary → features) |
| `src/components/editor/panels/AlgorithmPanel.tsx` | Delete (logic inlined into EditorRightPanel) |
| `src/components/editor/EditorGallery.tsx` | Add `description` display under each card's title |

No backend files change. No `src/lib/api.ts` changes. No store changes.

---

## API Contract

n/a — no backend endpoints added or changed.

---

## Test Plan / Tests Added

Frontend only — no new backend tests.

| Test name | File | What it checks |
|-----------|------|----------------|
| `bun run build` smoke | — | TypeScript compiles cleanly after the rewrite |
| `bun run lint` | — | No ESLint violations |

No jest tests exist. The build + lint gates are the acceptance bar.

---

## Validation

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP (no backend changes)
mypy . --ignore-missing-imports → SKIP (no backend changes)
pytest tests/ -v          → SKIP (no backend changes)
bun run lint              → MUST PASS
bun run build             → MUST PASS
```

---

## Risks / Open Questions

- [RESOLVED] Storage mode dropdown removal: `RequestedStorageMode` internal type is kept, just no longer exposed in UI — `"auto"` is always passed. This means no backend or type-system changes needed.
- [RESOLVED] `AlgorithmPanel.tsx` deletion: confirmed that only `EditorRightPanel.tsx` imports it, so deleting is safe.
- [OPEN] The `recommendedAlgorithms` strings in `useEditorStore.ts` (e.g. `"ChESS Corners"`) may not exactly match `algorithm.title` in the registry (`chessCornersAlgorithm.title`). Implementer should verify the exact title strings and either match them or display the hint strings as-is (they are informational only — no lookup needed).

---

## Implementation Steps

**Phase 1 — Gallery card descriptions**

1. Open `src/components/editor/EditorGallery.tsx`.
2. In the card body (`<div className="p-4 ...">`) after the `<span>` for `img.name`, add a conditional `<p>` that renders `img.description` when set. Use `text-xs text-muted-foreground mt-1` classes.

**Phase 2 — Rewrite EditorRightPanel**

1. Open `src/components/editor/panels/EditorRightPanel.tsx`.
2. Remove the `RightPanelTab` type and all tab-related state/JSX.
3. Move all logic from `AlgorithmPanel.tsx` into this file (imports, `resolveConfig`, `handleRun`, runner state).
4. Read from `useEditorStore`: `imageSrc`, `imageName`, `imageSampleId`, `replaceAlgorithmFeatures`, `setSelectedFeatureId`, `galleryImages` (to look up `recommendedAlgorithms` + `description` for the active image).
5. Build the workflow rail sections in order:
   - **Hint section**: if `imageSrc` is null, render a prompt card "Open an image from the gallery to get started." If `imageSrc` is set, look up the matching `GalleryImage` by `imageSampleId` or `imageName`, display its `description` (if any) and a "Recommended:" chip list for `recommendedAlgorithms` (if any).
   - **Algorithm select**: the existing `<select>` over `ALGORITHM_REGISTRY`.
   - **Config form**: `<ConfigComponent ... />`.
   - **Run button + status + error + summary**: grouped together.
   - **Features**: `<FeatureListPanel />` inline at the bottom, separated by a horizontal rule.
6. Remove the storage mode `<select>` entirely. Hardcode `storageMode: "auto"` in `handleRun`.
7. Keep the outer `div` sizing: `w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden`. Make the inner content `overflow-y-auto flex-1`.

**Phase 3 — Delete AlgorithmPanel**

1. Delete `src/components/editor/panels/AlgorithmPanel.tsx`.
2. Confirm no other file imports it (only `EditorRightPanel.tsx` was the importer).

**Phase 4 — Quality gates**

```bash
bun run lint
bun run build
```

Fix any errors before writing the implementer report.

---

## Next Handoff

**To:** Implementer
**Action:** Implement phases 1–4 as described. Write `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/02-implementer.md` when done.
