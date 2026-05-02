---
title: "ChESS Corners"
type: algorithm
slug: chess-corners
---

> Generated stub — do not edit. Source: `content/algorithms/chess-corners.md`.

A chessboard-specific corner detector: scores each pixel by how well its local neighborhood matches an alternating bright-dark X-junction pattern, using 16 fixed integer offsets on a radius-5 ring.

## Prerequisites

- [[image-gradient]]

## Related

- [[chessboard-x-corner-detection]]
- [[fast-corner-detector]]
- [[harris-corner-detector]]
- [[shi-tomasi-corner-detector]]

## Compared with

- [[duda-radon-corners]]
- [[puzzleboard]]
- [[pyramidal-blur-aware-xcorner]]
- [[rochade]]

## Sources

- Primary: [[bennett2013-chess]]
- Reference: [[rosten2006-fast]]
