# Calibration Targets Expansion Plan

## Goal

Extend the existing editor/backend workflow so the app supports:

- existing `Chess Corners` feature detection,
- new `calib-targets` Chessboard detection,
- new `calib-targets` ChArUco detection,
- new `calib-targets` Marker Board detection.

This should improve the editor UX, keep uploads available, and remove public UI references to the storage vendor.

## Clarified Example Model

The correct user-facing model is:

- curated sample images remain `chessboard.png`, `charuco.png`, and `markerboard.png`,
- uploads remain available at all times,
- the guided example contexts are four:
  - Chessboard detection,
  - ChArUco detection,
  - Marker Board detection,
  - ChESS corner detection,
- Chessboard detection and ChESS corner detection share the same `chessboard.png` sample and should be presented as one merged sample context with two algorithm recommendations.

This means the gallery should still show three curated sample cards, not four.

## Desired End State

### Backend

Add one new endpoint:

- `POST /api/v1/cv/calibration-targets/detect`

Request shape:

- discriminated by `algorithm: "chessboard" | "charuco" | "markerboard"`,
- shared fields:
  - `key`,
  - `storage_mode`,
- algorithm-specific config:
  - Chessboard:
    - shared ChESS-style detector config,
    - chessboard detector parameters such as `expected_rows`, `expected_cols`, `min_corner_strength`, `completeness_threshold`, and orientation clustering options.
  - ChArUco:
    - board definition from `public/board_charuco.json`,
    - optional `px_per_square`,
    - chessboard detector tuning,
    - graph tuning,
    - scan tuning,
    - `max_hamming`,
    - `min_marker_inliers`.
  - Marker Board:
    - board/layout definition derived from `public/marker_detect_config.json`,
    - chessboard detector tuning,
    - graph tuning,
    - circle score tuning,
    - circle match tuning,
    - optional ROI cells.

Response shape:

- always include:
  - `status`,
  - `key`,
  - `storage_mode`,
  - `algorithm`,
  - `image_width`,
  - `image_height`,
  - `frame`,
  - `summary`,
  - `detection.corners`,
- optional algorithm-specific sections:
  - `markers`,
  - `alignment`,
  - `circle_candidates`,
  - `circle_matches`.

Frame semantics must stay explicit and unchanged from the current CV API:

- frame name `image_px_center`,
- top-left origin,
- `x` right,
- `y` down,
- pixel units.

No new storage behavior is needed. The existing upload-ticket and storage resolution flow stays as-is.

### Frontend

The editor should evolve to:

- show one right-side workflow rail instead of tabs,
- put algorithm choice first,
- keep features below the algorithm controls,
- show sample-specific hints,
- hide public references to `R2`,
- support fully editable config forms for Chessboard, ChArUco, and Marker Board.

The right rail should be ordered as:

1. sample context / hint card,
2. algorithm selection,
3. config form,
4. run action and run summary,
5. feature list and selected feature details.

Sample guidance should work like this:

- `chessboard.png`
  - primary recommendation: Chessboard,
  - secondary recommendation: ChESS Corners,
  - hint should explain when to use each and which settings to tweak.
- `charuco.png`
  - recommendation: ChArUco,
  - hint should point at `px_per_square`, graph spacing, `max_hamming`, and `min_marker_inliers`.
- `markerboard.png`
  - recommendation: Marker Board,
  - hint should point at circle positions/polarities, graph spacing, patch size, and minimum contrast.
- uploaded images
  - generic hint only,
  - tell the user to choose the matching detector and set board/layout fields first.

Feature mapping should be:

- keep `Chess Corners` as readonly `directed_point` features,
- map calibration-target corners to readonly `point` features,
- extend feature metadata so selected features can show grid coords, ids, score, and target position,
- richer marker/circle overlays remain optional and can stay out of the first implementation slice.

## Sample Defaults To Lock

### Chessboard

