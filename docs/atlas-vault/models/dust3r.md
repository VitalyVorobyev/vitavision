---
title: "DUSt3R"
type: model
slug: dust3r
---

> Generated stub — do not edit. Source: `content/models/dust3r.md`.

A feed-forward network that regresses two dense pointmaps in a shared coordinate frame from an uncalibrated, unposed image pair, jointly recovering correspondence, relative pose, intrinsics and depth without prior calibration.

## Prerequisites

- [[bundle-adjustment]]
- [[epipolar-geometry]]
- [[feed-forward-3d-reconstruction]]
- [[pinhole-camera-model]]
- [[pose-estimation]]

## Lineage

- **Extended by** — [[mast3r]]

## Practice

- **Feeds into** — [[depth-anything-3]] _(confidence: medium)_
  > DA3 inherits DUSt3R's pose-free feed-forward pointmap paradigm but is a distinct any-view model.
- **Feeds into** — [[vggt]]

## Sources

- Primary: [[wang2023-dust3r]]
