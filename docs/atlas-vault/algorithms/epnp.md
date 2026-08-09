---
title: "EPnP: O(n) Perspective-n-Point"
type: algorithm
slug: epnp
---

> Generated stub — do not edit. Source: `content/algorithms/epnp.md`.

Non-iterative O(n) solver for the calibrated Perspective-n-Point problem: express the n reference points as weighted sums of four virtual control points, recover their camera-frame coordinates from the null space of a 12×12 matrix, and extract pose by absolute orientation.

## Prerequisites

- [[dlt-normalisation]]
- [[pinhole-camera-model]]
- [[pose-estimation]]
- [[ransac]]

## Sources

- Primary: [[lepetit2009-epnp]]
- Reference: [[fischler1981-ransac]]
