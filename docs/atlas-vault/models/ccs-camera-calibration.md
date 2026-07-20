---
title: "CCS"
type: model
slug: ccs-camera-calibration
---

> Generated stub — do not edit. Source: `content/models/ccs-camera-calibration.md`.

Three-stage learning-based camera calibration pipeline: a CNN regresses radial-distortion-correction parameters, a UNet predicts per-corner Gaussian heatmaps refined by surface-fit subpixel localisation, and an image-level RANSAC accepts inlier views before Zhang-style intrinsic estimation.

## Prerequisites

- [[camera-distortion-models]]
- [[chessboard-x-corner-detection]]
- [[ransac]]

## Practice

- **Compared with** — [[ccdn-checkerboard-detector]]
  > Peer at the corner-detection level only; CCS adds distortion correction and RANSAC parameter estimation on top.

## Cross-paradigm

- **Learned alternative of** — [[chess-corners]]

## Sources

- Primary: [[zhang2022-learning-based]]
- Reference: [[chen2023-ccdn]]
- Reference: [[donne2016-mate]]
- Reference: [[geiger2012-automatic]]
- Reference: [[tsai1987-versatile]]
- Reference: [[zhang2000-flexible]]
