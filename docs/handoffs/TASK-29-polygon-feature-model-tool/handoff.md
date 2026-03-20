# TASK-29: Polygon Feature — model, renderer, drawing tool
Backlog: EDITOR-021 through EDITOR-023 | Date: 2026-03-20

## Plan

### Summary
Add closed polygon support to the editor: PolygonFeature type in the feature model + Zod schema, a polygon renderer in FeatureLayer (closed Konva Line with semi-transparent fill), and a POLYGON drawing tool on the left rail and canvas (click to add vertices, double-click to close).

### Current State
- Feature union: 6 types, no polygon
- ToolType: 6 values, no POLYGON
- Zod schema: 6 discriminated variants
- POLYLINE tool pattern exists (click to add points, dblClick to commit) — POLYGON reuses this interaction

### Affected Files
- `src/store/editor/useEditorStore.ts` — add PolygonFeature, extend ToolType + FeatureType + Feature union
- `src/store/editor/featureSchema.ts` — add polygon Zod variant to discriminated union
- `src/store/editor/featureGroups.ts` — add "polygon" to TYPE_LABELS
- `src/components/editor/canvas/FeatureLayer.tsx` — add polygon renderer (closed Line with fill)
- `src/components/editor/CanvasWorkspace.tsx` — add POLYGON tool handling (click + dblClick)
- `src/pages/Editor.tsx` — add POLYGON to left rail tools

### Implementation Steps
1. Store types: add `'POLYGON'` to ToolType, `'polygon'` to FeatureType, PolygonFeature interface, extend Feature union
2. Zod schema: add polygonFeatureSchema to discriminated union
3. Feature groups: add polygon to TYPE_LABELS
4. FeatureLayer: add polygon case — Konva Line with closed=true, semi-transparent fill, selection + drag
5. CanvasWorkspace: add POLYGON handling — same as POLYLINE but produces `type: "polygon"` on dblClick; show preview with closed=true
6. Editor left rail: add POLYGON tool with Pentagon icon

### Test Plan
Frontend-only — verified via `bun run lint` + `bun run build`.

## Implementation
- **Files changed:** useEditorStore.ts, featureSchema.ts, featureGroups.ts, FeatureLayer.tsx, CanvasWorkspace.tsx, Editor.tsx, CHANGELOG.md
- **Deviations:** None
- **Gate results:** lint ✅, build ✅

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** None
