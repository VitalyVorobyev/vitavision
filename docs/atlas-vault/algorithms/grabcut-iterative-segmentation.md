---
title: "GrabCut Iterative Segmentation"
type: algorithm
slug: grabcut-iterative-segmentation
---

> Generated stub — do not edit. Source: `content/algorithms/grabcut-iterative-segmentation.md`.

Extract a foreground from a colour image using a single bounding rectangle as the only required input by alternating Gaussian mixture component assignment, GMM parameter re-estimation, and global s-t min-cut on a contrast-weighted MRF — the iteration decreases a Gibbs energy $E(\alpha, k, \theta, z) = U + V$ monotonically — then refine the contour with a regularised 1-D $\alpha$-profile in a $\pm 6$-pixel border ribbon.

## Prerequisites

- [[energy-minimization]]

## Sources

- Primary: [[rother2004-grabcut]]
- Reference: [[boykov2001-graph-cut-segmentation]]
