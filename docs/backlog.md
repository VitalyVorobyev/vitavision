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

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|

## Backlog

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-005 | todo | P2 | enhancement | Add richer readonly overlays for markers and circle matches | Implementer | Keep out of the first slice unless point-only overlays prove insufficient. |
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
