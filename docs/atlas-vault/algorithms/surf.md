---
title: "SURF: Speeded Up Robust Features"
type: algorithm
slug: surf
---

> Generated stub — do not edit. Source: `content/algorithms/surf.md`.

Detects scale- and rotation-invariant blob keypoints as scale-space maxima of the Hessian determinant, approximated with box filters on an integral image, and emits a 64-D Haar-wavelet response descriptor matched by Euclidean distance with a Laplacian-sign pre-filter.

## Prerequisites

- [[image-gradient]]
- [[image-pyramid]]
- [[integral-image]]
- [[scale-space]]

## Lineage

- **Alternative formulation of** — [[sift]]

## Practice

- **Compared with** — [[fast-corner-detector]] _(confidence: medium)_
  > FAST is detector-only; SURF bundles a descriptor.
- **Compared with** — [[harris-corner-detector]] _(confidence: medium)_
- **Compared with** — [[orb]]
- **Compared with** — [[shi-tomasi-corner-detector]] _(confidence: medium)_

## Sources

- Primary: [[bay2006-surf]]
- Reference: [[harris1988-corner]]
- Reference: [[lowe2004-sift]]
- Reference: [[viola2001-detector]]
