---
title: "Lucas-Kanade Image Registration"
type: algorithm
slug: lucas-kanade
---

> Generated stub — do not edit. Source: `content/algorithms/lucas-kanade.md`.

Iterative Newton-Raphson method that estimates the parametric warp between two images by linearising the residual and solving the resulting weighted normal equation per iteration.

## Prerequisites

- [[image-gradient]]
- [[optical-flow]]
- [[structure-tensor]]

## Lineage

- **Extended by** — [[black-anandan-robust-flow]]
  > Robust M-estimator version of the parametric variant; same machinery as Black-Anandan's piecewise-smooth flow.
- **Extended by** — [[shi-tomasi-corner-detector]]
  > Shi-Tomasi derives the feature-selection threshold from the conditioning of the LK normal-equation matrix and adds a 6-DOF affine variant with dissimilarity monitoring.

## Sources

- Primary: [[lucas1981-lucas-kanade]]
- Reference: [[shi-tomasi1994-features]]
