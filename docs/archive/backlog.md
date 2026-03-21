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
| ~~BLOG-002~~ | done | P0 | infra | ~~Build content processing pipeline (`scripts/content-build.ts`)~~ | Implementer | gray-matter + Zod validate + markdown→HTML; generates `src/generated/content-manifest.ts`; add `content:build` script. Deps: BLOG-001. |
| ~~BLOG-003~~ | done | P0 | feature | ~~Create BlogIndex page with post cards and tag filtering~~ | Implementer | Replace placeholder Blog.tsx; PostCard, TagBadge, TagFilter components; sorted by date desc. Deps: BLOG-002. |
| ~~BLOG-004~~ | done | P0 | feature | ~~Create BlogPost page with enhanced MarkdownRenderer~~ | Implementer | Extend MarkdownRenderer with remark-gfm, rehype-sanitize, heading anchors; render pre-built HTML. Deps: BLOG-002. |
| ~~BLOG-005~~ | done | P0 | infra | ~~Add blog routes to App.tsx and wire navigation~~ | Implementer | `/blog`, `/blog/:slug` routes; update Navbar. Deps: BLOG-003, BLOG-004. |
| ~~BLOG-006~~ | done | P0 | infra | ~~Build prerender postbuild script + SSR entry point~~ | Implementer | `src/entry-server.tsx`, `scripts/postbuild.ts`; static HTML for blog routes via react-dom/server + MemoryRouter. Deps: BLOG-005. |

Blog System — Phase 2: Discoverability

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~BLOG-007~~ | done | P1 | feature | ~~Add SEO head management (react-helmet-async)~~ | Implementer | SeoHead component; per-page title, description, OG, Twitter cards on all blog pages. Deps: BLOG-005. |
| ~~BLOG-008~~ | done | P1 | feature | ~~Add Schema.org BlogPosting structured data~~ | Implementer | JSON-LD script tag in BlogPost; generated from frontmatter metadata. Deps: BLOG-007. |
| ~~BLOG-009~~ | done | P1 | infra | ~~Generate sitemap.xml and robots.txt~~ | Implementer | Add sitemap generation to postbuild; `public/robots.txt` pointing to sitemap. Deps: BLOG-006. |
| ~~BLOG-010~~ | done | P1 | infra | ~~Generate RSS and Atom feeds~~ | Implementer | Install `feed` package; generate `dist/rss.xml` + `dist/atom.xml`. Deps: BLOG-006. |
| ~~BLOG-011~~ | done | P1 | feature | ~~Draft post support~~ | Implementer | `draft: true` frontmatter field; excluded in prod build, shown with badge in dev. Deps: BLOG-002. |

Blog System — Phase 3: Authoring Quality

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~BLOG-012~~ | done | P1 | feature | ~~Client-side Mermaid rendering~~ | Implementer | Add mermaid.js; render fenced mermaid blocks in browser. Build-time SVG deferred to future optimization. Deps: BLOG-004. |
| ~~BLOG-013~~ | done | P1 | enhancement | ~~Image handling conventions and content image pipeline~~ | Implementer | Copy `content/images/` to dist during build; resolve relative paths in markdown. Deps: BLOG-002. |
| ~~BLOG-014~~ | done | P1 | infra | ~~Content validation CI job~~ | Implementer | `content:validate` script + CI job; Zod validation, broken link check, image reference check. Deps: BLOG-002. |

Blog System — Phase 4: Refinement

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~BLOG-015~~ | done | P2 | feature | ~~Create AlgorithmIndex and AlgorithmPost pages~~ | Implementer | `/algorithms`, `/algorithms/:slug` routes; add "Algorithms" to Navbar. Deps: BLOG-002, BLOG-004. |
| ~~BLOG-016~~ | done | P2 | feature | ~~Algorithm/blog cross-linking~~ | Implementer | Related posts/algorithms sections rendered from frontmatter. Deps: BLOG-015. |
| ~~BLOG-017~~ | done | P2 | enhancement | ~~Prerender algorithm pages~~ | Implementer | Extend postbuild for `/algorithms/*` routes. Deps: BLOG-015, BLOG-006. |
| ~~BLOG-018~~ | done | P2 | feature | ~~Wire editor deep links (blogSlug, "Try in Editor")~~ | Implementer | Connects to EDITOR-025/026. Deps: BLOG-015. |

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

