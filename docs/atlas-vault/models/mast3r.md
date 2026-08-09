---
title: "MASt3R"
type: model
slug: mast3r
---

> Generated stub — do not edit. Source: `content/models/mast3r.md`.

A 3D-grounded image matcher that adds a dense local-descriptor head and an InfoNCE matching loss on top of DUSt3R's pointmap regression, with a fast reciprocal matching scheme, yielding correspondences robust to extreme viewpoint change.

## Prerequisites

- [[epipolar-geometry]]
- [[feature-descriptors]]
- [[feature-matching]]
- [[feed-forward-3d-reconstruction]]
- [[pose-estimation]]

## Practice

- **Compared with** — [[lightglue]] _(confidence: medium)_
  > MASt3R is 3D-grounded and pose-robust; LightGlue is a fast sparse 2D matcher.
- **Compared with** — [[loftr]] _(confidence: medium)_
  > MASt3R grounds matching in 3D and wins under extreme viewpoint change; LoFTR is a 2D detector-free matcher.

## Sources

- Primary: [[leroy2024-mast3r]]
- Reference: [[wang2023-dust3r]]
