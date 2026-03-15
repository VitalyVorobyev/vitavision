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

Blog System — Phase 1: Foundation

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~BLOG-001~~ | done | P0 | infra | ~~Create content directory structure and frontmatter Zod schemas~~ | Implementer | `content/blog/`, `content/algorithms/`, `content/images/`; `src/lib/content/schema.ts` with Zod blog + algorithm schemas. |
| BLOG-002 | todo | P0 | infra | Build content processing pipeline (`scripts/content-build.ts`) | Implementer | gray-matter + Zod validate + markdown→HTML; generates `src/generated/content-manifest.ts`; add `content:build` script. Deps: BLOG-001. |
| BLOG-003 | todo | P0 | feature | Create BlogIndex page with post cards and tag filtering | Implementer | Replace placeholder Blog.tsx; PostCard, TagBadge, TagFilter components; sorted by date desc. Deps: BLOG-002. |
| BLOG-004 | todo | P0 | feature | Create BlogPost page with enhanced MarkdownRenderer | Implementer | Extend MarkdownRenderer with remark-gfm, rehype-sanitize, heading anchors; render pre-built HTML. Deps: BLOG-002. |
| BLOG-005 | todo | P0 | infra | Add blog routes to App.tsx and wire navigation | Implementer | `/blog`, `/blog/:slug` routes; update Navbar. Deps: BLOG-003, BLOG-004. |
| BLOG-006 | todo | P0 | infra | Build prerender postbuild script + SSR entry point | Implementer | `src/entry-server.tsx`, `scripts/postbuild.ts`; static HTML for blog routes via react-dom/server + StaticRouter. Deps: BLOG-005. |

Blog System — Phase 2: Discoverability

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| BLOG-007 | todo | P1 | feature | Add SEO head management (react-helmet-async) | Implementer | SeoHead component; per-page title, description, OG, Twitter cards on all blog pages. Deps: BLOG-005. |
| BLOG-008 | todo | P1 | feature | Add Schema.org BlogPosting structured data | Implementer | JSON-LD script tag in BlogPost; generated from frontmatter metadata. Deps: BLOG-007. |
| BLOG-009 | todo | P1 | infra | Generate sitemap.xml and robots.txt | Implementer | Add sitemap generation to postbuild; `public/robots.txt` pointing to sitemap. Deps: BLOG-006. |
| BLOG-010 | todo | P1 | infra | Generate RSS and Atom feeds | Implementer | Install `feed` package; generate `dist/rss.xml` + `dist/atom.xml`. Deps: BLOG-006. |
| BLOG-011 | todo | P1 | feature | Draft post support | Implementer | `draft: true` frontmatter field; excluded in prod build, shown with badge in dev. Deps: BLOG-002. |

Blog System — Phase 3: Authoring Quality

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| BLOG-012 | todo | P1 | feature | Client-side Mermaid rendering | Implementer | Add mermaid.js; render fenced mermaid blocks in browser. Build-time SVG deferred to future optimization. Deps: BLOG-004. |
| BLOG-013 | todo | P1 | enhancement | Image handling conventions and content image pipeline | Implementer | Copy `content/images/` to dist during build; resolve relative paths in markdown. Deps: BLOG-002. |
| BLOG-014 | todo | P1 | infra | Content validation CI job | Implementer | `content:validate` script + CI job; Zod validation, broken link check, image reference check. Deps: BLOG-002. |

Blog System — Phase 4: Refinement

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| BLOG-015 | todo | P2 | feature | Create AlgorithmIndex and AlgorithmPost pages | Implementer | `/algorithms`, `/algorithms/:slug` routes; add "Algorithms" to Navbar. Deps: BLOG-002, BLOG-004. |
| BLOG-016 | todo | P2 | feature | Algorithm/blog cross-linking | Implementer | Related posts/algorithms sections rendered from frontmatter. Deps: BLOG-015. |
| BLOG-017 | todo | P2 | enhancement | Prerender algorithm pages | Implementer | Extend postbuild for `/algorithms/*` routes. Deps: BLOG-015, BLOG-006. |
| BLOG-018 | todo | P2 | feature | Wire editor deep links (blogSlug, "Try in Editor") | Implementer | Connects to EDITOR-025/026. Deps: BLOG-015. |

