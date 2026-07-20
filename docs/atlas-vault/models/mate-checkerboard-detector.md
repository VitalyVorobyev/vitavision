---
title: "MATE"
type: model
slug: mate-checkerboard-detector
---

> Generated stub — do not edit. Source: `content/models/mate-checkerboard-detector.md`.

First learned per-pixel checkerboard X-corner detector: a three-convolutional-layer CNN with 2,939 parameters trained with mean-squared-error loss against a binary corner mask and post-processed with a fixed 0.5 threshold.

## Prerequisites

- [[image-gradient]]

## Practice

- **Compared with** — [[ccdn-checkerboard-detector]]
- **Compared with** — [[ccs-camera-calibration]]
  > Different scope: MATE is a detector, CCS is a full calibration pipeline; comparison is at the corner-detection level.

## Cross-paradigm

- **Learned alternative of** — [[chess-corners]]

## Sources

- Primary: [[donne2016-mate]]
- Reference: [[bennett2013-chess]]
- Reference: [[chen2023-ccdn]]
- Reference: [[placht2014-rochade]]
- Reference: [[rufli2008-blurred]]
- Reference: [[zhang2022-learning-based]]
