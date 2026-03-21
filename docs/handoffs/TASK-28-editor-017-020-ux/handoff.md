# TASK-28: Editor UX — Overlay toggle, Diagnostics, Presets, CollapsibleSection
Backlog: EDITOR-017 through EDITOR-020 | Date: 2026-03-20

## Plan

### Summary
Implement four editor UX improvements across the algorithm plugin system and editor panels:
1. EDITOR-017: Overlay visibility popover on left rail (per-layer toggles)
2. EDITOR-018: Structured diagnostics interface in ResultsPanel
3. EDITOR-019: Preset configurations for algorithm config forms
4. EDITOR-020: CollapsibleSection component for progressive disclosure

### Current State
- Store has `overlayVisibility` with `features`/`algorithmOverlay` keys — ready
- Left rail has single eye toggle for features — needs popover
- ResultsPanel shows summary grid only — no diagnostics
- AlgorithmDefinition has no `presets` or `diagnostics` fields
- formFields.tsx has `Section` but no collapsible variant
- Config forms show all params at once (CharUco: 12, MarkerBoard: 17+)

### Affected Files
- `src/components/editor/algorithms/types.ts` — add `DiagnosticEntry`, `presets`, `diagnostics` to AlgorithmDefinition
- `src/components/editor/algorithms/formFields.tsx` — add CollapsibleSection
- `src/components/editor/panels/ResultsPanel.tsx` — render diagnostics
- `src/components/editor/panels/ConfigurePanel.tsx` — add preset picker
- `src/pages/Editor.tsx` — replace eye toggle with popover
- `src/components/editor/algorithms/chessCorners/adapter.ts` — add presets + diagnostics
- `src/components/editor/algorithms/calibrationTargets/chessboardAdapter.ts` — add presets + diagnostics
- `src/components/editor/algorithms/calibrationTargets/charucoAdapter.ts` — add presets + diagnostics
- `src/components/editor/algorithms/calibrationTargets/markerboardAdapter.ts` — add presets + diagnostics
- `src/components/editor/algorithms/calibrationTargets/CharucoConfigForm.tsx` — use CollapsibleSection
- `src/components/editor/algorithms/calibrationTargets/MarkerBoardConfigForm.tsx` — use CollapsibleSection
- `src/components/editor/algorithms/calibrationTargets/ChessboardConfigForm.tsx` — use CollapsibleSection

### Implementation Steps

**Step 1: Types (EDITOR-018, EDITOR-019)**
Add to `types.ts`:
- `DiagnosticEntry { level: 'info' | 'warning' | 'error'; message: string; detail?: string }`
- `AlgorithmPreset { label: string; description?: string; config: unknown }`
- Add `presets?: AlgorithmPreset[]` and `diagnostics?: (result: unknown) => DiagnosticEntry[]` to AlgorithmDefinition

**Step 2: CollapsibleSection (EDITOR-020)**
Add to `formFields.tsx`: a `CollapsibleSection` component with chevron toggle, smooth open/close, defaults to collapsed.

**Step 3: Config forms (EDITOR-020)**
Wrap advanced sections in CharucoConfigForm, MarkerBoardConfigForm, ChessboardConfigForm with CollapsibleSection.

**Step 4: Presets (EDITOR-019)**
Add presets to each adapter. Add PresetPicker UI in ConfigurePanel between Algorithm and Configuration sections.

**Step 5: Diagnostics (EDITOR-018)**
Add diagnostics() to adapters. Render in ResultsPanel above summary grid.

**Step 6: Overlay visibility popover (EDITOR-017)**
Replace single eye toggle in Editor.tsx with a popover showing Features + Algorithm Overlay toggles.

### Test Plan
Frontend-only changes — verified via `bun run lint` + `bun run build`.

## Implementation
- **Files changed:** types.ts, formFields.tsx, ResultsPanel.tsx, ConfigurePanel.tsx, Editor.tsx, all 4 adapters, 3 config forms, CHANGELOG.md (13 files)
- **Deviations:** None
- **Gate results:** lint ✅, build ✅

## Review
- **Verdict:** approved
- **Issues found & fixed:** Removed unused `overlayVisibility`/`setOverlayVisibility` destructure from Editor component (caught by ESLint)
- **Residual risks:** None