## Backlog

Editor — Phase 1: Right Panel Mode System + Store Foundations (done)

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-010~~ | done | P1 | refactor | ~~Add panelMode, runHistory, overlayVisibility to Zustand store~~ | Implementer | New state groups: panelMode, runHistory, lastAlgorithmResult, overlayVisibility (replaces showFeatures). Extract types to editorTypes.ts if store exceeds ~500 lines. |
| ~~EDITOR-011~~ | done | P1 | refactor | ~~Extract ConfigurePanel from EditorRightPanel~~ | Implementer | Move hint card + algo picker + config form + run button into ConfigurePanel. EditorRightPanel becomes a thin mode-switching shell. Deps: EDITOR-010. |
| ~~EDITOR-012~~ | done | P1 | feature | ~~Create ResultsPanel with summary, diagnostics placeholder, and feature list~~ | Implementer | Run summary grid + FeatureListPanel + run history list + "Configure" back-button. Deps: EDITOR-010. |
| ~~EDITOR-013~~ | done | P1 | feature | ~~Wire auto-transition, mode toggle, and run history recording~~ | Implementer | Auto-switch to Results after successful run. Segmented control at top of right panel. Update left rail eye toggle to use overlayVisibility. Deps: EDITOR-011, EDITOR-012. |

Editor — Phase 2: Algorithm Canvas Overlays

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-014~~ | done | P1 | feature | ~~Add OverlayComponent slot to AlgorithmDefinition and CanvasWorkspace~~ | Implementer | Subsumed by EDITOR-033. |
| ~~EDITOR-015~~ | done | P1 | feature | ~~Build chessboard grid overlay (connect corners by row/col, color-coded)~~ | Implementer | Subsumed by EDITOR-033. |
| ~~EDITOR-016~~ | done | P2 | feature | ~~Build charuco overlay (grid + marker bounding boxes)~~ | Implementer | Subsumed by EDITOR-034. |
| EDITOR-017 | todo | P2 | feature | Add overlay visibility toggle to left rail | Implementer | Expand eye toggle into layers popover: Features, Algorithm Overlay. Uses overlayVisibility store. Deps: EDITOR-014. |

Editor — Phase 3: Diagnostics + Progressive Disclosure + Presets

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-018 | todo | P2 | feature | Add diagnostics interface and structured run status to ResultsPanel | Implementer | DiagnosticEntry {level, message, detail}. Optional diagnostics() on AlgorithmDefinition. Render in ResultsPanel. Deps: EDITOR-012. |
| EDITOR-019 | todo | P2 | feature | Add preset configurations to AlgorithmDefinition and ConfigurePanel | Implementer | presets record on AlgorithmDefinition. Preset picker dropdown in ConfigurePanel. Deps: EDITOR-011. |
| EDITOR-020 | todo | P2 | enhancement | Add progressive disclosure (CollapsibleSection) to config forms | Implementer | Shared CollapsibleSection in formFields.tsx. Wrap advanced params in all config forms. Deps: EDITOR-011. |

Editor — Phase 4: Feature Model Extension

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-021 | todo | P2 | feature | Add PolygonFeature to feature model and Zod schema | Implementer | type "polygon", points: number[], closed. Add to Feature union + featureSchema. Independent. |
| EDITOR-022 | todo | P2 | feature | Add polygon renderer to FeatureLayer (closed Line with fill) | Implementer | Konva Line with closed=true, semi-transparent fill. Selection + drag. Deps: EDITOR-021. |
| EDITOR-023 | todo | P2 | feature | Add POLYGON drawing tool to left rail and CanvasWorkspace | Implementer | Similar to POLYLINE but closes on double-click. Add icon to left rail. Deps: EDITOR-021, EDITOR-022. |

