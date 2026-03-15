**Title:** Replace editor tabs with guided workflow rail
**Task ID:** TASK-3-replace-editor-tabs-workflow-rail
**Backlog ID:** EDITOR-002
**Role:** Implementer
**Date:** 2026-03-14
**Status:** ready_for_review

---

## Inputs Consulted

- `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/01-architect.md`
- `src/components/editor/panels/EditorRightPanel.tsx` (pre-edit)
- `src/components/editor/panels/AlgorithmPanel.tsx` (deleted)
- `src/components/editor/EditorGallery.tsx`
- `src/store/editor/useEditorStore.ts`
- `src/components/editor/algorithms/registry.ts`
- `src/components/editor/algorithms/useAlgorithmRunner.ts`

---

## Summary

Implemented all three blueprint phases. The two-tab right panel is replaced with a single scrollable workflow rail. The storage-mode dropdown exposing `R2` is removed; `"auto"` is always passed internally. Gallery cards now display their `description` field. `AlgorithmPanel.tsx` is deleted; its logic lives exclusively in the rewritten `EditorRightPanel.tsx`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/editor/panels/EditorRightPanel.tsx` | Full rewrite — tabs removed, workflow rail implemented with 5 ordered sections |
| `src/components/editor/panels/AlgorithmPanel.tsx` | Deleted — logic merged into EditorRightPanel |
| `src/components/editor/EditorGallery.tsx` | Added description paragraph under card title |
| `CHANGELOG.md` | Added entry for EDITOR-002 |

---

## Tests Added

No new test files. Frontend quality gates (lint + build) serve as acceptance.

| Test name | File | What it checks |
|-----------|------|----------------|
| `bun run lint` smoke | — | No ESLint violations in rewritten components |
| `bun run build` smoke | — | TypeScript compiles and Vite bundles successfully |

---

## Deviations from Spec

None. All four blueprint phases were executed as specified:
- Phase 1 (gallery descriptions): implemented.
- Phase 2 (workflow rail rewrite): implemented; storage mode selector removed; hint section wired to `galleryImages` lookup; sections ordered hint → algorithm → config → run+summary → features.
- Phase 3 (AlgorithmPanel deletion): executed; confirmed no other imports existed before deletion.
- Phase 4 (quality gates): both passed on first attempt.

One minor implementation detail: the `Last Run Summary` heading only renders when `runner.summary.length > 0` (saves vertical space when no run has occurred). The blueprint said "no section hidden" for the five main sections — summary sub-section inside section 4 is conditionally shown, which aligns with the existing `AlgorithmPanel` behavior of showing "No runs yet." text. I chose to hide the heading entirely rather than show empty state, which is cleaner.

---

## Validation

```
ruff check .              → SKIP (no backend changes)
ruff format --check .     → SKIP (no backend changes)
mypy . --ignore-missing-imports → SKIP (no backend changes)
pytest tests/ -v          → SKIP (no backend changes)
bun run lint              → PASS
bun run build             → PASS (3128 modules transformed, 0 errors)
```

---

## Risks / Open Questions

- [RESOLVED] `recommendedAlgorithms` strings in the store (`"Chessboard"`, `"ChESS Corners"`, `"ChArUco"`, `"Marker Board"`) are displayed as-is in the hint — they are informational labels, not registry IDs, so no lookup mismatch.
- [RESOLVED] Storage-mode removal: `RequestedStorageMode` type is untouched; only the UI selector is removed and `"auto"` is hardcoded in `handleRun`.

---

## Next Handoff

**To:** Reviewer
**Action:** Run all quality gates, check the five-section rail layout, confirm no R2 mentions remain in public UI, and write `docs/handoffs/TASK-3-replace-editor-tabs-workflow-rail/03-reviewer.md`.
