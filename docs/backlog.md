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

Phase 1 — Right Panel Mode System + Store Foundations

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-010 | todo | P1 | refactor | Add panelMode, runHistory, overlayVisibility to Zustand store | Implementer | New state groups: panelMode, runHistory, lastAlgorithmResult, overlayVisibility (replaces showFeatures). Extract types to editorTypes.ts if store exceeds ~500 lines. |
| EDITOR-011 | todo | P1 | refactor | Extract ConfigurePanel from EditorRightPanel | Implementer | Move hint card + algo picker + config form + run button into ConfigurePanel. EditorRightPanel becomes a thin mode-switching shell. Deps: EDITOR-010. |
| EDITOR-012 | todo | P1 | feature | Create ResultsPanel with summary, diagnostics placeholder, and feature list | Implementer | Run summary grid + FeatureListPanel + run history list + "Configure" back-button. Deps: EDITOR-010. |
| EDITOR-013 | todo | P1 | feature | Wire auto-transition, mode toggle, and run history recording | Implementer | Auto-switch to Results after successful run. Segmented control at top of right panel. Update left rail eye toggle to use overlayVisibility. Deps: EDITOR-011, EDITOR-012. |

## Backlog

Phase 2 — Algorithm Canvas Overlays

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-014 | todo | P1 | feature | Add OverlayComponent slot to AlgorithmDefinition and CanvasWorkspace | Implementer | Optional OverlayComponent on AlgorithmDefinition. Render between image and FeatureLayer in single Konva Layer. Deps: EDITOR-010. |
| EDITOR-015 | todo | P1 | feature | Build chessboard grid overlay (connect corners by row/col, color-coded) | Implementer | Group corners by grid.i/j, draw Konva Lines connecting rows and columns. Color-code. Board outline. Deps: EDITOR-014. |
| EDITOR-016 | todo | P2 | feature | Build charuco overlay (grid + marker bounding boxes) | Implementer | Grid lines + marker corner rectangles with markerId labels. Deps: EDITOR-014. |
| EDITOR-017 | todo | P2 | feature | Add overlay visibility toggle to left rail | Implementer | Expand eye toggle into layers popover: Features, Algorithm Overlay. Uses overlayVisibility store. Deps: EDITOR-014. |

Phase 3 — Diagnostics + Progressive Disclosure + Presets

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-018 | todo | P2 | feature | Add diagnostics interface and structured run status to ResultsPanel | Implementer | DiagnosticEntry {level, message, detail}. Optional diagnostics() on AlgorithmDefinition. Render in ResultsPanel. Deps: EDITOR-012. |
| EDITOR-019 | todo | P2 | feature | Add preset configurations to AlgorithmDefinition and ConfigurePanel | Implementer | presets record on AlgorithmDefinition. Preset picker dropdown in ConfigurePanel. Deps: EDITOR-011. |
| EDITOR-020 | todo | P2 | enhancement | Add progressive disclosure (CollapsibleSection) to config forms | Implementer | Shared CollapsibleSection in formFields.tsx. Wrap advanced params in all config forms. Deps: EDITOR-011. |

Phase 4 — Feature Model Extension

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-021 | todo | P2 | feature | Add PolygonFeature to feature model and Zod schema | Implementer | type "polygon", points: number[], closed. Add to Feature union + featureSchema. Independent. |
| EDITOR-022 | todo | P2 | feature | Add polygon renderer to FeatureLayer (closed Line with fill) | Implementer | Konva Line with closed=true, semi-transparent fill. Selection + drag. Deps: EDITOR-021. |
| EDITOR-023 | todo | P2 | feature | Add POLYGON drawing tool to left rail and CanvasWorkspace | Implementer | Similar to POLYLINE but closes on double-click. Add icon to left rail. Deps: EDITOR-021, EDITOR-022. |

Phase 5 — Deep Links + Blog Integration

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-024 | todo | P2 | feature | Deep link serialization: read/write URL params for algo+config+image | Implementer | Read URL params on mount. serializeConfig/deserializeConfig on AlgorithmDefinition. history.replaceState on change. Deps: EDITOR-019. |
| EDITOR-025 | todo | P2 | feature | Add blogSlug to AlgorithmDefinition, render "Learn more" links | Implementer | blogSlug field. "Learn more" link in ConfigurePanel pointing to /blog/{slug}. Independent. |
| EDITOR-026 | todo | P3 | feature | Add "Try in Editor" buttons in blog post content | Implementer | Standardized links to /editor?algo=...&image=... in blog markdown. Deps: EDITOR-024. |

Phase 6 — Responsive Layout + Touch Support

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-027 | todo | P2 | enhancement | Responsive breakpoints: stack panels vertically on narrow screens | Implementer | Below ~768px: canvas on top (60vh), right panel below. Left rail → bottom bar or hamburger. Deps: EDITOR-013. |
| EDITOR-028 | todo | P2 | enhancement | Left rail tooltips + touch-friendly tap targets (44x44px min) | Implementer | Proper tooltips on hover. Min 44x44px touch targets. Independent. |
| EDITOR-029 | todo | P3 | enhancement | Touch canvas: pinch-to-zoom, tap-to-select, single-finger pan | Implementer | Konva touch support. Pinch-to-zoom, tap-to-select features, pan in SELECT mode. Independent. |
| EDITOR-030 | todo | P3 | enhancement | Hide drawing tools on touch-only devices | Implementer | Detect no fine pointer. Hide POINT/LINE/POLYLINE/BBOX/ELLIPSE/POLYGON tools. Keep SELECT + zoom + visibility. Deps: EDITOR-028. |

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