Editor — Phase 5: Deep Links + Blog Integration

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-024 | todo | P2 | feature | Deep link serialization: read/write URL params for algo+config+image | Implementer | Read URL params on mount. serializeConfig/deserializeConfig on AlgorithmDefinition. history.replaceState on change. Deps: EDITOR-019. |
| EDITOR-025 | todo | P2 | feature | Add blogSlug to AlgorithmDefinition, render "Learn more" links | Implementer | blogSlug field. "Learn more" link in ConfigurePanel pointing to /blog/{slug}. Independent. |
| EDITOR-026 | todo | P3 | feature | Add "Try in Editor" buttons in blog post content | Implementer | Standardized links to /editor?algo=...&image=... in blog markdown. Deps: EDITOR-024. |

Editor — Phase 6: Responsive Layout + Touch Support

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-027 | todo | P2 | enhancement | Responsive breakpoints: stack panels vertically on narrow screens | Implementer | Below ~768px: canvas on top (60vh), right panel below. Left rail → bottom bar or hamburger. Deps: EDITOR-013. |
| EDITOR-028 | todo | P2 | enhancement | Left rail tooltips + touch-friendly tap targets (44x44px min) | Implementer | Proper tooltips on hover. Min 44x44px touch targets. Independent. |
| EDITOR-029 | todo | P3 | enhancement | Touch canvas: pinch-to-zoom, tap-to-select, single-finger pan | Implementer | Konva touch support. Pinch-to-zoom, tap-to-select features, pan in SELECT mode. Independent. |
| EDITOR-030 | todo | P3 | enhancement | Hide drawing tools on touch-only devices | Implementer | Detect no fine pointer. Hide POINT/LINE/POLYLINE/BBOX/ELLIPSE/POLYGON tools. Keep SELECT + zoom + visibility. Deps: EDITOR-028. |

Editor — Phase 7: UX Improvements

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-031~~ | done | P1 | enhancement | ~~Grouped feature list with collapsible sections and keyboard navigation~~ | Implementer | Group by meta.kind/type, chevron collapse, arrow key nav, 0-based indices. |
| ~~EDITOR-032~~ | done | P1 | refactor | ~~Overlay data extraction utility (overlayData.ts)~~ | Implementer | buildCornerGrid, buildGridEdges, buildMarkerPolygons for canvas overlays. |
| ~~EDITOR-033~~ | done | P1 | feature | ~~Chessboard grid overlay with edge/label rendering~~ | Implementer | Subsumes EDITOR-014+015. OverlayComponent on AlgorithmDefinition, ChessboardOverlay, toggleable corners/edges/labels. |
| ~~EDITOR-034~~ | done | P1 | feature | ~~ChArUco + Marker Board overlays~~ | Implementer | Subsumes EDITOR-016. CharucoOverlay (grid+marker quads), MarkerboardOverlay (grid+circle outlines). |
| ~~EDITOR-035~~ | done | P2 | enhancement | ~~Resizable right panel with drag handle~~ | Implementer | Pointer-event drag on left edge, min 280px, max 600px, default 320px. |
| ~~EDITOR-036~~ | done | P2 | enhancement | ~~Inline tooltips for algorithm config fields~~ | Implementer | InfoTooltip component, tooltip prop on NumberField/CheckboxField/SelectField, all config forms annotated. |
| EDITOR-037 | todo | P3 | feature | Canvas config summary overlay | Implementer | Optional Konva text in canvas corner showing algo name + key config values. Deferred. |

Other

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-005~~ | done | P2 | enhancement | ~~Add richer readonly overlays for markers and circle matches~~ | Implementer | Subsumed by Phase 2 (EDITOR-014 through EDITOR-017). |
| DEV-002 | todo | P3 | enhancement | Add Vite dev server proxy for zero-config local API routing | Implementer | Would eliminate the need for the devCspPlugin by proxying /api/v1 through the Vite dev server. Requires backend to return relative local-upload URLs. |

## API / Interface Tracking

- `CV-001`: add `POST /api/v1/cv/calibration-targets/detect`.
  - Request is discriminated by `algorithm: "chessboard" | "charuco" | "markerboard"`.
  - Shared fields: `key`, `storage_mode`.
  - Algorithm-specific config blocks stay explicit rather than inferred.
