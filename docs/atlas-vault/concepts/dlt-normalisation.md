---
title: "DLT Normalisation"
type: concept
slug: dlt-normalisation
---

> Generated stub — do not edit. Source: `content/concepts/dlt-normalisation.md`.

A two-line similarity transform — translate the point centroid to the origin, isotropically scale so the average distance is √2 — that conditions the design matrix of any DLT-based estimator (homography, fundamental matrix, projective camera, Moving DLT) by ~10⁸, and is the difference between unusable and reliable linear solutions.

## Prerequisites

- [[ransac]]
- [[svd-null-space]]

## Sources

- Reference: [[hartley1997-eight-point]]
- Reference: [[zaragoza2013-apap]]
