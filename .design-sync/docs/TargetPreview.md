---
category: Target Generator
---
Renders the live SVG preview of a calibration target — chessboard, ChArUco, marker board, ring grid, PuzzleBoard or PuzzlePole — from the current generator state. This is the centrepiece of the target-generator surface; the panels in this group drive it.

Output is true vector SVG, which is what makes the generated targets printable without resampling artefacts.

**Where the SVG comes from.** The component is presentational: it displays `state.previewSvg` (injected as markup) with pan, zoom and fit controls, and reads the board's footprint from `state.target` — for the ring grid, from `state.validation.boardWidthMm` / `boardHeightMm`. In the app that SVG is rendered by the calib-targets / ringgrid WASM modules in a worker; a design render has no worker, so a design must supply `previewSvg` itself (any SVG sized to the page in mm) and a `validation` with empty `errors` / `warnings`. Kinds: chessboard, ChArUco, marker board, ring grid, PuzzleBoard, PuzzlePole. The preview cards build a sketched SVG per kind for this (`.design-sync/fixtures/targetgen.ts`); it shows the layout, not the real code pattern.
