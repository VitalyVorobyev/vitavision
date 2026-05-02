---
title: "Chessboard Detection via X-Corners and Topology"
type: algorithm
slug: laureano-topological-chessboard
---

> Generated stub — do not edit. Source: `content/algorithms/laureano-topological-chessboard.md`.

Detect every corner of a chessboard calibration pattern and assign it an integer grid coordinate by counting ring-alternations to locate X-junctions, Delaunay-triangulating the corner set, and keeping only triangles that respect the two-colour neighbourhood regularity of the pattern.

## Prerequisites

- [[image-gradient]]

## Related

- [[chess-corners]]
- [[fast-corner-detector]]
- [[shu-topological-grid]]

## Sources

- Primary: [[laureano2013-topological]]
- Reference: [[rosten2006-fast]]
- Reference: [[shu2009-topological]]
