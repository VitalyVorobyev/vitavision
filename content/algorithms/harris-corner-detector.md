---
title: "Harris Corner Detector"
date: 2026-03-29
summary: "A classic local feature detector that scores pixels with strong intensity variation in two independent directions."
tags: ["computer-vision", "feature-detection", "tracking", "calibration"]
category: corner-detection
author: "Vitaly Vorobyev"
relatedPosts: ["01-chesscorners", "01-chess_ai"]
relatedAlgorithms: ["shi-tomasi-corner-detector", "fast-corner-detector", "chess-corners"]
---

The Harris corner detector finds repeatable image points where intensity changes strongly in two independent directions. That makes it a strong baseline for tracking, matching, calibration targets, stitching, and visual odometry. It is especially useful when image scale is roughly known and good localization matters more than large viewpoint invariance.

## What problem this solves

Corners are more informative than flat regions or raw edges. On an edge, motion along the edge is ambiguous: a small patch can slide without changing much. At a corner, shifting the patch in almost any direction produces a strong appearance change. Harris turns that intuition into a local score computed densely over the image.

## Core idea

For a small image shift $(u, v)$, the change in patch appearance is approximated by

$$
E(u, v) \approx
\begin{bmatrix}
u & v
\end{bmatrix}
M
\begin{bmatrix}
u \\
v
\end{bmatrix},
$$

where $M$ is the second-moment matrix:

$$
M = G_{\sigma_i} *
\begin{bmatrix}
I_x^2 & I_x I_y \\
I_x I_y & I_y^2
\end{bmatrix}.
$$

Here $I_x$ and $I_y$ are image gradients, usually computed after light Gaussian smoothing at differentiation scale $\sigma_d$, and $G_{\sigma_i}$ integrates gradient energy over a local neighborhood.

The eigenvalues of $M$ describe directional intensity variation:

- both small: flat region
- one large, one small: edge
- both large: corner

Harris avoids explicit eigendecomposition and instead uses the response

$$
R = \det(M) - k \, \mathrm{trace}(M)^2.
$$

In practice, $R > 0$ tends to indicate corners, $R < 0$ edges, and values near zero flat textureless regions.

## Minimal pipeline

```text
gray -> gaussian blur(sigma_d) -> gradients Ix, Iy
Ix^2, Iy^2, IxIy -> gaussian blur(sigma_i)
R = det(M) - k * trace(M)^2
keep R > tau
apply non-maximum suppression
```

Solid defaults for many images are $\sigma_d = 1.0$, $\sigma_i = 1.5$, $k = 0.04$, a threshold relative to the strongest positive response, and a non-maximum-suppression radius of 2 to 3 pixels. A useful rule of thumb is $\sigma_i \ge \sigma_d$ so the local gradient statistics remain stable.

## Implementation notes

- Use grayscale `f32` images internally; integer gradients make tuning harder.
- Separable Gaussian filters are the simplest efficient implementation.
- Sobel derivatives are often sufficient; Scharr is a reasonable upgrade if rotational accuracy matters.
- Harris returns detector points only. For matching or tracking, pair it with a descriptor or a downstream tracker.
- Common production upgrades are adaptive thresholds, subpixel refinement, ROI masks, and scale-space variants.

## Failure modes and tradeoffs

Harris is simple, fast, and well localized, but it is not scale invariant or affine invariant by itself. It can overfire on repeated texture, and its output is sensitive to smoothing and threshold choices. It is a strong detector, not a complete feature pipeline.

If the goal is tracking rather than pure detection, Shi-Tomasi is often a better criterion because it scores the smaller eigenvalue directly. If the scene geometry is highly structured, a specialized detector can outperform Harris by encoding that structure explicitly.

## Used in Vitavision

Vitavision currently focuses on chessboard-specific detection with [ChESS Corners Detector](/blog/01-chesscorners). Harris fits here as a generic baseline and as a useful contrast: it finds general corner-like points, while ChESS encodes the geometry of chessboard X-junctions directly. The longer discussion in [Implementing ChESS Corners in Rust](/blog/01-chess_ai) uses Harris as one of the natural baselines for comparison.

## References

1. C. Harris and M. Stephens, "A Combined Corner and Edge Detector," Alvey Vision Conference, 1988.
2. J. Shi and C. Tomasi, "Good Features to Track," CVPR, 1994.
3. K. Mikolajczyk and C. Schmid, "Scale and Affine Invariant Interest Point Detectors," IJCV, 2004.
