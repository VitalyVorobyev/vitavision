---
title: "Lin Smoothly Varying Affine Stitching"
type: algorithm
slug: lin-sva-stitching
---

> Generated stub — do not edit. Source: `content/algorithms/lin-sva-stitching.md`.

Stitch two images under moderate parallax by replacing the global affine with a per-feature deviation field, regularised to be smooth via a Gaussian-kernel CPD-style EM that jointly estimates correspondence and warp — the contemporary affine-model competitor to APAP's per-cell projective grid.

## Prerequisites

- [[homography]]
- [[ransac]]
- [[spatially-varying-image-stitching]]

## Lineage

- **Generalised by** — [[apap-image-stitching]] _(confidence: medium)_
  > Affine deviation field remains a useful baseline; APAP's projective per-cell grid is more general but not strictly necessary for moderate-parallax planar-scene panoramas.

## Sources

- Primary: [[lin2011-svastitching]]
- Reference: [[gao2011-dual-homography]]
- Reference: [[igarashi2005-arap]]
- Reference: [[zaragoza2013-apap]]
