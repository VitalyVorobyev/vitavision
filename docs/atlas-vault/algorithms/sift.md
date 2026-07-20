---
title: "SIFT: Scale-Invariant Feature Transform"
type: algorithm
slug: sift
---

> Generated stub — do not edit. Source: `content/algorithms/sift.md`.

Detects keypoints as scale-space extrema in a Difference-of-Gaussian image pyramid, refines location and scale by 3D quadratic interpolation, assigns canonical orientation from local gradient histograms, and emits a 128-D descriptor invariant to scale, rotation, and moderate affine and illumination change.

## Prerequisites

- [[feature-descriptors]]
- [[feature-matching]]
- [[image-gradient]]
- [[image-pyramid]]
- [[scale-space]]

## Practice

- **Compared with** — [[fast-corner-detector]]
- **Compared with** — [[harris-corner-detector]]
- **Compared with** — [[orb]]
- **Compared with** — [[shi-tomasi-corner-detector]]

## Sources

- Primary: [[lowe2004-sift]]
- Reference: [[harris1988-corner]]
