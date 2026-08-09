---
title: "ORB: Oriented FAST and Rotated BRIEF"
type: algorithm
slug: orb
---

> Generated stub — do not edit. Source: `content/algorithms/orb.md`.

Detects rotation-invariant oriented keypoints by running FAST-9 on a √2 image pyramid, ranking by Harris cornerness, and assigning orientation from the intensity centroid; describes each keypoint with a 256-bit rBRIEF binary string formed by greedy selection of low-correlation, high-variance pairwise pixel-intensity tests on a smoothed 31×31 patch.

## Prerequisites

- [[feature-descriptors]]
- [[image-gradient]]
- [[image-pyramid]]
- [[integral-image]]
- [[scale-space]]

## Sources

- Primary: [[rublee2011-orb]]
- Reference: [[bay2006-surf]]
- Reference: [[calonder2010-brief]]
- Reference: [[harris1988-corner]]
- Reference: [[lowe2004-sift]]
- Reference: [[rosten2006-fast]]
- Reference: [[viola2001-detector]]
