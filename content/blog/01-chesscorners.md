---
title: "ChESS Corners Detector"
date: 2026-04-22
summary: "A chessboard-specific detector, from sampling geometry to a practical multiscale implementation."
tags: ["computer-vision", "rust", "calibration", "feature-detection"]
author: "Vitaly Vorobyev"
repoLinks: ["https://github.com/vitalyvorobyev/chess-corners-rs"]
relatedAlgorithms: ["chess-corners"]
difficulty: intermediate
---

# 1. Introduction

Calibrating visual sensors in challenging setups is part of my job. In practice this means multi-camera rigs, significant lens distortion, tilted optics, and images where corner localization is expected to be both accurate and stable. At some point it became clear to me that the [OpenCV](https://opencv.org) calibration toolset was not good enough for my use cases: not only in terms of accuracy, but also in terms of performance, robustness, and control over the full pipeline. That is how I started building my own calibration stack, beginning with chessboard target detection.

The first question was simple: how should one detect chessboard corners?

Classical detectors such as [Harris](/algorithms/harris-corner-detector), [Shi-Tomasi](/algorithms/shi-tomasi-corner-detector), or [FAST](/algorithms/fast-corner-detector) are designed to react to corner-like structures in general. That is exactly why they are broadly useful, and also why they are not ideal here. A chessboard corner is more specific than a generic corner: locally, it forms an X-junction with an alternating black-white arrangement. Since this structure is known in advance, it is better to encode it directly in the detector.

(The OpenCV’s chessboard detector follows a different route: it starts from segmenting black squares and then derives corners from the recovered geometry. That works well, but it couples the problem to global board structure and requires the whole pattern to be visible, which is not acceptable in my case)

Bennett and Lasenby [proposed](https://arxiv.org/abs/1301.5491) an elegant, robust, and efficient detector, ChESS (Chess-board Extraction by Subtraction and Summation), designed specifically for chessboard-like X-junctions. In my view, this idea deserves more attention in the vision community. In this post, we will look at ChESS in some detail, closely following the original paper. By the end, you should have a clear picture of how [my implementation of ChESS](https://github.com/VitalyVorobyev/chess-corners-rs) works.

# 2. The ChESS response

The ChESS detector computes a score for each pixel. Pixels that lie on X-junctions receive a large score; pixels on edges, stripes, or textured regions should ideally not.

The core idea is to sample a ring of 16 pixels around the pixel of interest, at radius 5:

![ChESS sampling ring with 16 pixels at radius 5](./images/01-chess/chess-response-corner-dr.svg)

Radius 5 is chosen because it is the smallest radius at which these 16 samples can be arranged with nearly uniform angular spacing. At the same time, it keeps the detector local.

## The sum response

![Sum response on an ideal chessboard corner](./images/01-chess/chess-response-corner-sr.svg)

A chessboard corner creates an alternating pattern on the ring: bright, dark, bright, dark. This means that opposite samples tend to have similar intensity, while samples rotated by $90^\circ$ tend to be out of phase. This leads to the basic combination

$$
I_n + I_{n+8} - I_{n+4} - I_{n+12}.
$$

When the ring is centered on a true X-junction, this quantity becomes large in magnitude. Summing the four rotated versions gives the *sum response*:

$$
SR = \sum_{n=0}^{3} \left| I_n + I_{n+8} - I_{n+4} - I_{n+12} \right|.
$$

This already captures the main signal of a chessboard corner. But it is not enough, because other structures can also produce a strong response. In particular, two false-positive families matter here: edges and narrow stripes.

## Rejecting edges

Consider the edge case shown below.

![Sum response on an edge pattern](./images/01-chess/chess-response-edge-sr.svg)

For an ideal strait edge, $SR$ is exactly zero, because the sampling pattern lacks the alternating structure of a chessboard corner and the corresponding terms cancel. Real images, however, are affected by noise, blur, discretization, and centering errors, all of which can break this symmetry and produce a spurious response. This motivates the introduction of a separate edge-sensitive term.

The key observation is that on an edge, opposite samples often have opposite brightness. This leads to the *diff response*:

$$
DR = \sum_{n=0}^{7} |I_n - I_{n+8}|.
$$

![Diff response on an edge pattern](./images/01-chess/chess-response-edge-dr.svg)

This term is large on edges and relatively small on true chessboard corners. So the natural next step is to penalize the sum response by the diff response:

$$
SR - DR.
$$

This gives exactly the desired behavior: true chessboard corners retain a strong response, while edge-like structures are suppressed.

## Rejecting strips

The second false-positive case is more subtle. A narrow stripe can produce almost the same ring pattern as a true corner.

![Sum response on a narrow stripe pattern](./images/01-chess/chess-response-stripe-sr.svg)

This is an important limitation: the ambiguity cannot be resolved from the ring samples alone. The missing information lies near the center of the pattern, as illustrated below.

![Mean response on a narrow stripe pattern](./images/01-chess/chess-response-stripe-mr.svg)

The solution is to compare two averages:

- the average intensity over the five central pixels, denoted $I_{center}$
- the average intensity over the 16 ring samples, denoted $I_{ring}$

Their difference defines the *mean response*:

$$
MR = |I_{center} - I_{ring}|.
$$

For a true X-junction, the relationship between the center region and the outer ring differs from that of a narrow stripe. This makes $MR$ an effective penalty term for strip-like configurations.

The final ChESS response is therefore

$$
R = SR - DR - 16 \times MR.
$$

With this term included, the detector distinguishes true chessboard corners from the main false-positive structures discussed above. The final expression remains remarkably compact: it requires only a small fixed number of intensity reads and arithmetic operations per pixel. This is one of the reasons ChESS is so attractive in practice.

The demo below shows how the ChESS score behaves on three characteristic patterns: a true corner, an edge, and a narrow stripe.

:::illustration[chess-response]{preset="compact" pattern="corner"}
:::

## From heat map to features

The response defined above gives a dense heat map, but in practice we need actual feature points.

The next step is standard: compute the response image, suppress negative or weak values, and apply non-maximum suppression to retain only local maxima. This converts a dense pixel-wise score into a sparse set of corner candidates at pixel precision.

Pixel precision, however, is rarely sufficient. In computer vision, a pixel is already a fairly large unit, and good feature localization is typically expected to reach roughly one tenth of a pixel. This calls for an additional subpixel refinement step.

The ChESS response is usually quite symmetric around a true corner. Because of that, even a simple center-of-mass refinement works well. Take a small window around the candidate, for example $5 \times 5$ pixels, and compute the centroid of the local response distribution:

$$
x_{\mathrm{sub}} = \frac{\sum x \cdot w(x,y)}{\sum w(x,y)},
\qquad
y_{\mathrm{sub}} = \frac{\sum y \cdot w(x,y)}{\sum w(x,y)},
$$

where the sums run over all $(x, y)$ in the refinement window, and $w(x,y)$ is the ChESS response at pixel $(x, y)$.


In my implementation, I use several classical subpixel refinement methods, as well as a CNN-based refiner. That part deserves a separate discussion, so I will return to it in another post.


## Corner orientation

Besides the corner position itself, I also compute a local corner orientation.

This is done after detection and subpixel refinement. For each corner, I sample the original grayscale image on a 16-point ring around the refined subpixel location, using bilinear interpolation. After subtracting the mean ring intensity, these 16 values can be viewed as a small periodic signal around the circle. The idea is similar to a Fourier transform: instead of keeping the full signal, we measure the strength and phase of the component that matches the chessboard-corner pattern.

For an X-junction, the relevant pattern repeats twice as one goes around the ring. So I extract exactly this component:

$$
M = \sum_i (s_i - \bar{s}) , e^{j 2 \phi_i},
\qquad
\theta = \frac{1}{2}\operatorname{atan2}(\operatorname{Im} M, \operatorname{Re} M).
$$

Here $s_i$ are the ring samples, $\bar{s}$ is their mean, and $\phi_i$ is the angle of the $i$-th sample on the ring.

This is not a gradient orientation, and it is not derived from the ChESS response map. It is computed directly from the intensity pattern on the sampling ring.

This orientation becomes useful later when reconstructing board structure and filtering out geometrically inconsistent detections.

# 3. ChESS in Rust

I implemented the ChESS feature detector in Rust in[this repository](https://github.com/VitalyVorobyev/chess-corners-rs). You can install it with cargo:

```
cargo add chess-corners
```

and use like that 


```rust
use chess_corners::{ChessConfig, RefinementMethod, find_chess_corners_image};
use image::ImageReader;

let img = ImageReader::open("board.png")?.decode()?.to_luma8();

let mut cfg = ChessConfig::multiscale();
cfg.threshold_value = 0.15;
cfg.refiner.kind = RefinementMethod::Forstner;

let corners = find_chess_corners_image(&img, &cfg);
println!("found {} corners", corners.len());
```

Python bindings are also available on PyPI:

```bash
uv pip install chess-corners
```

Usage is similarly straightforward:

```python
import numpy as np
import chess_corners

img = np.zeros((128, 128), dtype=np.uint8)
cfg = chess_corners.ChessConfig.multiscale()
corners = chess_corners.find_chess_corners(img, cfg)
```

The implementation includes features that are not discussed in this post, such as multiscale detection using an image pyramid, and exposes a number of configuration parameters. In most practical cases, however, the default settings should work well.

The image below shows an example input used for benchmarking:

![Example 1024 by 576 chessboard image used for benchmarking](./images/01-chess/mid_chess.png)

One notable property of this detector is its speed. Performance can be further improved by enabling the rayon feature for parallel execution and the simd feature for vectorized computation. With both enabled, detecting features in the image above (1024 \times 576 pixels) takes about 1.2 ms on my MacBook Pro with an M4 chip. On the same image, OpenCV’s pixel-precise Harris detector takes about 3.9 ms, while findChessboardCornersSB takes about 115 ms.

That comparison should be interpreted with care. At this stage, my implementation detects corners, but it does not yet recover the global board structure. In a later post, I will show how to build a complete chessboard detector on top of ChESS, which will make the comparison with findChessboardCornersSB more direct.

A more detailed discussion can be found in the [performance report](https://github.com/VitalyVorobyev/chess-corners-rs/blob/main/book/src/part-05-performance-and-integration.md).

# 4. Final thoughts

What I like about the ChESS approach is that it is specialized in exactly the right way.

It is not a generic interest point detector that merely happens to fire on chessboard corners. It is a detector built for the geometry and photometric structure of an X-junction. That gives it several practical advantages:

* It provides orientation information for each corner. This is very useful for recovering global structure and rejecting false positives.
* It does not require committing to a global board model at the response stage. This makes it attractive in the presence of strong lens distortion and other difficult imaging conditions.
* It produces an interpretable quality score, which gives direct control over detection sensitivity and the recall-precision tradeoff.
* It is computationally simple. That simplicity translates directly into fast implementations, parallel execution, and clean multiscale extensions.

In short, ChESS is a rare example of a detector that is at the same time elegant, practical, and fast enough for real systems.


## See also

- [ChESS Corners algorithm page](/algorithms/chess-corners)
- [Harris Corner Detector](/algorithms/harris-corner-detector)
- [Shi-Tomasi Corner Detector](/algorithms/shi-tomasi-corner-detector)
- [FAST Corner Detector](/algorithms/fast-corner-detector)
- [ChESS interactive demo](/demos/chess-response)
