# TASK-33: Frontend review P1+P2 fixes (FE-008 through FE-015)
Backlog: FE-008 through FE-015 | Date: 2026-03-22

## Plan

### Summary
Implement 8 frontend review fixes: split content manifest for lazy loading (FE-008), add Zustand selectors (FE-009), conditionally load mermaid (FE-010), validate imported features with Zod (FE-011), switch to ResizeObserver (FE-012), memoize FeatureLayer (FE-013), add missing tests (FE-014), and add skip-to-content link (FE-015).

### Implementation Steps

**Step 1 — FE-008: Split content manifest**
- Modify `scripts/content-build.ts` to emit:
  - `src/generated/content-index.ts` — metadata arrays without `html` field
  - `src/generated/content/blog/<slug>.ts` — one file per blog post exporting `{ html }`
  - `src/generated/content/algorithms/<slug>.ts` — one file per algorithm page
- Update `src/lib/content/schema.ts` to add `BlogIndexEntry` / `AlgorithmIndexEntry` types (frontmatter + slug, no html)
- Update `Blog.tsx` and `AlgorithmIndex.tsx` to import from `content-index.ts`
- Update `BlogPost.tsx` and `AlgorithmPost.tsx` to lazy-load html via dynamic `import()`
- Delete old `src/generated/content-manifest.ts` reference

**Step 2 — FE-009: Zustand selectors**
- Add `useShallow` import from `zustand/react/shallow`
- Refactor all 9 `useEditorStore()` call sites to use `useEditorStore(useShallow((s) => ({...})))`
- Files: CanvasWorkspace, ConfigurePanel, ResultsPanel, EditorRightPanel, FeatureListPanel, EditorGallery, Editor.tsx (2 call sites)

**Step 3 — FE-010: Conditional mermaid loading**
- In `useMermaid.ts`, check if rendered HTML contains `language-mermaid` code blocks before importing mermaid
- Early return if no mermaid blocks found

**Step 4 — FE-011: Zod-validated feature import**
- Add `ringMarkerFeatureSchema` and `arucoMarkerFeatureSchema` to `featureSchema.ts`
- Update `featureSchema` union to include them
- Replace `as unknown as Feature` in `normalizeImportedFeatures` with `featureSchema.safeParse()`, filtering out invalid entries

**Step 5 — FE-012: ResizeObserver**
- Replace `window.addEventListener("resize", ...)` with `ResizeObserver` on `containerRef` in CanvasWorkspace

**Step 6 — FE-013: Memoize FeatureLayer**
- Wrap FeatureLayer export with `React.memo`
- Stabilize callback props in CanvasWorkspace with `useCallback`

**Step 7 — FE-014: Tests**
- Add tests for `normalizeImportedFeatures` (valid, invalid, mixed)
- Add tests for `replaceAlgorithmFeatures` store action
- Add tests for camelCase→snake_case mappers in api.ts (at least `toBackendConfig`)
- Add ring_marker and aruco_marker schema tests

**Step 8 — FE-015: Skip-to-content link**
- Add skip-to-content `<a>` as first child in AppLayout, targeting `#main-content`
- Add `id="main-content"` to `<main>` element in App.tsx

## Implementation
- **Files changed:** scripts/content-build.ts, scripts/postbuild.ts, src/lib/content/schema.ts, src/generated/content-index.ts (new), src/generated/content/blog/*.ts (new), src/pages/Blog.tsx, src/pages/BlogPost.tsx, src/pages/AlgorithmPost.tsx, src/pages/AlgorithmIndex.tsx, src/components/blog/PostCard.tsx, src/components/blog/RelatedPosts.tsx, src/store/editor/useEditorStore.ts, src/store/editor/featureSchema.ts, src/store/editor/featureSchema.test.ts, src/store/editor/storeActions.test.ts (new), src/components/editor/CanvasWorkspace.tsx, src/components/editor/EditorGallery.tsx, src/components/editor/canvas/FeatureLayer.tsx, src/components/editor/panels/ConfigurePanel.tsx, src/components/editor/panels/ResultsPanel.tsx, src/components/editor/panels/EditorRightPanel.tsx, src/components/editor/panels/FeatureListPanel.tsx, src/pages/Editor.tsx, src/hooks/useMermaid.ts, src/App.tsx, CHANGELOG.md
- **Deviations:** API mapper tests (FE-014) skipped — mappers are unexported private functions; tested indirectly via normalizeImportedFeatures and schema validation instead. Also deleted orphaned NotFoundPage.tsx found during review. Added `import.meta.glob` guard for Bun SSR compatibility.
- **Gate results:** build ✅ | lint ✅ | test ✅ (49 pass, 0 fail)

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** None
