# Backlog

## Status Values
- `todo` — not started
- `in-progress` — actively being worked
- `blocked` — waiting on something
- `done` — completed

## Priority Values
- `P0` — blocking release or correctness
- `P1` — next up
- `P2` — planned
- `P3` — someday

## ID Model
- Backlog ids (`INFRA-011`, `ALGO-014`, `DOCS-003`) are the stable planning ids used in this file.
- Workflow handoff ids (`TASK-012-...`) are execution-trace ids used under `docs/handoffs/`.
- Handoff reports should record both ids when the work came from the backlog.

---

## Active Sprint

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|

## Up Next


## Backlog

Editor — Phase 2: Algorithm Canvas Overlays

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-017~~ | done | P2 | feature | ~~Add overlay visibility toggle to left rail~~ | Implementer | Layers popover with Features + Algorithm Overlay toggles. |

Editor — Phase 3: Diagnostics + Progressive Disclosure + Presets

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-018~~ | done | P2 | feature | ~~Add diagnostics interface and structured run status to ResultsPanel~~ | Implementer | DiagnosticEntry with info/warning/error levels. All 4 adapters provide diagnostics. |
| ~~EDITOR-019~~ | done | P2 | feature | ~~Add preset configurations to AlgorithmDefinition and ConfigurePanel~~ | Implementer | AlgorithmPreset type, presets on all 4 adapters, PresetPicker UI. |
| ~~EDITOR-020~~ | done | P2 | enhancement | ~~Add progressive disclosure (CollapsibleSection) to config forms~~ | Implementer | CollapsibleSection in formFields.tsx. Advanced params collapsed in Chessboard, ChArUco, MarkerBoard. |

Editor — Phase 4: Feature Model Extension

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-021~~ | done | P2 | feature | ~~Add PolygonFeature to feature model and Zod schema~~ | Implementer | PolygonFeature with points[] + closed. Added to union + Zod + groups. |
| ~~EDITOR-022~~ | done | P2 | feature | ~~Add polygon renderer to FeatureLayer (closed Line with fill)~~ | Implementer | Closed Konva Line with semi-transparent purple fill. Selection + drag. |
| ~~EDITOR-023~~ | done | P2 | feature | ~~Add POLYGON drawing tool to left rail and CanvasWorkspace~~ | Implementer | Click vertices, double-click to close. Pentagon icon on left rail. |

Editor — Phase 5: Deep Links + Blog Integration

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-024~~ | done | P2 | feature | ~~Deep link serialization: read/write URL params for algo+config+image~~ | Implementer | useEditorDeepLink hook. URL params: algo, config (base64url JSON), sample. history.replaceState on change. |
| ~~EDITOR-025~~ | done | P2 | feature | ~~Add blogSlug to AlgorithmDefinition, render "Learn more" links~~ | Implementer | blogSlug already in type + ConfigurePanel UI. Set on chess-corners adapter. |
| ~~EDITOR-026~~ | done | P3 | feature | ~~Add "Try in Editor" buttons in blog post content~~ | Implementer | Deep link in 00-intro.md pointing to /editor?algo=chess-corners&sample=chessboard. |

Editor — Phase 6: Responsive Layout + Touch Support

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-027~~ | done | P2 | enhancement | ~~Responsive breakpoints: stack panels vertically on narrow screens~~ | Implementer | useNarrowViewport(768). Vertical stack: canvas 60vh + horizontal toolbar + right panel below. |
| ~~EDITOR-028~~ | done | P2 | enhancement | ~~Left rail Radix tooltips + touch-friendly tap targets (44x44px min)~~ | Implementer | @radix-ui/react-tooltip. Tooltip component in ui/Tooltip.tsx. 44x44px min touch targets. |
| ~~EDITOR-029~~ | done | P3 | enhancement | ~~Touch canvas: pinch-to-zoom, tap-to-select, single-finger pan~~ | Implementer | Two-finger pinch-to-zoom via Konva onTouchMove. Single-finger drag in SELECT mode (existing). |
| ~~EDITOR-030~~ | done | P3 | enhancement | ~~Hide drawing tools on touch-only devices~~ | Implementer | useTouchOnly() hook (pointer: fine media query). Hides annotation tools section. |

