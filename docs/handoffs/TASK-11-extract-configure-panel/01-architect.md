# Task Handoff Report

**Title:** Extract ConfigurePanel from EditorRightPanel
**Task ID:** TASK-11-extract-configure-panel
**Backlog ID:** EDITOR-011
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md` — EDITOR-011 definition
- `src/components/editor/panels/EditorRightPanel.tsx` — current monolithic panel (239 lines)
- `src/store/editor/useEditorStore.ts` — panelMode state (from EDITOR-010)
- `src/components/editor/algorithms/useAlgorithmRunner.ts` — runner hook
- `src/components/editor/algorithms/types.ts` — AlgorithmDefinition
- `src/components/editor/algorithms/registry.ts` — ALGORITHM_REGISTRY

---

## Summary

Extract the configure-related content (hint card, algorithm picker, config form, run button + status + summary) from EditorRightPanel into a new ConfigurePanel component. Extract the shared RailSection component to its own file. EditorRightPanel becomes a thin shell that reads panelMode from the store and renders ConfigurePanel (when "configure") or a FeatureListPanel placeholder (when "results", until EDITOR-012 creates ResultsPanel).

---

## Decisions

- **RailSection extracted to shared file:** Both ConfigurePanel and the future ResultsPanel will need it.
- **AlgorithmPicker stays in ConfigurePanel:** Only used there; no need for a separate file.
- **resolveConfig helper stays in ConfigurePanel:** Only used there.
- **ConfigurePanel owns all configure-related state:** selectedAlgorithmId, configEntries, useAlgorithmRunner, handleRun — all move from EditorRightPanel to ConfigurePanel.
- **EditorRightPanel shell reads panelMode:** Shows ConfigurePanel or FeatureListPanel based on mode. Since panelMode defaults to "configure" and nothing toggles it yet, current behavior is preserved.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/panels/RailSection.tsx` | **New.** Extracted shared RailSection component (~15 lines). |
| `src/components/editor/panels/ConfigurePanel.tsx` | **New.** Contains hint card, AlgorithmPicker, config form, run button + status + summary (~175 lines). |
| `src/components/editor/panels/EditorRightPanel.tsx` | **Refactored.** Thin shell: mode toggle placeholder + conditional rendering of ConfigurePanel or FeatureListPanel (~30 lines). |

---

## API Contract

n/a

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| n/a | n/a | Frontend-only UI refactor. Verified by `bun run lint` + `bun run build`. |

---

## Implementation Steps

### Step 1: Create RailSection.tsx

Extract the `RailSection` component from EditorRightPanel to its own file. Export as named export.

### Step 2: Create ConfigurePanel.tsx

Move from EditorRightPanel:
- `ConfigEntry` type
- `resolveConfig` helper
- `AlgorithmPicker` local component
- All state: `selectedAlgorithmId`, `configEntries`, `useAlgorithmRunner()`, `algorithm` memo
- `handleSelectAlgorithm`, `handleRun`
- `activeGalleryImage` memo, `canRun`, `hasHint`
- JSX: sections 1-4 (hint card, algorithm picker, config form, run + status + summary)

Import RailSection from new shared file.

### Step 3: Refactor EditorRightPanel.tsx

- Import ConfigurePanel, FeatureListPanel, and panelMode from store
- Render outer container (same w-80 styling)
- When panelMode === "configure": render ConfigurePanel + FeatureListPanel (wrapped in RailSection)
- When panelMode === "results": render FeatureListPanel only (placeholder for EDITOR-012)

---

## Invariants Checklist

| Invariant | Touched? |
|-----------|----------|
| CV logic only in `backend/routers/cv.py` | No |
| Storage logic only in `backend/services/storage_service.py` | No |
| Frontend API calls only in `src/lib/api.ts` | No |
| Algorithm adapters only in `src/components/editor/algorithms/<name>/adapter.ts` | No |
| `bun` (not npm) for all JS operations | Yes |
| All `HTTPException` raises include `from exc` | No backend changes |
| Algorithm features carry `readonly: true`, `algorithmId`, `runId` | Not changed (handleRun preserved) |
| Storage keys match `uploads/<sha256-64-hex>` | Not changed |

---

## Risks / Open Questions

None.

---

## Next Handoff

**To:** Implementer
**Action:** Create RailSection.tsx, ConfigurePanel.tsx, refactor EditorRightPanel.tsx. Run `bun run lint && bun run build`.
