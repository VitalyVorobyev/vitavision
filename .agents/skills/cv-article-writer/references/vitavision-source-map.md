# Vitavision Source Map

Read this file when planning or drafting a Vitavision article from repo context.

Do not trust stale summaries. Inspect the live files before using any detail in an outline or article draft.

## High-value files

- Editor route and composition root: `src/pages/Editor.tsx`
- Editor gallery and curated sample entry points: `src/components/editor/EditorGallery.tsx`, `src/store/editor/useEditorStore.ts`
- Editor right rail and algorithm UX: `src/components/editor/panels/EditorRightPanel.tsx`, `src/components/editor/panels/ConfigurePanel.tsx`, `src/components/editor/panels/ResultsPanel.tsx`
- Canvas and overlay rendering: `src/components/editor/CanvasWorkspace.tsx`, `src/components/editor/canvas/FeatureLayer.tsx`, `src/components/editor/canvas/FeatureTooltip.tsx`, `src/components/editor/canvas/primitives/DirectedPointGlyph.tsx`
- Blog inventory and current publishing surface: `src/data/posts.ts`, `src/pages/BlogPage.tsx`, `src/pages/BlogPostPage.tsx`, `src/data/example.md`
- Frontend algorithm registry: `src/components/editor/algorithms/registry.ts`
- Frontend algorithm adapters and config forms: `src/components/editor/algorithms/**/*`
- Frontend algorithm execution pipeline: `src/components/editor/algorithms/useAlgorithmRunner.ts`, `src/lib/storage.ts`, `src/lib/api.ts`
- Backend CV endpoints and request/response models: `backend/routers/cv.py`
- Architecture and dev guide: `README.dev.md`
- API reference and schema notes: `docs/backend.md`
- Public sample assets and detector configs: `public/chessboard.png`, `public/charuco.png`, `public/markerboard.png`, `public/board_charuco.json`, `public/marker_detect_config.json`
- Change history and rationale: `docs/handoffs/`

## Quick discovery commands

```bash
sed -n '1,260p' src/pages/Editor.tsx
sed -n '1,260p' src/components/editor/EditorGallery.tsx
sed -n '1,360p' src/store/editor/useEditorStore.ts
sed -n '1,260p' src/components/editor/panels/ConfigurePanel.tsx
sed -n '1,260p' src/components/editor/CanvasWorkspace.tsx
sed -n '1,220p' src/data/posts.ts
sed -n '1,260p' src/components/editor/algorithms/registry.ts
rg -n "title:|description:|id:" src/components/editor/algorithms
sed -n '1,260p' src/components/editor/algorithms/useAlgorithmRunner.ts
sed -n '1,260p' src/lib/api.ts
sed -n '1,260p' backend/routers/cv.py
sed -n '1,260p' README.dev.md
sed -n '1,260p' docs/backend.md
find . -maxdepth 4 \( -name Cargo.toml -o -name '*.rs' -o -name pyproject.toml \)
rg -n "<topic-keyword>" src backend docs public
rg -n "<algorithm-or-demo-name>" docs/handoffs
```

## Current repo cues to verify live

These are useful starting hints, not ground truth:

- the live interactive demo surface is the editor, not `src/data/demos.ts`
- `useEditorStore.ts` currently seeds three curated sample cards: `chessboard`, `charuco`, and `markerboard`
- `src/components/editor/algorithms/registry.ts` currently registers `chess-corners`, `chessboard`, `charuco`, and `markerboard`
- `src/data/posts.ts` currently stores posts as simple TypeScript objects with `content: string`
- `src/data/example.md` exists, but the active blog rendering path is still the TypeScript post list

## Visual-material checklist

Treat visuals as first-class planning inputs. For each article, inspect and plan:

- reference inputs already present in `public/`
- screenshots or crop candidates from the editor workflow
- overlays already rendered by the canvas layer
- summary panels or tooltips that expose useful metrics
- diagrams that must be drawn from scratch to explain geometry, pipeline stages, or coordinate semantics

Do not leave visual decisions implicit. Each outline should say which visuals are needed and why.

## Missing-code branch

This workspace exposes the site, demos, Python API layer, and CV endpoint contracts. It may not contain the Rust crates or Python binding implementation behind the article topic.

If the article depends on implementation internals that are not in this workspace:
- search the workspace first
- ask the user for the external crate or binding path
- keep repo-local demo/API observations separate from external implementation observations
- avoid inventing Rust details from the API surface alone