Blog — Content

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~BLOG-001~~ | done | P2 | content | ~~Add frontmatter + polish 00-intro.md~~ | Author | YAML frontmatter, content:build populates manifest. |
| ~~BLOG-002~~ | done | P2 | content | ~~Add frontmatter to 01-chess.md (draft)~~ | Author | Marked draft: true. Full outline for ChESS Corners article. |

Target Generator — Future

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-009~~ | done | P2 | feature | ~~Add ring grid target type (client-side SVG)~~ | Implementer | Hex-lattice concentric ring markers with 16-sector code bands. Codebook loader, layout generator, SVG/DXF export, config panel, 3 presets. |
| ~~TGEN-023~~ | done | P2 | feature | ~~Add scale line to all target types~~ | Implementer | Minimal reference bar with label. Optional toggle in Paper config (default ON). SVG + DXF. |
| ~~TGEN-010~~ | done | P2 | feature | ~~Add ZIP bundle download (all artifacts in one file)~~ | Implementer | Client-side JSZip. Bundles SVG + PNG + JSON + DXF. Full-width "Download All (ZIP)" button. |
| ~~TGEN-011~~ | done | P2 | feature | ~~Prerender target generator page for SEO~~ | Implementer | SSR stub in entry-server.tsx. Added to postbuild.ts + sitemap. |

Frontend Quality

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| FE-001 | todo | P1 | feature | Add React Error Boundaries for canvas, config, and content | Implementer | Wrap CanvasWorkspace, ConfigurePanel adapter rendering, blog/algo post content. Fallback UI with retry. |
| FE-002 | todo | P1 | infra | Set up Vitest and add unit tests for core logic | Implementer | Configure vitest. Tests for: Zustand store actions, featureSchema validation, target generator reducer, adapter toFeatures/summary. |
| FE-003 | todo | P2 | enhancement | Replace alert() calls with sonner toast notifications | Implementer | Install sonner. Replace 5 alert() calls: EditorGallery:50, featureIo:74+80, TargetTypeSelector:63+66. Add Toaster to App. |
| FE-004 | todo | P2 | fix | Add error handling to useTargetGenerator and ConfigurePanel handleRun | Implementer | .catch() on generatePreviewSvg promise in useTargetGenerator.ts:17. try/catch around toFeatures/summary in ConfigurePanel.tsx:123-138. |
| FE-005 | todo | P2 | feature | Add catch-all 404 page | Implementer | `<Route path="*" />` in App.tsx. Simple NotFound component with link home. |
| FE-006 | todo | P3 | enhancement | Add route-level code splitting with React.lazy | Implementer | Lazy-load Editor, TargetGenerator, Blog, AlgorithmIndex pages. Suspense with spinner fallback. |
| FE-007 | todo | P3 | refactor | Extract drawing handlers from CanvasWorkspace into hooks | Implementer | Split 734-line CanvasWorkspace.tsx: useDrawingHandlers, useCanvasGestures, usePixelSampler. |

Other

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| DEV-002 | todo | P3 | enhancement | Add Vite dev server proxy for zero-config local API routing | Implementer | Deferred — current CSP plugin works. Would eliminate devCspPlugin by proxying /api/v1. |

## API / Interface Tracking

