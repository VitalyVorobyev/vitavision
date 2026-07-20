---
title: "LoFTR"
type: model
slug: loftr
---

> Generated stub — do not edit. Source: `content/models/loftr.md`.

Detector-free dense feature matcher: shared CNN backbone produces coarse and fine feature maps, a Linear Transformer with interleaved self- and cross-attention establishes confidence-thresholded mutual nearest-neighbour correspondences, and a fine module refines each match to sub-pixel accuracy.

## Prerequisites

- [[attention-mechanism]]
- [[feature-matching]]

## Practice

- **Compared with** — [[lightglue]]
  > Different paradigm — LoFTR is detector-free dense; LightGlue is detector-based sparse with adaptive depth. LoFTR wins in textureless regions; LightGlue wins on speed (~8× faster per Lindenberger et al. Fig. 1).
- **Compared with** — [[xfeat]]
  > XFeat is later and lighter; LoFTR is the heavyweight reference for the detector-free paradigm.

## Sources

- Primary: [[sun2021-loftr]]
- Reference: [[detone2018-superpoint]]
- Reference: [[he2016-resnet]]
- Reference: [[lindenberger2023-lightglue]]
- Reference: [[potje2024-xfeat]]
- Reference: [[sarlin2020-superglue]]
