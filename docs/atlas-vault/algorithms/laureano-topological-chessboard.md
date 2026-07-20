---
title: "Chessboard Detection via X-Corners and Topology"
type: algorithm
slug: laureano-topological-chessboard
---

> Generated stub — do not edit. Source: `content/algorithms/laureano-topological-chessboard.md`.

Detect every corner of a chessboard calibration pattern and assign it an integer grid coordinate by counting ring-alternations to locate X-junctions, Delaunay-triangulating the corner set, and keeping only triangles that respect the two-colour neighbourhood regularity of the pattern.

## Prerequisites

- [[hessian-saddle-response]]
- [[image-gradient]]
- [[topological-grid-recovery]]

## Lineage

- **Alternative formulation of** — [[geiger-chessboard-detector]] _(confidence: medium)_
  > Less influential in practice than Geiger but methodologically distinct — the X-corner detector is a ring-alternation count rather than a quadrant template, and the topology filter operates on Delaunay triangles directly.

## Sources

- Primary: [[laureano2013-topological]]
- Reference: [[chen2005-xcorner]]
- Reference: [[rosten2006-fast]]
- Reference: [[shu2009-topological]]
