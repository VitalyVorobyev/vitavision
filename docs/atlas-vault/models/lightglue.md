---
title: "LightGlue"
type: model
slug: lightglue
---

> Generated stub — do not edit. Source: `content/models/lightglue.md`.

Adaptive-depth Transformer matcher for sparse local features: stacks 9 self+cross-attention layers with rotary positional encoding and a per-token confidence head, exits early on easy image pairs, and replaces SuperGlue's Sinkhorn solver with a dual-softmax × matchability assignment head — over 2× faster than SuperGlue at equivalent or better pose-estimation accuracy.

## Prerequisites

- [[attention-mechanism]]
- [[feature-matching]]

## Sources

- Primary: [[lindenberger2023-lightglue]]
- Reference: [[detone2018-superpoint]]
- Reference: [[lowe2004-sift]]
- Reference: [[sarlin2020-superglue]]
- Reference: [[sun2021-loftr]]
