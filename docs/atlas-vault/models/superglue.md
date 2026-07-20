---
title: "SuperGlue"
type: model
slug: superglue
---

> Generated stub — do not edit. Source: `content/models/superglue.md`.

Graph neural network that matches two sets of sparse local features by jointly finding correspondences and rejecting unmatched keypoints in one differentiable forward pass, trained end-to-end with a Sinkhorn optimal-transport assignment over augmented dustbin scores.

## Prerequisites

- [[attention-mechanism]]
- [[feature-matching]]

## Lineage

- **Extended by** — [[lightglue]]
  > LightGlue retains SuperGlue's graph-attention matcher framework; adds adaptive depth + token pruning + dual-softmax head for >2× speedup at comparable or better accuracy. SuperGlue remains the reference baseline.

## Practice

- **Compared with** — [[loftr]]

## Sources

- Primary: [[sarlin2020-superglue]]
- Reference: [[detone2018-superpoint]]
- Reference: [[lindenberger2023-lightglue]]
- Reference: [[sun2021-loftr]]
