# TASK-30: Frontend Quality (FE-001 through FE-007)
Backlog: FE-001–FE-007 | Date: 2026-03-21

## Plan

### Summary
Implement 7 frontend quality tasks from the pre-release review: error boundaries (FE-001), Vitest setup with core logic tests (FE-002), sonner toast notifications replacing alert() calls (FE-003), error handling gaps in useTargetGenerator and ConfigurePanel (FE-004), catch-all 404 page (FE-005), route-level code splitting (FE-006), and CanvasWorkspace extraction into hooks (FE-007).

### Implementation Steps

1. **FE-001**: Create `ErrorBoundary` component, wrap CanvasWorkspace, ConfigurePanel, BlogPost/AlgorithmPost content
2. **FE-002**: Install vitest + @testing-library/react, configure vitest, write tests for featureSchema, reducer, store actions
3. **FE-003**: Install sonner, add `<Toaster>` to App, replace 5 alert() calls with toast.error()
4. **FE-004**: Add .catch() to useTargetGenerator, try/catch around toFeatures/summary in ConfigurePanel
5. **FE-005**: Create NotFound page, add `<Route path="*">` in App.tsx
6. **FE-006**: Convert page imports to React.lazy with Suspense fallback
7. **FE-007**: Extract useDrawingHandlers, useCanvasGestures, usePixelSampler from CanvasWorkspace

## Implementation
- **Files changed:**
  - `src/components/ui/ErrorBoundary.tsx` (new)
  - `src/pages/Editor.tsx` — ErrorBoundary wrapping CanvasWorkspace
  - `src/pages/BlogPost.tsx` — ErrorBoundary wrapping article content
  - `src/pages/AlgorithmPost.tsx` — ErrorBoundary wrapping article content
  - `src/pages/NotFound.tsx` (new) — 404 page
  - `src/App.tsx` — lazy imports, Suspense, Toaster, catch-all route
  - `src/components/editor/EditorGallery.tsx` — toast.error
  - `src/components/editor/featureIo.ts` — toast.error
  - `src/components/targetgen/panels/TargetTypeSelector.tsx` — toast.error
  - `src/components/editor/panels/ConfigurePanel.tsx` — try/catch + toast
  - `src/components/targetgen/useTargetGenerator.ts` — .catch()
  - `src/components/editor/hooks/usePixelSampler.ts` (new)
  - `src/components/editor/hooks/useCanvasGestures.ts` (new)
  - `src/components/editor/hooks/useDrawingHandlers.ts` (new)
  - `src/components/editor/CanvasWorkspace.tsx` — rewritten to use extracted hooks
  - `vitest.config.ts` (new)
  - `src/test/setup.ts` (new)
  - `src/store/editor/featureSchema.test.ts` (new) — 15 tests
  - `src/components/targetgen/reducer.test.ts` (new) — 11 tests
  - `package.json` — sonner dep, vitest devDeps, test scripts
  - `CHANGELOG.md` — 7 entries
- **Deviations:** None
- **Gate results:**
  - ESLint: pass
  - TypeScript build: pass
  - Vitest: 26/26 pass

## Review
- **Verdict:** approved
- **Issues found & fixed:** Unused `zoom` parameter in useCanvasGestures interface (caught by ESLint, removed)
- **Residual risks:** None
