---
title: "BRIEF: Binary Robust Independent Elementary Features"
type: algorithm
slug: brief
---

> Generated stub — do not edit. Source: `content/algorithms/brief.md`.

Encodes a Gaussian-smoothed image patch around a detected keypoint as a 128/256/512-bit binary string by running a fixed table of pairwise pixel-intensity tests; matched between images by Hamming distance via bitwise XOR + popcount.

## Prerequisites

- [[feature-descriptors]]
- [[image-gradient]]
- [[integral-image]]

## Lineage

- **Extended by** — [[orb]]
  > rBRIEF steers BRIEF via a 30-bin orientation LUT and replaces the random offset table with 256 learned, low-correlation tests.

## Practice

- **Compared with** — [[sift]] _(confidence: medium)_
  > BRIEF is descriptor-only; SIFT/SURF bundle a detector.
- **Compared with** — [[surf]] _(confidence: medium)_
  > BRIEF is descriptor-only; SIFT/SURF bundle a detector.

## Sources

- Primary: [[calonder2010-brief]]
- Reference: [[bay2006-surf]]
- Reference: [[lowe2004-sift]]
- Reference: [[rosten2006-fast]]
- Reference: [[viola2001-detector]]
