---
category: Target Generator
---
Renders the live SVG preview of a calibration target — chessboard, ChArUco, marker board, ring grid, or puzzleboard — from the current generator config. This is the centrepiece of the target-generator surface; the panels in this group drive it.

Output is true vector SVG, which is what makes the generated targets printable without resampling artefacts.

**Runtime asset dependency.** Chessboard, marker-board, and puzzleboard render entirely from
geometry. ChArUco and ring-grid do not: they fetch their dictionary and codebook at render time
from `/arucodict/*.json` and `/ringgrid/codebook_*.json`. Those files are served by the
application but not by a design render, so in a design those two target types will come up
without their markers or code bands. Prefer `chessboard`, `markerboard`, or `puzzleboard` unless
you can serve those assets. (The preview card shows all five by stubbing the two fetches, so what
you see there is the component's full capability rather than what a bare design will get.)
