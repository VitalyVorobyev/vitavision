---
title: "FAST Corner Detector"
date: 2026-03-29
summary: "A very fast corner detector based on an intensity segment test around a Bresenham circle."
tags: ["computer-vision", "feature-detection", "tracking", "real-time"]
author: "Vitaly Vorobyev"
relatedPosts: ["01-chesscorners", "01-chess_ai"]
relatedAlgorithms: ["harris-corner-detector", "shi-tomasi-corner-detector", "chess-corners"]
---

FAST is designed for speed. Instead of computing gradients and second-moment statistics at every pixel, it tests whether a circle of surrounding pixels contains a contiguous arc that is consistently much brighter or darker than the center. That makes FAST one of the standard choices for real-time detection, visual odometry, and lightweight feature pipelines.

## What problem this solves

Many corner detectors are accurate but comparatively expensive when evaluated densely. FAST targets the opposite tradeoff: detect many plausible corners extremely quickly, then rely on non-maximum suppression, scoring, and downstream descriptors or trackers to keep the useful points.

## Core idea

Consider the 16-pixel Bresenham circle of radius 3 around a candidate center pixel $I_p$. A point is declared a corner if there exists a contiguous arc of $n$ pixels on that circle such that every pixel in the arc is either:

- brighter than $I_p + t$, or
- darker than $I_p - t$,

where $t$ is an intensity threshold.

In compact form, the test looks like:

$$
\forall x \in S_n:\ I_x \ge I_p + t
\quad \text{or} \quad
\forall x \in S_n:\ I_x \le I_p - t
$$

for some contiguous subset $S_n$ of the 16 circle pixels.

Practical FAST implementations accelerate this further with a learned decision tree that rejects non-corners quickly, then apply non-maximum suppression using a corner score.

## Minimal pipeline

```text
gray image -> FAST segment test on 16-point circle
reject points that fail brightness/darkness arc test
compute corner score for survivors
apply non-maximum suppression
optionally pass points to descriptor or tracker
```

Common variants are FAST-9 and FAST-12, where the number indicates the required arc length.

## Implementation notes

- FAST is attractive when latency matters more than detailed response modeling.
- The detector is usually paired with a separate score or descriptor; ORB is a well-known example of this style of pipeline.
- Threshold selection strongly affects the number of returned points.
- Because the decision rule is purely local and intensity-based, FAST is easy to vectorize and cheap to run on large images.

## Failure modes and tradeoffs

FAST is extremely fast, but the raw detector is less informative than Harris or Shi-Tomasi: it does not provide a second-moment matrix or a direct trackability measure. It can also respond aggressively on repeated high-contrast texture, and without scale handling it is not scale invariant. For calibration targets or strongly structured patterns, specialized detectors may still be a better choice.

## Used in Vitavision

Vitavision's current chessboard work is more interested in target-specific detectors such as ChESS, but FAST remains an important baseline for real-time systems and for understanding the cost/quality tradeoff against Harris and Shi-Tomasi. It is the "speed first" point in that comparison.

## References

1. E. Rosten and T. Drummond, "Machine Learning for High-Speed Corner Detection," ECCV, 2006.
2. E. Rosten, R. Porter, and T. Drummond, "Faster and Better: A Machine Learning Approach to Corner Detection," TPAMI, 2010.
3. E. Rublee, V. Rabaud, K. Konolige, and G. Bradski, "ORB: An Efficient Alternative to SIFT or SURF," ICCV, 2011.
