---
title: "HOG: Histograms of Oriented Gradients"
type: algorithm
slug: hog-descriptor
---

> Generated stub — do not edit. Source: `content/algorithms/hog-descriptor.md`.

Compute a fixed-length descriptor for an image window by binning pixel gradients into 8×8 cells of 9 unsigned-orientation histograms, normalising overlapping 2×2-cell blocks with L2-Hys, and concatenating the 3780 block values into a single vector fed to a linear SVM — the canonical pre-CNN pedestrian detector.

## Prerequisites

- [[feature-descriptors]]
- [[image-gradient]]

## Practice

- **Compared with** — [[viola-jones-detector]] _(confidence: medium)_
  > Both classical sliding-window detectors. Viola-Jones: Haar + AdaBoost cascade on faces. HOG: gradient histograms + linear SVM on pedestrians.
- **Feeds into** — [[felzenszwalb-deformable-parts]]
  > DPM uses HOG cells (k=8 px, α=0.2) with an analytic 31-dim projection of the 36-dim HOG vector as its base feature pyramid.

## Sources

- Primary: [[dalal2005-hog]]
- Reference: [[lowe2004-sift]]