Target Generator — Phase 1: Backend API

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-001~~ | done | P0 | feature | ~~Add `POST /api/v1/cv/calibration-targets/generate` endpoint~~ | Implementer | Discriminated union request (chessboard/charuco/markerboard). Returns SVG text + JSON config + optional PNG base64. Paper config with A4/Letter/custom. 422 when board doesn't fit page. Rate limit 30/min. File: `backend/routers/cv.py`. |
| ~~TGEN-002~~ | done | P0 | test | ~~Add generation endpoint tests~~ | Implementer | 9 tests: all 3 target types, paper validation (board too large), PNG inclusion, invalid dictionary, custom page. File: `backend/tests/test_generate_target.py`. Deps: TGEN-001. |

Target Generator — Phase 2: Frontend Scaffold & Config

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-003~~ | done | P0 | feature | ~~Create TargetGenerator page with three-panel layout and routing~~ | Implementer | `src/pages/TargetGenerator.tsx` + route in `App.tsx`. Three-panel full-height layout. `useReducer` state. Types in `src/components/targetgen/types.ts`. API function in `api.ts`. Navbar link. Hide footer on `/tools/*`. |
| ~~TGEN-004~~ | done | P0 | feature | ~~Build target type selector and config panels~~ | Implementer | Left panel: `TargetTypeSelector.tsx` with 3 target type cards. Right panel: `TargetConfigPanel.tsx` dispatching to `ChessboardGenConfig`, `CharucoGenConfig`, `MarkerBoardGenConfig`. Shared `PaperConfig.tsx`. Reuses `formFields.tsx` components. |

Target Generator — Phase 3: Preview & Downloads

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-005~~ | done | P0 | feature | ~~Build SVG preview with zoom/pan and client-side generation~~ | Implementer | Center panel: `TargetPreview.tsx`. Client-side SVG for chessboard/markerboard (instant). ChArUco shows gray placeholder preview. CSS transform zoom/pan. Validation overlay. |
| ~~TGEN-006~~ | done | P0 | feature | ~~Build download bar (SVG, PNG, JSON) with client-side rasterization~~ | Implementer | `DownloadBar.tsx`. Client-side PNG via canvas rasterization at 300 DPI. Backend called only for charuco final SVG. Blob download via `URL.createObjectURL`. |

