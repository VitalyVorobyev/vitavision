---
title: "Horn-Schunck Optical Flow"
type: algorithm
slug: horn-schunck
---

> Generated stub — do not edit. Source: `content/algorithms/horn-schunck.md`.

Dense optical flow recovered by minimising a variational energy that combines the brightness-constancy constraint with a global smoothness prior on the velocity field, solved by per-pixel Gauss-Seidel relaxation.

## Prerequisites

- [[image-gradient]]
- [[optical-flow]]

## Lineage

- **Extended by** — [[black-anandan-robust-flow]]
  > Robust M-estimator extension of the quadratic data and smoothness terms; non-convex but more tolerant of outliers and motion discontinuities.
- **Parallel foundation with** — [[lucas-kanade]]
  > Dense variational vs sparse local LSQ — co-founded optical flow in 1981; pick by problem (dense flow field vs sparse displacement of features).

## Sources

- Primary: [[horn1981-horn-schunck]]
- Reference: [[lucas1981-lucas-kanade]]