Use `chessboard.png` with defaults equivalent to:

- `expected_rows = 7`,
- `expected_cols = 11`,
- `min_corner_strength = 0.2`,
- `completeness_threshold = 0.1`.

### ChArUco

Use `public/board_charuco.json` as authoritative board geometry:

- `rows = 22`,
- `cols = 22`,
- `cell_size_mm = 4.8`,
- `marker_size_rel = 0.75`,
- `dictionary = DICT_4X4_1000`.

Initial sample defaults should also include:

- `px_per_square = 40`,
- graph spacing in the working range already observed during probing.

### Marker Board

Use `public/marker_detect_config.json` as the starting preset source, but allow translation/tuning to match the Python API.

Acceptance for the sample preset should be:

- response `kind = "checkerboard_marker"`,
- non-empty detected corners,
- exactly three circle matches on the bundled sample.

## Intended Roadmap

### Phase 1

- finalize the backend contract for `calibration-targets/detect`,
- keep explicit frame semantics,
- add sample-based backend tests for the three curated images.

### Phase 2

- add frontend API types and adapters,
- extend editor store/gallery metadata for sample context,
- add feature metadata support.

### Phase 3

- replace the right-panel tabs with the single workflow rail,
- add sample hint card,
- add algorithm selection and sample default loading,
- remove visible `R2` strings from the public UI and sanitize surfaced storage errors.

### Phase 4

- add full editable config forms for Chessboard, ChArUco, and Marker Board,
- wire the three new algorithms into the editor,
- keep ChESS available on the chessboard sample as an alternative detector.

### Phase 5

- optional richer overlays for markers/circle matches,
- docs/backlog cleanup and broader regression coverage.

## Changes Already Made In This Run

The following changes were already introduced in the working tree before this document was requested:

### Backend

- `backend/routers/cv.py`
  - added `calib_targets` import,
  - added large request/response model surface for a new calibration-targets endpoint,
  - added conversion helpers and a new `POST /api/v1/cv/calibration-targets/detect` implementation,
  - added finite-number guards and empty-response handling for non-detected targets.
- `backend/tests/test_api.py`
  - added sample-based tests for:
    - Chessboard,
    - ChArUco,
    - Marker Board.

### Frontend Data/Contracts

- `src/lib/api.ts`
  - added TypeScript request/response types for the new calibration-target endpoint,
  - added payload mapping helpers,
  - added `detectCalibrationTarget(...)`.
- `src/store/editor/useEditorStore.ts`
  - added `SampleId`,
  - added richer `FeatureMeta`,
  - changed gallery sample initialization to the new curated sample images,
  - added `imageSampleId` and sample-aware gallery metadata.
- `src/store/editor/featureSchema.ts`
  - extended exported feature schema with optional metadata fields.
- `src/components/editor/algorithms/types.ts`
  - added `sampleDefaults` support to algorithm definitions.

### New Untracked Helper Files

- `src/components/editor/algorithms/formFields.tsx`
  - started a shared config-form controls module.
- `src/components/editor/algorithms/calibrationTargets/shared.ts`
  - started shared mapping helpers for summary/corner/marker/circle-candidate features.

## Important Status Note

Those changes are partial and should be treated as work-in-progress, not as a finished implementation.

What is still missing:

- the frontend is not yet wired to the new backend endpoint,
- the right-rail redesign is not implemented,
- the new config forms are not wired into actual algorithm adapters,
- the new helper files are not connected,
- the public UI copy/hint system is not implemented,
- `docs/backlog.md` has not been updated to reflect the roadmap,
- no verification has been run after the partial code edits in this run.

## Recommended Next Action

Resume from this document rather than continuing ad hoc implementation.

The next concrete step should be:

- decide whether to keep or revise the partial working-tree edits,
- then either complete them in a controlled slice starting with the backend endpoint plus tests, or back them out and re-implement against this document in smaller stages.

Per user instruction, stop after writing this file.
