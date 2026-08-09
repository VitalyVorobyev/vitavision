---
title: "Hartley Projective Rectification"
type: algorithm
slug: hartley-projective-rectification
---

> Generated stub — do not edit. Source: `content/algorithms/hartley-projective-rectification.md`.

Computes a rectifying homography pair from the fundamental matrix alone, sending the epipole to infinity with a quasi-affine perspectivity and fixing the matching transform by least-squares disparity minimisation.

## Prerequisites

- [[epipolar-geometry]]
- [[homography]]
- [[stereo-rectification]]

## Lineage

- **Parallel foundation with** — [[loop-zhang-rectification]]
  > Loop-Zhang minimises rectification distortion explicitly; Hartley minimises disparity.

## Practice

- **Compared with** — [[pollefeys-polar-rectification]]
  > Hartley's own remedy for an epipole inside the view window is to shrink the window; polar rectification covers that forward-motion case without cropping.

## Sources

- Primary: [[hartley1999-projective-rectification]]
- Reference: [[longuet-higgins1981-eight-point]]
