---
title: "Gao Dual-Homography Stitching"
type: algorithm
slug: gao-dual-homography-stitching
---

> Generated stub — do not edit. Source: `content/algorithms/gao-dual-homography-stitching.md`.

Stitch two-plane outdoor panoramas by clustering SIFT correspondences into a ground group and a distant group via spatial K-means, fitting one homography per group, and blending per pixel by inverse-distance weights. Superseded for practical use by APAP's continuous per-cell grid.

## Prerequisites

- [[homography]]
- [[ransac]]
- [[spatially-varying-image-stitching]]
- [[svd-null-space]]

## Lineage

- **Generalised by** — [[apap-image-stitching]]
  > APAP's continuous grid of per-cell homographies subsumes the two-plane parametrisation; the two methods are not peer practitioner choices.

## Sources

- Primary: [[gao2011-dual-homography]]
- Reference: [[hartley1997-eight-point]]
- Reference: [[lin2011-svastitching]]
- Reference: [[zaragoza2013-apap]]
