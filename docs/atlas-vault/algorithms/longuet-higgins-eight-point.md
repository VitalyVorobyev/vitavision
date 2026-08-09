---
title: "Longuet-Higgins Linear Eight-Point Algorithm"
type: algorithm
slug: longuet-higgins-eight-point
---

> Generated stub — do not edit. Source: `content/algorithms/longuet-higgins-eight-point.md`.

1981 closed-form linear method for relative orientation of two viewpoints from eight calibrated point correspondences, introducing the bilinear epipolar constraint x'^T Q x = 0 and the matrix Q = R·skew(T) later known as the essential matrix. Superseded for practical use by Hartley's 1997 normalised eight-point algorithm.

## Prerequisites

- [[epipolar-geometry]]
- [[pose-estimation]]
- [[svd-null-space]]

## Lineage

- **Generalised by** — [[fundamental-matrix-eight-point]]

## Sources

- Primary: [[longuet-higgins1981-eight-point]]
- Reference: [[hartley1997-eight-point]]
