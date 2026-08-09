---
title: "Harris Corner Detector"
type: algorithm
slug: harris-corner-detector
---

> Generated stub — do not edit. Source: `content/algorithms/harris-corner-detector.md`.

Scores each pixel by the Harris response R = det(M) − k·tr(M)², where M is the gradient covariance matrix summed over a Gaussian window; returns integer pixel locations where R exceeds a threshold and is a local maximum.

## Prerequisites

- [[image-gradient]]
- [[non-maximum-suppression]]
- [[structure-tensor]]

## Practice

- **Compared with** — [[chess-corners]]
- **Compared with** — [[fast-corner-detector]]
- **Compared with** — [[shi-tomasi-corner-detector]]
- **Feeds into** — [[orb]] _(confidence: medium)_
  > Used only as a corner-strength filter to rank FAST keypoints, not as a detector.

## Sources

- Primary: [[harris1988-corner]]
- Reference: [[shi-tomasi1994-features]]
