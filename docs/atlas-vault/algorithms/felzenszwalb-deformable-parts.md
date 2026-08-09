---
title: "Deformable Part Models"
type: algorithm
slug: felzenszwalb-deformable-parts
---

> Generated stub — do not edit. Source: `content/algorithms/felzenszwalb-deformable-parts.md`.

Detect a target object class in arbitrary images by scoring every position and scale in a HOG feature pyramid with a mixture of star-structured part-based templates — a coarse root filter and $n=6$ finer-resolution part filters with quadratic deformation costs — trained as a latent SVM with hard-negative mining.

## Prerequisites

- [[image-gradient]]

## Practice

- **Compared with** — [[viola-jones-detector]] _(confidence: medium)_
  > Different operational regimes — VJ is real-time cascade for rigid faces; DPM is offline part-based for general deformable objects.

## Sources

- Primary: [[felzenszwalb2010-detection]]
- Reference: [[dalal2005-hog]]
- Reference: [[viola2001-detector]]
