---
title: "Shi-Tomasi Corner Detector"
date: 2026-03-29
summary: "A corner detector that keeps points whose weakest directional intensity change is still strong."
tags: ["computer-vision", "feature-detection", "tracking", "calibration"]
author: "Vitaly Vorobyev"
relatedPosts: ["01-chesscorners", "01-chess_ai"]
relatedAlgorithms: ["harris-corner-detector", "fast-corner-detector", "chess-corners"]
---

The Shi-Tomasi detector finds corner points by requiring that image intensity change strongly in two directions, but it scores them more directly than Harris. Instead of using a combined determinant-trace response, it keeps points whose smaller second-moment eigenvalue is large. That makes it a particularly strong choice for tracking and for "good features to track" style pipelines.

## What problem this solves

Like Harris, Shi-Tomasi tries to reject flat regions and ambiguous edges while keeping localized, repeatable corner points. The difference is in the acceptance rule: Shi-Tomasi asks whether the weaker of the two principal intensity-change directions is still strong enough. This is a more direct way to ensure that the point remains trackable under small motion.

## Core idea

Shi-Tomasi uses the same second-moment matrix as Harris:

$$
M = G_{\sigma_i} *
\begin{bmatrix}
I_x^2 & I_x I_y \\
I_x I_y & I_y^2
\end{bmatrix}.
$$

Let $\lambda_1$ and $\lambda_2$ be the eigenvalues of $M$, ordered so that $\lambda_1 \geq \lambda_2$. The Shi-Tomasi score is

$$
R = \min(\lambda_1, \lambda_2).
$$

Interpretation is simple:

- both eigenvalues small: flat region
- one large, one small: edge
- both large: corner

The detector keeps points where the smaller eigenvalue exceeds a threshold, then applies non-maximum suppression.

## Minimal pipeline

```text
gray -> gaussian blur(sigma_d) -> gradients Ix, Iy
Ix^2, Iy^2, IxIy -> gaussian blur(sigma_i)
compute eigenvalues of M
keep min(lambda1, lambda2) > tau
apply non-maximum suppression
```

Reasonable defaults are close to Harris: $\sigma_d \approx 1.0$, $\sigma_i \approx 1.5$, a threshold relative to the strongest response, and an NMS radius of 2 to 3 pixels.

## Implementation notes

- The detector shares almost all preprocessing with Harris, so both are easy to compare in the same codebase.
- The main extra cost is the per-pixel eigenvalue computation, which is still cheap for dense images.
- Shi-Tomasi is often preferred for KLT-style tracking because the minimum-eigenvalue criterion matches the "trackability" intuition directly.
- Subpixel refinement and pyramid search are common downstream additions.

## Failure modes and tradeoffs

Shi-Tomasi is better aligned with tracking quality than Harris, but it still is not scale invariant or affine invariant by itself. It can overfire on repeated texture, and threshold choice remains scene-dependent. It is also less specialized than pattern-aware detectors such as ChESS, so it will not match target-specific methods when the geometry is known in advance.

## Used in Vitavision

Vitavision currently emphasizes chessboard-specific detection with [ChESS Corners Detector](/blog/01-chesscorners), but Shi-Tomasi is a natural generic baseline when the goal is stable tracking rather than target-specific selectivity. It sits between Harris and specialized detectors: more tracking-oriented than Harris, more general than ChESS.

## References

1. J. Shi and C. Tomasi, "Good Features to Track," CVPR, 1994.
2. C. Harris and M. Stephens, "A Combined Corner and Edge Detector," Alvey Vision Conference, 1988.
3. B. D. Lucas and T. Kanade, "An Iterative Image Registration Technique with an Application to Stereo Vision," IJCAI, 1981.
