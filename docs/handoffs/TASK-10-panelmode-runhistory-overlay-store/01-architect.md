# Task Handoff Report

**Title:** Add panelMode, runHistory, overlayVisibility to Zustand store
**Task ID:** TASK-10-panelmode-runhistory-overlay-store
**Backlog ID:** EDITOR-010
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md` — task EDITOR-010 definition
- `CLAUDE.md` — architecture overview
- `docs/handoffs.md` — handoff workflow
- `src/store/editor/useEditorStore.ts` — current store (300 lines)
- `src/pages/Editor.tsx` — `showFeatures` consumer
- `src/components/editor/CanvasWorkspace.tsx` — `showFeatures` consumer
- `src/components/editor/canvas/FeatureLayer.tsx` — `showFeatures` consumer
- `src/components/editor/panels/EditorRightPanel.tsx` — current right panel
- `src/components/editor/algorithms/types.ts` — AlgorithmSummaryEntry type
- `.claude/plans/breezy-wibbling-piglet.md` — editor redesign plan

---

## Summary

Add four new state groups to the Zustand editor store to support the right panel mode system:

1. **panelMode** (`"configure" | "results"`) — which sub-panel the right panel shows
2. **runHistory** — compact list of past algorithm runs (summary-only, not full results)
3. **lastAlgorithmResult** — cached raw result for overlay rendering
4. **overlayVisibility** — replaces boolean `showFeatures` with a keyed record

This is purely a store extension. No UI changes in this task — consumers are updated in EDITOR-011/012/013.

---

## Decisions

- **Keep single store file:** The store is 300 lines. Adding ~60 lines of new state brings it to ~360, well under the 500-line threshold. No need to extract types to a separate file yet.
- **Keep `showFeatures` as backward-compatible getter:** Rather than immediately migrating 3 consumer files, add `overlayVisibility` and keep `showFeatures`/`setShowFeatures` as computed wrappers that read/write `overlayVisibility.features`. Consumers migrate in EDITOR-013.
- **RunHistoryEntry stores summary, not full result:** Full algorithm results can be large (thousands of corners). History stores only `{ runId, algorithmId, config snapshot hash, summary, featureCount, timestamp }`.
- **overlayVisibility default keys:** `{ features: true, algorithmOverlay: true }`. New keys added as new overlay types are created (Phase 2+).

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/store/editor/useEditorStore.ts` | Add PanelMode type, RunHistoryEntry interface, overlayVisibility record, panelMode state+setter, runHistory state+mutations, lastAlgorithmResult state+setter. Wire showFeatures as overlayVisibility wrapper. |

---

## API Contract

n/a — no backend changes.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| n/a | n/a | Frontend-only store change. Verified by `bun run lint` + `bun run build`. No jest/vitest tests exist in the project. |

Smoke verification: `bun run build` must succeed with zero type errors.

---

## Implementation Steps

### Step 1: Add new types (before EditorState interface)

```ts
export type PanelMode = 'configure' | 'results';

export interface RunHistoryEntry {
    runId: string;
    algorithmId: string;
    algorithmTitle: string;
    summary: AlgorithmSummaryEntry[];
    featureCount: number;
    timestamp: number;
}

export type OverlayVisibilityKey = 'features' | 'algorithmOverlay';
```

Import `AlgorithmSummaryEntry` from `../components/editor/algorithms/types`.

### Step 2: Extend EditorState interface

Add after `galleryImages`:
```ts
panelMode: PanelMode;
lastAlgorithmResult: { algorithmId: string; result: unknown } | null;
runHistory: RunHistoryEntry[];
overlayVisibility: Record<OverlayVisibilityKey, boolean>;
```

Add setters:
```ts
setPanelMode: (mode: PanelMode) => void;
setLastAlgorithmResult: (algorithmId: string, result: unknown) => void;
addRunToHistory: (entry: RunHistoryEntry) => void;
clearRunHistory: () => void;
setOverlayVisibility: (key: OverlayVisibilityKey, visible: boolean) => void;
```

### Step 3: Add initial state and actions in create()

```ts
panelMode: 'configure',
lastAlgorithmResult: null,
runHistory: [],
overlayVisibility: { features: true, algorithmOverlay: true },

setPanelMode: (mode) => set({ panelMode: mode }),
setLastAlgorithmResult: (algorithmId, result) => set({ lastAlgorithmResult: { algorithmId, result } }),
addRunToHistory: (entry) => set((state) => ({
    runHistory: [entry, ...state.runHistory].slice(0, 20),
})),
clearRunHistory: () => set({ runHistory: [] }),
setOverlayVisibility: (key, visible) => set((state) => ({
    overlayVisibility: { ...state.overlayVisibility, [key]: visible },
})),
```

### Step 4: Wire showFeatures as backward-compatible wrapper

Replace:
```ts
showFeatures: true,
setShowFeatures: (show) => set({ showFeatures: show }),
```

With:
```ts
// showFeatures is now a computed getter over overlayVisibility.features
get showFeatures() { return this.overlayVisibility.features; },
setShowFeatures: (show) => set((state) => ({
    overlayVisibility: { ...state.overlayVisibility, features: show },
})),
```

**Note:** Zustand's `create()` doesn't support `get`. Instead, keep `showFeatures` as a regular field that is derived in `setOverlayVisibility` and `setShowFeatures`:

```ts
setShowFeatures: (show) => set((state) => ({
    showFeatures: show,
    overlayVisibility: { ...state.overlayVisibility, features: show },
})),
setOverlayVisibility: (key, visible) => set((state) => ({
    overlayVisibility: { ...state.overlayVisibility, [key]: visible },
    ...(key === 'features' ? { showFeatures: visible } : {}),
})),
```

Keep `showFeatures: true` as initial state (synced with `overlayVisibility.features: true`).

---

## Invariants Checklist

| Invariant | Touched? |
|-----------|----------|
| CV logic only in `backend/routers/cv.py` | No |
| Storage logic only in `backend/services/storage_service.py` | No |
| Frontend API calls only in `src/lib/api.ts` | No |
| Algorithm adapters only in `src/components/editor/algorithms/<name>/adapter.ts` | No |
| `bun` (not npm) for all JS operations | Yes — use `bun run lint`, `bun run build` |
| All `HTTPException` raises include `from exc` | No backend changes |
| Algorithm features carry `readonly: true`, `algorithmId`, `runId` | Not changed |
| Storage keys match `uploads/<sha256-64-hex>` | Not changed |

---

## Risks / Open Questions

- [RESOLVED] Circular import risk: `useEditorStore.ts` importing `AlgorithmSummaryEntry` from `algorithms/types.ts` — types.ts already imports from the store. **Resolution:** `AlgorithmSummaryEntry` is a simple `{label: string; value: string}` interface. Define it inline in the store to avoid circular dependency. No need to import from algorithms/types.

---

## Next Handoff

**To:** Implementer
**Action:** Implement the four state groups as specified. Run `bun run lint && bun run build` to verify. Write `02-implementer.md`.
