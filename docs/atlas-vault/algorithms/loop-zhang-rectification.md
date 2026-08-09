---
title: "Loop-Zhang Rectifying Homographies"
type: algorithm
slug: loop-zhang-rectification
---

> Generated stub — do not edit. Source: `content/algorithms/loop-zhang-rectification.md`.

Computes a rectifying homography pair from a known fundamental matrix by factoring each homography as shearing × similarity × projective, choosing the projective component to minimize image distortion.

## Prerequisites

- [[epipolar-geometry]]
- [[homography]]
- [[stereo-rectification]]

## Practice

- **Compared with** — [[pollefeys-polar-rectification]]
  > The decomposition still sends the epipole to infinity, so an epipole inside the image forces cropping; polar rectification avoids it.

## Sources

- Primary: [[loop1999-rectifying-homographies]]
