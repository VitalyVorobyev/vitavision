---
title: "Gao Dual-Homography Stitching"
type: algorithm
slug: gao-dual-homography-stitching
---

> Generated stub — do not edit. Source: `content/algorithms/gao-dual-homography-stitching.md`.

Stitch two-plane outdoor panoramas by clustering SIFT correspondences into a ground group and a distant group via spatial K-means, fitting one homography per group with RANSAC, and blending per pixel by inverse-distance weights — the direct two-plane predecessor of APAP's continuous grid of per-cell homographies.

## Prerequisites

- [[homography]]

## Related

- [[apap-image-stitching]]
- [[spatially-varying-image-stitching]]

## Compared with

- [[apap-image-stitching]]

## Sources

- Primary: [[gao2011-dual-homography]]
- Reference: [[hartley1997-eight-point]]
- Reference: [[lin2011-svastitching]]
- Reference: [[zaragoza2013-apap]]
