---
title: "ROCHADE: Robust Checkerboard Advanced Detection"
type: algorithm
slug: rochade
---

> Generated stub — do not edit. Source: `content/algorithms/rochade.md`.

Detect a full planar checkerboard in an image by reducing the gradient-magnitude edge set to a single-pixel centreline graph, extracting inner corners as graph saddle points, then refining each corner to subpixel accuracy by fitting a bivariate quadratic to a cone-filtered neighbourhood and solving for its stationary point.

## Prerequisites

- [[hessian-saddle-response]]
- [[image-gradient]]

## Practice

- **Compared with** — [[pyramidal-blur-aware-xcorner]]

## Sources

- Primary: [[placht2014-rochade]]
- Reference: [[chen2005-xcorner]]
- Reference: [[lucchese2003-saddle]]
- Reference: [[niblack1992-skeleton]]
- Reference: [[rufli2008-blurred]]
