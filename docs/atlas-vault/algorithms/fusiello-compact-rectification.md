---
title: "Fusiello Compact Stereo Rectification"
type: algorithm
slug: fusiello-compact-rectification
---

> Generated stub — do not edit. Source: `content/algorithms/fusiello-compact-rectification.md`.

Calibrated Euclidean rectification that builds a new pair of projection matrices sharing a common orientation from the two known PPMs, yielding a per-image rectifying homography.

## Prerequisites

- [[epipolar-geometry]]
- [[pinhole-camera-model]]
- [[pose-estimation]]
- [[stereo-rectification]]

## Practice

- **Compared with** — [[hartley-projective-rectification]]
  > Requires known projection matrices; the 1999 uncalibrated methods need only F.

## Sources

- Primary: [[fusiello2000-compact-rectification]]
- Reference: [[hartley1999-projective-rectification]]
- Reference: [[loop1999-rectifying-homographies]]
- Reference: [[pollefeys1999-polar-rectification]]