Target Generator — Phase 4: Polish

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-007~~ | done | P1 | feature | ~~Add preset configurations and JSON config import~~ | Implementer | 9 curated presets (3 per type). Preset picker dropdown + JSON import button in left panel. |
| ~~TGEN-008~~ | done | P1 | enhancement | ~~UX polish: client-side validation, board dimension display, tooltips~~ | Implementer | Board/page/printable dimension overlay in preview. Tooltips on all config fields including paper settings. |

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

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
| ~~TGEN-008~~ | 2026-03-16 | enhancement | ~~UX polish: dimension overlay, tooltips~~ | Board/page dimension overlay; tooltips on all config fields |
| ~~TGEN-007~~ | 2026-03-16 | feature | ~~Add preset configurations and JSON config import~~ | 9 curated presets; preset picker; JSON import button |
| ~~TGEN-006~~ | 2026-03-16 | feature | ~~Build download bar (SVG, PNG, JSON)~~ | Client-side PNG rasterization; backend only for charuco; blob downloads |
| ~~TGEN-005~~ | 2026-03-16 | feature | ~~Build SVG preview with zoom/pan~~ | Client-side SVG for chessboard/markerboard; charuco placeholder preview; CSS zoom/pan |
| ~~TGEN-004~~ | 2026-03-16 | feature | ~~Build target type selector and config panels~~ | 3 target type cards; type-specific config forms; shared PaperConfig; reuses formFields.tsx |
| ~~TGEN-003~~ | 2026-03-16 | feature | ~~Create TargetGenerator page with routing~~ | Three-panel layout; /tools/target-generator route; useReducer state; Navbar "Tools" link |
| ~~TGEN-002~~ | 2026-03-16 | test | ~~Add generation endpoint tests~~ | 9 tests covering all target types, PNG, validation, custom pages |
| ~~TGEN-001~~ | 2026-03-16 | feature | ~~Add calibration target generation endpoint~~ | POST /api/v1/cv/calibration-targets/generate; chessboard/charuco/markerboard; SVG+JSON+PNG |
| ~~BLOG-018~~ | 2026-03-16 | feature | ~~Wire editor deep links (blogSlug, "Try in Editor")~~ | blogSlug field on AlgorithmDefinition; "Learn more" link in ConfigurePanel |
| ~~BLOG-017~~ | 2026-03-16 | enhancement | ~~Prerender algorithm pages~~ | Algorithm pages in postbuild SSR + sitemap |
| ~~BLOG-016~~ | 2026-03-16 | feature | ~~Algorithm/blog cross-linking~~ | RelatedPosts component; relatedAlgorithms blog field; relatedPosts rendered |
| ~~BLOG-015~~ | 2026-03-16 | feature | ~~Create AlgorithmIndex and AlgorithmPost pages~~ | /algorithms routes; Navbar link; tag filtering; Mermaid support |
| ~~BLOG-014~~ | 2026-03-16 | infra | ~~Content validation CI job~~ | content:validate script + validate-content CI job; Zod, image refs, internal links |
| ~~BLOG-013~~ | 2026-03-16 | enhancement | ~~Image handling conventions and content image pipeline~~ | Relative path resolution in content-build; content/images/ copy in postbuild |
| ~~BLOG-012~~ | 2026-03-16 | feature | ~~Client-side Mermaid rendering~~ | Dynamic import mermaid.js; useMermaid hook renders fenced blocks as SVG |
| ~~BLOG-011~~ | 2026-03-16 | feature | ~~Draft post support~~ | INCLUDE_DRAFTS env var; amber "DRAFT" badge in PostCard and BlogPost |
| ~~BLOG-010~~ | 2026-03-16 | infra | ~~Generate RSS and Atom feeds~~ | feed package; rss.xml + atom.xml during postbuild; autodiscovery links in index.html |
| ~~BLOG-009~~ | 2026-03-16 | infra | ~~Generate sitemap.xml and robots.txt~~ | Sitemap generated during postbuild; static robots.txt; SITE_URL env var |
| ~~BLOG-008~~ | 2026-03-16 | feature | ~~Add Schema.org BlogPosting structured data~~ | JSON-LD script tag in BlogPost + postbuild injection from frontmatter |
| ~~BLOG-007~~ | 2026-03-15 | feature | ~~Add SEO head management (react-helmet-async)~~ | SeoHead component; per-page title, description, OG, Twitter cards; postbuild head injection |
| ~~BLOG-006~~ | 2026-03-15 | infra | ~~Build prerender postbuild script + SSR entry point~~ | entry-server.tsx + postbuild.ts; MemoryRouter SSR for blog routes |
| ~~BLOG-005~~ | 2026-03-15 | infra | ~~Add blog routes to App.tsx and wire navigation~~ | `/blog/:slug` route added; Navbar already wired |
| ~~BLOG-004~~ | 2026-03-15 | feature | ~~Create BlogPost page with enhanced MarkdownRenderer~~ | Pre-built HTML rendering; rehype-slug heading anchors; metadata header; repo/demo links |
| ~~BLOG-003~~ | 2026-03-15 | feature | ~~Create BlogIndex page with post cards and tag filtering~~ | PostCard, TagBadge, TagFilter components; tag-based filtering |
| ~~BLOG-002~~ | 2026-03-15 | infra | ~~Build content processing pipeline~~ | scripts/content-build.ts; gray-matter + Zod + unified; generates src/generated/content-manifest.ts |
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