- `CV-001`: response must always include `status`, `key`, `storage_mode`, `algorithm`, `image_width`, `image_height`, `frame`, `summary`, and `detection.corners`.
  - Optional fields: `markers`, `alignment`, `circle_candidates`, `circle_matches`.
  - Frame contract remains `image_px_center`, top-left origin, `x` right, `y` down, pixels.
- `EDITOR-001`: extend frontend API surface in `src/lib/api.ts` with `detectCalibrationTarget(...)` and typed request/response models matching the backend contract.
- `EDITOR-001`: extend editor state/contracts with `SampleId`, gallery sample metadata, and optional `Feature.meta`.
- `EDITOR-003`: curated gallery remains three sample cards, but the chessboard card must recommend both Chessboard and ChESS algorithms.

## Acceptance Scenarios (Attached to Tasks)

- `CV-001`: `chessboard.png` returns non-empty chessboard corners and explicit frame metadata.
- `CV-001`: `charuco.png` returns `kind="charuco"`, non-empty labeled corners, and non-empty markers using the bundled ChArUco preset.
- `CV-001`: `markerboard.png` returns `kind="checkerboard_marker"`, non-empty corners, and exactly three circle matches using the tuned preset.
- `EDITOR-002` and `EDITOR-003`: editor gallery shows three curated cards plus uploads; there is no fourth curated card for ChESS.
- `EDITOR-002` and `EDITOR-003`: selecting the chessboard sample explains both Chessboard and ChESS usage and seeds the recommended algorithm defaults appropriately.
- `EDITOR-002`: right rail has no tabs and is ordered as hint, algorithm, config, summary, features.
- `EDITOR-001` and `EDITOR-004`: running a calibration-target algorithm creates readonly features with metadata visible in the selected-feature panel.
- `EDITOR-002`: no visible public UI strings mention `R2`.

## Locked Defaults

- Guided example model:
  - Three curated sample cards: `chessboard.png`, `charuco.png`, `markerboard.png`.
  - Four guided contexts: Chessboard, ChArUco, Marker Board, ChESS.
  - Uploads are always available.
- Chessboard sample defaults:
  - `expected_rows = 7`
  - `expected_cols = 11`
  - `min_corner_strength = 0.2`
  - `completeness_threshold = 0.1`
- ChArUco board defaults from `public/board_charuco.json`:
  - `rows = 22`
  - `cols = 22`
  - `cell_size_mm = 4.8`
  - `marker_size_rel = 0.75`
  - `dictionary = DICT_4X4_1000`
  - initial sample default `px_per_square = 40`
- Marker Board defaults:
  - use `public/marker_detect_config.json` as the preset source,
  - allow translation/tuning to match the `calib-targets` Python API,
  - acceptance target remains exactly three circle matches on the bundled sample.