## Acceptance Scenarios (Attached to Tasks)

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
| EDITOR-017 | 2026-03-20 | feature | Add overlay visibility toggle to left rail | Layers popover for Features + Algorithm Overlay. |
| EDITOR-018 | 2026-03-20 | feature | Add diagnostics interface to ResultsPanel | DiagnosticEntry with info/warning/error levels. |
| EDITOR-019 | 2026-03-20 | feature | Add preset configurations to ConfigurePanel | AlgorithmPreset type + PresetPicker UI. |
| EDITOR-020 | 2026-03-20 | enhancement | Add CollapsibleSection to config forms | Progressive disclosure for advanced parameters. |
| EDITOR-021 | 2026-03-20 | feature | Add PolygonFeature to feature model and Zod schema | PolygonFeature with points[] + closed. |
| EDITOR-022 | 2026-03-20 | feature | Add polygon renderer to FeatureLayer | Closed Konva Line with semi-transparent fill. |
| EDITOR-023 | 2026-03-20 | feature | Add POLYGON drawing tool to left rail and CanvasWorkspace | Click vertices, dblClick to close. |
| EDITOR-024 | 2026-03-20 | feature | Deep link serialization for editor | useEditorDeepLink hook with URL param sync. |
| EDITOR-025 | 2026-03-20 | feature | blogSlug on chess-corners adapter | "Learn more" link in ConfigurePanel. |
| EDITOR-026 | 2026-03-20 | feature | "Try in Editor" link in blog content | Deep link in 00-intro.md. |
| EDITOR-027 | 2026-03-20 | enhancement | Responsive breakpoints for editor | Vertical stack layout below 768px. |
| EDITOR-028 | 2026-03-20 | enhancement | Radix tooltips + 44px touch targets | @radix-ui/react-tooltip on all toolbar buttons. |
| EDITOR-029 | 2026-03-20 | enhancement | Touch canvas support | Pinch-to-zoom via Konva touch handlers. |
| EDITOR-030 | 2026-03-20 | enhancement | Hide drawing tools on touch-only | useTouchOnly() media query hook. |
| BLOG-001 | 2026-03-20 | content | Add frontmatter to 00-intro.md | Blog manifest now populated. |
| BLOG-002 | 2026-03-20 | content | Add frontmatter to 01-chess.md | Draft outline with repoLinks + relatedAlgorithms. |
| TGEN-010 | 2026-03-20 | feature | ZIP bundle download | JSZip bundles all 4 formats. |
| TGEN-011 | 2026-03-20 | feature | Prerender target generator | SSR stub + sitemap entry. |
| TGEN-012 | 2026-03-16 | fix | Fix default page orientation (portrait → landscape) | Changed INITIAL_STATE + presets. |
| TGEN-013 | 2026-03-16 | feature | ArUco dictionary loader + hex-to-bitgrid decoder | New aruco/ module with loader, decoder, types. |
| TGEN-014 | 2026-03-16 | feature | Client-side ChArUco SVG generation | Full marker rendering, removed backend dependency for generation. |
| TGEN-015 | 2026-03-16 | cleanup | Remove backend generate endpoint | Removed generate endpoint + frontend API types. calib_targets kept for detection. |
| TGEN-016 | 2026-03-16 | feature | MarkerBoard circle config — data model + list editor | circles[] in config, table editor with add/remove/polarity, validation, centered default triangle. |
| TGEN-018 | 2026-03-16 | feature | DXF export for all target types | Minimal DXF R12 writer. Geometry only. Added DXF button to download bar. |
| TGEN-017 | 2026-03-16 | feature | MarkerBoard interactive circle placement on canvas | Click squares on preview to toggle circles. Auto-polarity from square color. |
| TGEN-019 | 2026-03-16 | enhancement | Remove Generate button, use preview as final SVG | All generation is client-side; preview = final. Downloads use previewSvg directly. |
| TGEN-020 | 2026-03-16 | feature | Auto circle polarity from square color | Removed polarity from CircleSpec. White circle on black square, black on white. |
| TGEN-021 | 2026-03-16 | feature | Configurable PNG DPI | Added pngDpi to PageConfig. Exposed in Paper config panel (72–1200). |
| TGEN-022 | 2026-03-16 | feature | Inner white square in black squares (laser calibration) | innerSquareRel (0–0.95) on all target types. For reflective surface calibration. |
| TGEN-009 | 2026-03-20 | feature | Add ring grid target type (client-side SVG) | Hex-lattice concentric ring markers with 16-sector code bands. Baseline + extended codebook profiles. |
| TGEN-023 | 2026-03-20 | feature | Add scale line to all target types | Minimal reference bar with label. Optional toggle (default ON). SVG + DXF integration. |
