---
title: "Topological Grid Finding"
type: algorithm
slug: shu-topological-grid
---

> Generated stub — do not edit. Source: `content/algorithms/shu-topological-grid.md`.

Recover the integer $(i, j)$ grid coordinate of every corner in a checkerboard calibration image by Delaunay-triangulating the corners, merging same-colour triangle pairs into quads, topologically and geometrically filtering illegal quads, and flood-filling coordinates through the resulting mesh.

## Prerequisites

- [[image-gradient]]
- [[topological-grid-recovery]]

## Lineage

- **Alternative formulation of** — [[geiger-chessboard-detector]] _(confidence: medium)_
  > Different abstraction layer — topological grid recovery from a candidate corner set vs single-shot detection that integrates corner finding and grid linking. Not superseded by Geiger; both remain in practitioner use.

## Practice

- **Compared with** — [[laureano-topological-chessboard]]

## Sources

- Primary: [[shu2009-topological]]
- Reference: [[harris1988-corner]]
