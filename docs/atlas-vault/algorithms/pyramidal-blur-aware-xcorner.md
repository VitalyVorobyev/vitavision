---
title: "Pyramidal Blur-Aware X-Corner Chessboard Detector"
type: algorithm
slug: pyramidal-blur-aware-xcorner
---

> Generated stub — do not edit. Source: `content/algorithms/pyramidal-blur-aware-xcorner.md`.

Detect chessboard X-junctions in heavily blurred or high-resolution images by computing a 16-sample circular x-corner intensity at every level of an image pyramid, selecting per corner the level that maximises intensity per resolution, then assembling a chessboard graph with blur-aware edge validation.

## Prerequisites

- [[image-gradient]]
- [[scale-space]]

## Related

- [[chess-corners]]
- [[chessboard-x-corner-detection]]
- [[rochade]]
- [[shi-tomasi-corner-detector]]
- [[shu-topological-grid]]

## Sources

- Primary: [[abeles2021-pyramidal]]
- Reference: [[bennett2013-chess]]
- Reference: [[lucchese2003-saddle]]
- Reference: [[placht2014-rochade]]
- Reference: [[shi-tomasi1994-features]]
