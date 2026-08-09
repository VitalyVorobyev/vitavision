---
title: "Felzenszwalb–Huttenlocher Graph-Based Image Segmentation"
type: algorithm
slug: felzenszwalb-graph-segmentation
---

> Generated stub — do not edit. Source: `content/algorithms/felzenszwalb-graph-segmentation.md`.

Partition an image into perceptually coherent regions by a Kruskal-style greedy merge over a pixel graph, accepting an inter-component edge as a non-boundary when its weight does not exceed the components' internal variation plus a size-adaptive threshold $\tau(C) = k/|C|$; runs in $O(m \log m)$ time and produces partitions that are simultaneously not too fine and not too coarse.

## Prerequisites

- [[energy-minimization]]

## Sources

- Primary: [[felzenszwalb2004-graph-segm]]
