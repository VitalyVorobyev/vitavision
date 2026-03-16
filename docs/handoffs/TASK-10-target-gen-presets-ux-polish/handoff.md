# TASK-10: Target generator presets and UX polish
Backlog: TGEN-007, TGEN-008 | Date: 2026-03-16

## Plan

### Summary
Add curated preset configurations for each target type (camera calibration, robotics, industrial) with a preset picker and JSON config import in the left panel (TGEN-007). Add board dimension display overlay in the preview, and fill in missing tooltips on all config fields (TGEN-008).

### Current State
- Target generator page is functional with 3 target types, config forms, preview, and downloads
- Some config fields already have tooltips (inner rows/cols, marker ratio, circle diameter), but square size, border bits, dictionary, and all paper fields lack them
- No preset system or config import exists
- Preview shows SVG but no dimension annotations

### Affected Files
- `src/components/targetgen/presets.ts` — NEW: curated preset definitions
- `src/components/targetgen/types.ts` — add `LOAD_PRESET` action, `Preset` interface
- `src/components/targetgen/reducer.ts` — handle `LOAD_PRESET` action
- `src/components/targetgen/panels/TargetTypeSelector.tsx` — add preset picker + import button below type cards
- `src/components/targetgen/panels/ChessboardGenConfig.tsx` — add missing tooltips
- `src/components/targetgen/panels/CharucoGenConfig.tsx` — add missing tooltips
- `src/components/targetgen/panels/MarkerBoardGenConfig.tsx` — add missing tooltips
- `src/components/targetgen/panels/PaperConfig.tsx` — add tooltips
- `src/components/targetgen/TargetPreview.tsx` — add board dimension overlay
- `CHANGELOG.md` — append entries

### Implementation Steps

1. Create `presets.ts` with 3 presets per target type (9 total): "Camera Calibration", "Robotics", "Industrial QC"
2. Add `Preset` type and `LOAD_PRESET` action to `types.ts`
3. Handle `LOAD_PRESET` in `reducer.ts` — sets both target config and page config from preset
4. Add preset picker (select dropdown) + Import JSON button to `TargetTypeSelector.tsx` below type cards
5. Add board dimension display to `TargetPreview.tsx` — show board size and printable area
6. Add missing tooltips to all config fields
7. Run `bun run lint` and `bun run build`

## Implementation
- **Files changed:** presets.ts (new), types.ts, reducer.ts, TargetTypeSelector.tsx, TargetPreview.tsx, ChessboardGenConfig.tsx, CharucoGenConfig.tsx, MarkerBoardGenConfig.tsx, PaperConfig.tsx, CHANGELOG.md
- **Deviations:** Preset type defined in presets.ts alongside data (not in types.ts) to keep data and type co-located
- **Gate results:** lint: pass | build: pass

## Review
- **Verdict:** approved
- **Issues found & fixed:** Removed dead-code preset description lookup (`p.id === ""` always null)
- **Residual risks:** None