- Public UI copy:
  - storage behavior can remain automatic or local behind the scenes,
  - public-facing labels and hints must not mention `R2`.

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
| ~~BLOG-001~~ | 2026-03-15 | infra | ~~Create content directory structure and frontmatter Zod schemas~~ | content/blog/, content/algorithms/, content/images/ dirs; src/lib/content/schema.ts with Zod blog + algorithm schemas |
| ~~EDITOR-036~~ | 2026-03-15 | enhancement | ~~Inline tooltips for algorithm config fields~~ | InfoTooltip component; tooltip prop on all form fields; all 4 config forms annotated |
| ~~EDITOR-035~~ | 2026-03-15 | enhancement | ~~Resizable right panel with drag handle~~ | Pointer-event drag on left edge; min 280px, max 600px; overlay toggle panel |
| ~~EDITOR-034~~ | 2026-03-15 | feature | ~~ChArUco + Marker Board overlays~~ | CharucoOverlay (grid edges + marker quads with IDs); MarkerboardOverlay (grid + circle outlines by polarity) |
| ~~EDITOR-033~~ | 2026-03-15 | feature | ~~Chessboard grid overlay with edge/label rendering~~ | OverlayComponent slot on AlgorithmDefinition; ChessboardOverlay; GridEdgesGroup shared component; overlayToggles store |
| ~~EDITOR-032~~ | 2026-03-15 | refactor | ~~Overlay data extraction utility~~ | buildCornerGrid, buildGridEdges, buildMarkerPolygons in overlayData.ts |
| ~~EDITOR-031~~ | 2026-03-15 | enhancement | ~~Grouped feature list with keyboard navigation~~ | Collapsible groups by kind/type; arrow key cycling; 0-based indices |
| ~~EDITOR-016~~ | 2026-03-15 | feature | ~~Build charuco overlay~~ | Subsumed by EDITOR-034 |
| ~~EDITOR-015~~ | 2026-03-15 | feature | ~~Build chessboard grid overlay~~ | Subsumed by EDITOR-033 |
| ~~EDITOR-014~~ | 2026-03-15 | feature | ~~Add OverlayComponent slot to AlgorithmDefinition~~ | Subsumed by EDITOR-033 |
| ~~EDITOR-013~~ | 2026-03-15 | feature | ~~Wire auto-transition, mode toggle, and run history recording~~ | Auto-transition to results after run; segmented Configure/Results toggle; left rail eye uses overlayVisibility |
| ~~EDITOR-012~~ | 2026-03-15 | feature | ~~Create ResultsPanel with summary, diagnostics placeholder, and feature list~~ | ResultsPanel (122 lines) with summary grid, diagnostics placeholder, run history list, and Configure back-button |
| ~~EDITOR-011~~ | 2026-03-15 | refactor | ~~Extract ConfigurePanel from EditorRightPanel~~ | ConfigurePanel (247 lines) + RailSection (13 lines) extracted; EditorRightPanel now 21-line mode-switching shell |
| ~~EDITOR-010~~ | 2026-03-15 | refactor | ~~Add panelMode, runHistory, overlayVisibility to Zustand store~~ | Store extended with panelMode, runHistory, lastAlgorithmResult, overlayVisibility; backward-compatible showFeatures wrapper |
| ~~DOCS-001~~ | 2026-03-15 | docs | ~~Update editor and backend documentation for calibration targets~~ | `docs/backend.md` created; README.dev.md expanded with charuco/markerboard smoke tests and sample-defaults table |
| ~~QA-001~~ | 2026-03-15 | test | ~~Add regression coverage for bundled samples and editor workflow~~ | conftest.py session-scoped fixture fixes test isolation; all 24 tests pass on repeated runs |
| ~~TEST-001~~ | 2026-03-15 | test | ~~Add API key enforcement tests and Python quality gates in CI~~ | 6 auth tests (401/403); `lint-backend` CI job (ruff + mypy); pre-existing lint/type violations fixed |
| ~~DEV-001~~ | 2026-03-15 | fix | ~~Fix local dev — relax CSP via Vite plugin (dev mode only)~~ | `devCspPlugin` in `vite.config.ts` adds `localhost:8000` and `worker-src blob:` in `serve` mode only; production build untouched |
| ~~CV-001~~ | 2026-03-14 | feature | ~~Add unified calibration-target detection API~~ | `POST /api/v1/cv/calibration-targets/detect`; all 3 acceptance scenarios pass |
| ~~CV-002~~ | 2026-03-14 | feature | ~~Add fully editable Chessboard, ChArUco, and Marker Board config surfaces~~ | ChArUco gains chessboard+graph sub-params; Marker Board gains graph+circleScore sub-params; all seeded from public preset JSON |
| ~~EDITOR-001~~ | 2026-03-14 | feature | ~~Add sample-aware editor state and calibration client contracts~~ | Chessboard, ChArUco, Marker Board plugins registered; sampleDefaults wired in AlgorithmPanel |
| ~~EDITOR-002~~ | 2026-03-14 | feature | ~~Replace editor tabs with guided workflow rail~~ | Tabs removed; single scrollable rail (hint → algorithm → config → run+summary → features); R2 mentions removed from UI |
| ~~EDITOR-003~~ | 2026-03-14 | feature | ~~Wire curated examples and algorithm recommendations~~ | ChESS adapter title fixed to "ChESS Corners"; all recommendation buttons now resolve correctly |
| ~~EDITOR-004~~ | 2026-03-14 | feature | ~~Show algorithm metadata in selected feature details~~ | Metadata section added to selected-feature card; grid coords, ids, score, target position, marker/circle fields displayed |
