---
title: "Harris Corner Detector"
type: algorithm
slug: harris-corner-detector
---

> Generated stub — do not edit. Source: `content/algorithms/harris-corner-detector.md`.

Scores each pixel by the Harris response R = det(M) − k·tr(M)², where M is the gradient covariance matrix summed over a Gaussian window; returns integer pixel locations where R exceeds a threshold and is a local maximum.

## Prerequisites

- [[image-gradient]]
- [[structure-tensor]]

## Related

- [[chess-corners]]
- [[duda-radon-corners]]
- [[fast-corner-detector]]
- [[laureano-topological-chessboard]]
- [[puzzleboard]]
- [[pyramidal-blur-aware-xcorner]]
- [[shi-tomasi-corner-detector]]
- [[shu-topological-grid]]

## Compared with

- [[fast-corner-detector]]
- [[shi-tomasi-corner-detector]]

## Sources

- Primary: [[harris1988-corner]]
- Reference: [[shi-tomasi1994-features]]
