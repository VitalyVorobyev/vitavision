---
title: "As-Projective-As-Possible Image Stitching"
type: algorithm
slug: apap-image-stitching
---

> Generated stub — do not edit. Source: `content/algorithms/apap-image-stitching.md`.

Replace a global homography with a spatially varying field of homographies, each fit by a per-cell weighted DLT (Moving DLT) on the same point correspondences, so the warp stays globally projective but adapts locally where the projective model is inadequate.

## Prerequisites

- [[dlt-normalisation]]
- [[homography]]

## Related

- [[spatially-varying-image-stitching]]
- [[zhang-planar-calibration]]

## Sources

- Primary: [[zaragoza2013-apap]]
- Reference: [[gao2011-dual-homography]]
- Reference: [[hartley1997-eight-point]]
- Reference: [[lin2011-svastitching]]
- Reference: [[schaefer2006-mls]]
