---
title: "Tsai's Versatile Camera Calibration"
type: algorithm
slug: tsai-versatile-calibration
---

> Generated stub — do not edit. Source: `content/algorithms/tsai-versatile-calibration.md`.

Two-stage 1987 camera calibration that uses the radial alignment constraint to recover extrinsics and image scale linearly from a precision 3D calibration target, then refines focal length, depth translation, and one radial-distortion coefficient by a short nonlinear solve over three unknowns. Superseded for practical use by Zhang's planar method.

## Prerequisites

- [[bundle-adjustment]]
- [[camera-distortion-models]]
- [[pinhole-camera-model]]

## Lineage

- **Generalised by** — [[zhang-planar-calibration]]

## Practice

- **Feeds into** — [[tsai-lenz-handeye]]
  > Tsai 1987's per-station extrinsics are the canonical input format for the Tsai-Lenz hand-eye AX = XB solver.

## Sources

- Primary: [[tsai1987-versatile]]
- Reference: [[daniilidis1999-hand-eye]]
- Reference: [[weng1992-camera]]
- Reference: [[zhang2000-flexible]]
