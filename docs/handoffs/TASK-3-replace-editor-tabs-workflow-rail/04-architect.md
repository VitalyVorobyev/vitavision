**Title:** Replace editor tabs with guided workflow rail
**Task ID:** TASK-3-replace-editor-tabs-workflow-rail
**Backlog ID:** EDITOR-002
**Role:** Architect
**Date:** 2026-03-14
**Status:** ready_for_human

---

## Inputs Consulted

- `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/01-architect.md`
- `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/02-implementer.md`
- `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/03-reviewer.md`

---

## Outcome Summary

EDITOR-002 is complete. The two-tab right panel is replaced with a single scrollable workflow rail showing: sample hint, algorithm select, config form, run button + status + summary, and features list — in that order, always visible. Storage mode is no longer exposed in the UI (`"auto"` is hardcoded). No `R2` strings appear in any public-facing component. Gallery cards now display their curated `description` text. `AlgorithmPanel.tsx` was deleted and its logic was merged cleanly into `EditorRightPanel.tsx`. All quality gates passed.

---

## Decisions

- `AlgorithmPanel.tsx` deleted rather than left as a pass-through — reduces indirection and file count with no downside.
- Storage mode selector fully removed from UI — `RequestedStorageMode` type retained in `types.ts` for potential future internal use but is no longer user-visible.
- Hint section for uploaded images shows nothing rather than a generic message — uploads are user-provided and need no curated hint.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/components/editor/panels/EditorRightPanel.tsx` | Full rewrite |
| `src/components/editor/panels/AlgorithmPanel.tsx` | Deleted |
| `src/components/editor/EditorGallery.tsx` | Description field surfaced |
| `CHANGELOG.md` | Entry added |

---

## Residual Risks

- The `EditorRightPanel` component is ~110 lines of JSX. Future additions (e.g. EDITOR-003 wiring curated examples, or EDITOR-004 showing algorithm metadata) may push it toward the 300-line module limit. Consider extracting the hint section or run section into sub-components at that point.
- Uploaded images receive no hint — acceptable now, but EDITOR-003 may want to add guidance for first-time uploaders.

---

## Human Decision / Validation Needed

1. **Visual smoke test** — open the editor in a browser, confirm the right panel shows a single scrollable column (no tabs), sample hints appear when a curated image is selected, and gallery cards show descriptions.
2. **Run an algorithm** — select a curated sample, run any algorithm, confirm the run summary appears inline between the run button and the features list.
3. **No R2 copy** — confirm no visible text mentions `R2` in the editor UI.

---

## Follow-up Tasks

- **EDITOR-003** (next P1): wire curated examples and algorithm recommendations — the gallery hint infrastructure (recommendedAlgorithms chips) is already in place.
- **CV-002** (next P1): add fully editable Chessboard, ChArUco, and Marker Board config surfaces.

---

## API Contract

n/a

---

## Test Plan / Tests Added

n/a (frontend-only changes; build + lint smoke only)

---

## Validation

```
bun run lint  → PASS
bun run build → PASS
```

---

## Risks / Open Questions

- [RESOLVED] All open questions from the architect blueprint were resolved during implementation.

---

## Next Handoff

**To:** Human
**Action:** Visual smoke test in browser per "Human Decision / Validation Needed" above. If satisfied, proceed to EDITOR-003.
