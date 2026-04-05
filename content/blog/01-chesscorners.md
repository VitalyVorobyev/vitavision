---
title: "ChESS Corners Detector"
date: 2026-03-20
summary: "A chessboard-specific detector, from sampling geometry to a practical multiscale implementation."
tags: ["computer-vision", "rust", "calibration", "feature-detection"]
author: "Vitaly Vorobyev"
repoLinks: ["https://github.com/vitalyvorobyev/chess-corners-rs"]
relatedAlgorithms: ["chess-corners"]
---

# 1. Introduction

Calibrating visual sensors in challenging setups is part of my job. In practice this means multi-camera rigs, significant lens distortion, tilted optics, and images where corner localization is expected to be both accurate and stable. At some point it became clear to me that the [OpenCV](https://opencv.org) calibration toolset was not good enough for my use cases: not only from the accuracy standpoint, but also in terms of performance, robustness, and control over the full pipeline. That is how I started building my own calibration stack, beginning with chessboard target detection.

The first question was simple: how should one detect chessboard corners?

There are classical feature detectors such as [Harris](), [Shi-Tomasi](), and [FAST](algorithms/fast-corner-detector). They are general-purpose tools, and they can certainly respond to chessboard corners. But a chessboard corner is not just any corner. It is a very specific local intensity pattern: an **X-junction**. Once this is taken seriously, a natural idea appears: instead of applying a general detector and hoping it behaves well, one can build a detector directly for this pattern.

OpenCV’s classical chessboard detector follows a different route: it starts from segmenting black squares and then derives corners from the recovered geometry. That can work well, but it also couples the problem to global board structure and to the stability of segmentation.

A literature search brought me to the [ChESS]() paper, where the authors propose an elegant, robust, and efficient detector designed specifically for chessboard-like X-junctions. In my view, this idea is undervalued in the vision community. It is simple, fast, and very well aligned with the actual structure of the problem.

This post is devoted to the ChESS algorithm. The discussion follows the original paper fairly closely, though the emphasis here is practical: what the response is doing, why the extra terms are needed, and why this design works so well in real calibration pipelines.

# 2. The ChESS response

The ChESS detector computes a score for each pixel. Pixels that lie on X-junctions receive a large score; pixels on edges, stripes, or textured regions should ideally not.

The core idea is to sample a ring of 16 pixels around the pixel of interest, at radius 5:

![ChESS sampling ring with 16 pixels at radius 5](./images/01-chess/chess-response-corner-dr.svg)

This radius is not arbitrary. It is the smallest radius at which these 16 samples can be placed with nearly uniform angular spacing. That gives a compact and symmetric stencil while still keeping the sampling geometry well behaved.

## The sum response

![Sum response on an ideal chessboard corner](./images/01-chess/chess-response-corner-sr.svg)

A chessboard corner creates an alternating pattern on the ring: bright - dark - bright - dark. This means that opposite samples tend to have similar intensity, while samples rotated by $90^\circ$ tend to be out of phase. This leads to the basic combination

$$
I_n + I_{n+8} - I_{n+4} - I_{n+12}.
$$

When the ring is centered on a true X-junction, this quantity becomes large in magnitude. Summing the four phase-equivalent versions gives the *sum response*:

$$
SR = \sum_{n=0}^{3} \left| I_n + I_{n+8} - I_{n+4} - I_{n+12} \right|.
$$

This already captures the main signal of a chessboard corner. But it is not enough, because other structures can also produce a strong response. In particular, two false-positive families matter here: edges and narrow stripes.

## Rejecting edges

Consider the edge case shown below.

![Sum response on an edge pattern](./images/01-chess/chess-response-edge-sr.svg)

An edge can still produce a substantial value of $SR$. The reason is simple: one phase of the ring may look strongly unbalanced even though the structure is not an X-junction. So we need a term that explicitly responds to edge-like patterns.

The key observation is that on an edge, opposite samples often have opposite brightness. This leads to the *diff response*:

$$
DR = \sum_{n=0}^{7} |I_n - I_{n+8}|.
$$

![Diff response on an edge pattern](./images/01-chess/chess-response-edge-dr.svg)

This term is large on edges and relatively small on true chessboard corners. So the natural next step is to penalize the sum response by the diff response:

$$
SR - DR.
$$

At this point the detector already separates corners from edges much better.

## Rejecting strips

The second false-positive case is more subtle. A narrow stripe can produce almost the same ring pattern as a true corner.

![Sum response on a narrow stripe pattern](./images/01-chess/chess-response-stripe-sr.svg)

This is an important point: the ambiguity cannot be resolved from the ring samples alone. The missing information lies near the center of the pattern, as illustrated below.

![Mean response on a narrow stripe pattern](./images/01-chess/chess-response-stripe-mr.svg)

The trick is to compare two averages:

- the average intensity over the five central pixels, denoted $I_{center}$
- the average intensity over the 16 ring samples, denoted $I_{ring}$

Their difference defines the *mean response*:

$$
MR = |I_{center} - I_{ring}|.
$$

For a true X-junction, the center region and the ring behave differently than they do for a narrow stripe. This makes $MR$ an effective penalty term for strip-like configurations.

The final ChESS response is therefore

$$
R = SR - DR - 16 \times MR.
$$

That completes the definition of the detector response. The final expression is still extremely compact: it requires only a small fixed number of intensity reads and arithmetic operations per pixel. This is one of the reasons the detector is so attractive in practice.

## From heat map to features

The response above gives a dense heat map, but in practice we need actual feature points.

The standard next step is straightforward: compute the response image, suppress negative or weak values, and run non-maximum suppression to keep only local maxima. This converts a dense pixel-wise score into a sparse set of corner candidates.

In practice, this stage matters more than one might think. A good response alone is not enough if the peak extraction logic is noisy or unstable. In my own implementation, the detector stage is therefore cleanly separated into:

1. response computation
2. candidate extraction from local maxima
3. optional multiscale aggregation
4. optional subpixel refinement

This separation turns out to be very useful, because it allows one to reason about each stage independently and to profile the actual bottlenecks.

## Corner orientation

An additional strength of the ChESS design is that it gives orientation information almost for free.

Since the response is built from several phase-shifted configurations on the sample ring, the detector can estimate the local orientation of the X-junction from the relative strength of these configurations. This orientation is not just decorative metadata. It is very useful when one wants to reconstruct global board structure, propagate hypotheses across neighboring corners, or reject inconsistent false positives.

This is one of the aspects that makes ChESS much more than “just another corner score”. It is already a structured local detector, and that structure becomes very valuable in downstream calibration-target reconstruction.

# 3. The `chess-corners-rs` crate

A Rust implementation of the ChESS detector is available in [this repository](https://github.com/VitalyVorobyev/chess-corners-rs). A minimal code example is shown below:

```rust
use chess_corners::{ChessConfig, find_chess_corners_image};
use image::ImageReader;

let img = ImageReader::open("board.png")?.decode()?.to_luma8();
let cfg = ChessConfig::single_scale();

let corners = find_chess_corners_image(&img, &cfg);
println!("found {} corners", corners.len());
if let Some(c) = corners.first() {
    println!(
        "corner at ({:.2}, {:.2}), response {:.1}, theta {:.2} rad",
        c.x, c.y, c.response, c.orientation
    );
}
```

The crate is not just a direct translation of the paper formula. In addition to the core response, it includes practical logic for multiscale detection, fast feature extraction, and several subpixel refinement options. These details are important in real pipelines, but discussing them properly would require a separate post.

## Performance test

Performance was tested on the following 1024x576 image ([source](https://www.kaggle.com/datasets/danielwe14/stereocamera-chessboard-pictures)):

![Example 1024 by 576 chessboard image used for benchmarking](./images/01-chess/mid_chess.png)

The test was performed on a MacBook Pro M4.

With `simd` and `rayon` features enabled, ChESS corner detection took 1.2 ms on this image. A three-level image pyramid without these features took 0.7 ms. This is a reminder that practical performance depends not only on low-level acceleration, but also on algorithmic structure and on how much work is done at each scale.

For comparison, running the OpenCV Harris detector on the same image took 3.9 ms, while still giving only generic pixel-level corner candidates rather than chessboard-specific features. Comparing directly against OpenCV’s `findChessboardCornersSB` is less meaningful, because that function solves a larger problem: recovering the board structure, not just computing a local corner detector. On this image it took 115 ms.

A more relevant comparison, in my view, is the end-to-end detector stack built on top of ChESS. My own chessboard detector based on this primitive (see [this repo](https://github.com/VitalyVorobyev/calib-targets-rs?tab=readme-ov-file#chessboard)) detects the full board in 2.9 ms on this example.

A more detailed [performance report](https://github.com/VitalyVorobyev/chess-corners-rs/blob/main/book/src/part-05-performance-and-integration.md) is available in the repository.

## Python API

```python
import numpy as np
import chess_corners

img = np.zeros((128, 128), dtype=np.uint8)
cfg = chess_corners.ChessConfig()

corners = chess_corners.find_chess_corners(img, cfg)
print(corners.shape, corners.dtype)
```

# 4. Final thoughts

What I like about the ChESS approach is that it is specialized in exactly the right way.

It is not a generic interest point detector that merely happens to fire on chessboard corners. It is a detector built for the geometry and photometric structure of an X-junction. That gives it several practical advantages:

* It provides orientation information for each corner. This is very useful for recovering global structure and rejecting false positives.
* It does not require committing to a global board model at the response stage. This makes it attractive in the presence of strong lens distortion and other difficult imaging conditions.
* It produces an interpretable quality score, which gives direct control over detection sensitivity and the recall-precision tradeoff.
* It is computationally simple. That simplicity translates directly into fast implementations, parallel execution, and clean multiscale extensions.

In short, ChESS is a rare example of a detector that is at the same time elegant, practical, and fast enough for real systems.

Finally, you can play with the [interactive ChESS illustration](/algorithms/chess-response-design).
