---
category: Target Generator
---
Container that renders the geometry form for the currently selected target type, delegating to the per-family config panel (chessboard, ChArUco, marker board, ring grid, PuzzleBoard, PuzzlePole), followed by the paper, validation and download sections (`sections` picks which).

The PuzzlePole panel needs `puzzlepolePeriods`, the library's supported `[circumference_squares, start_row]` pairs (`puzzlepole_periods()`, which the app reads from the WASM worker). Pass a short static list in a design, e.g. `[[12, 73], [24, 75]]`; without it the circumference and seam row fall back to plain number fields. `generateDxf` is likewise injected, and without it the DXF/ZIP buttons stay disabled.
