---
title: "VGGT (Visual Geometry Grounded Transformer)"
type: model
slug: vggt
---

> Generated stub — do not edit. Source: `content/models/vggt.md`.

A large feed-forward transformer that predicts cameras, depth maps, point maps and 3D point tracks for one to hundreds of views in a single pass, removing the optimization and global-alignment post-processing that pairwise pointmap methods require.

## Prerequisites

- [[attention-mechanism]]
- [[bundle-adjustment]]
- [[epipolar-geometry]]
- [[feed-forward-3d-reconstruction]]
- [[pose-estimation]]
- [[vit]]

## Lineage

- **Generalised by** — [[depth-anything-3]] _(confidence: medium)_
  > DA3 surpasses VGGT on the any-view benchmark (+44% pose, +25% geometry) and adds pose-conditioned input; VGGT remains a strong, widely-used feed-forward baseline.

## Sources

- Primary: [[wang2025-vggt]]
- Reference: [[leroy2024-mast3r]]
- Reference: [[oquab2023-dinov2]]
- Reference: [[wang2023-dust3r]]
