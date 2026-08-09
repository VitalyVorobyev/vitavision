---
title: "PuzzleBoard"
type: algorithm
slug: puzzleboard
---

> Generated stub — do not edit. Source: `content/algorithms/puzzleboard.md`.

Detect and decode a self-identifying checkerboard calibration pattern: saddle-point corners from a Hessian response, grid reconstruction via Kruskal minimum spanning forest on the 9-nearest-neighbour graph, absolute corner position on a $501 \times 501$ grid from cross-correlation against two binary de Bruijn factor maps.

## Prerequisites

- [[hessian-saddle-response]]
- [[image-gradient]]
- [[topological-grid-recovery]]

## Sources

- Primary: [[stelldinger2024-puzzleboard]]
- Reference: [[chen2005-xcorner]]
- Reference: [[harris1988-corner]]
