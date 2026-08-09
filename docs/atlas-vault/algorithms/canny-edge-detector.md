---
title: "Canny Edge Detector"
type: algorithm
slug: canny-edge-detector
---

> Generated stub — do not edit. Source: `content/algorithms/canny-edge-detector.md`.

Detect thin step edges in greyscale images by smoothing with a Gaussian, computing gradient magnitude and direction, suppressing non-maxima along the gradient direction, then linking surviving pixels via hysteresis double-thresholding; the filter shape is derived as the variational optimum of three criteria — detection SNR, localisation, and single-response spacing — under an additive-white-Gaussian-noise step-edge model.

## Prerequisites

- [[convolution]]
- [[image-gradient]]
- [[non-maximum-suppression]]

## Sources

- Primary: [[canny1986-edge]]
