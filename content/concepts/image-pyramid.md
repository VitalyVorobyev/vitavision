---
title: "Image Pyramid"
date: 2026-05-16
summary: "A discrete multi-resolution representation — a sequence of images at progressively coarser resolution, each smoothed and downsampled from its predecessor."
tags: ["multi-scale"]
author: "Vitaly Vorobyev"
domain: image-formation
difficulty: intermediate
prerequisites: []
sources:
  primary: lowe2004-sift
  references:
    - abeles2021-pyramidal
    - bay2006-surf
---

# Definition

An image pyramid is a discrete multi-resolution representation of a single image: a finite sequence of images at progressively coarser spatial resolution, each derived from its predecessor by smoothing and downsampling.

:::definition[Gaussian image pyramid]
Given an input image $L_0 = I$, each successive pyramid level is formed by convolving with a Gaussian kernel $G_\sigma$ and then halving the spatial resolution,

$$L_{k+1} = \mathrm{down}\!\left(G_\sigma * L_k\right),$$

where $\mathrm{down}(\cdot)$ discards every other row and column. Input: a 2-D image $I$ of size $W \times H$. Output: a stack of $K+1$ images at resolutions $W/2^k \times H/2^k$.
:::

The pyramid groups levels into **octaves**: within an octave the resolution is fixed while the effective smoothing scale doubles; between octaves the image is downsampled by two. Each octave is divided into $s$ intra-octave sub-levels, giving a geometric progression of effective scales $\sigma_{k,j} = \sigma_0 \cdot 2^{k + j/s}$. The continuous object the pyramid samples is the [scale space](/atlas/scale-space) — the one-parameter family $L(x,y;\sigma) = G_\sigma * I$; the pyramid is its sampled, downsampled realisation.

# Mathematical Description

## Gaussian pyramid

Within a single octave the images are obtained by successive blurring at scale ratios $k^j$ with

$$k = 2^{1/s},$$

and the blur at sub-level $j$ of octave $o$ is $\sigma_{o,j} = \sigma_0 \cdot 2^{o + j/s}$. The image starting octave $o+1$ is the downsampled last sub-level of octave $o$. SIFT uses $s = 3$ sub-levels per octave, so $k = 2^{1/3} \approx 1.26$, and holds $s + 3 = 6$ Gaussian-blurred images per octave so that Difference-of-Gaussian extrema can be bracketed over a full octave without boundary gaps. The base scale is $\sigma_0 = 1.6$, and the input is upsampled by two before the first octave to recover fine structure.

## Difference-of-Gaussian pyramid

The Difference-of-Gaussian (DoG) pyramid subtracts adjacent Gaussian levels within an octave,

$$D(x, y; \sigma) = L(x, y;\, k\sigma) - L(x, y;\, \sigma),$$

an efficient approximation to the scale-normalised Laplacian: by the heat equation $L(\cdot; k\sigma) - L(\cdot; \sigma) \approx (k-1)\,\sigma^2\,\nabla^2 G * I$. The DoG achieves Laplacian-based extrema detection by image subtraction rather than explicit second-derivative convolution. SIFT detects keypoints at 3-D local extrema of $D$ in a $3 \times 3 \times 3$ neighbourhood spanning the scale above and below.

## Fixed-image, growing-filter alternative

SURF inverts the construction: instead of downsampling the image, it keeps the image at full resolution and enlarges the filter. The Hessian entries are approximated by box filters evaluated on an integral image in $O(1)$ per pixel; the first octave uses filter sizes $9 \times 9$, $15 \times 15$, $21 \times 21$, $27 \times 27$ (steps of 6 pixels, doubling per octave). All scale levels keep the input resolution, so detected extrema have identical spatial precision at every scale and no resampling error is incurred — at the cost of an integral image precomputed over the full input.

# Numerical Concerns

**Aliasing from insufficient pre-smoothing.** Downsampling by two without prior blurring aliases frequencies above the coarser grid's Nyquist limit; pre-smoothing to at least $\sigma = 1.0$ pixel before halving satisfies the Nyquist condition.

**Assumed input blur.** SIFT assumes the input already carries $\sigma = 0.5$ blur from camera optics; reaching the base scale $\sigma_0$ requires a corrective Gaussian $\sigma_\Delta = \sqrt{\sigma_0^2 - \sigma_{\text{assumed}}^2}$. If the assumed blur is wrong, under-smoothing produces spurious DoG extrema and over-smoothing destroys fine features; the corrective computation is undefined when the assumed blur already exceeds $\sigma_0$.

**Interpolation in upsampling.** Resampling a coarse-level result back to full resolution by bilinear interpolation introduces a smoothing bias proportional to the local image Hessian — negligible for display, significant for sub-pixel localisation on upsampled level data.

**Level count.** The pyramid terminates when the image is too small to support meaningful detection — typically when the shorter side falls below roughly 8–16 pixels; carrying further levels yields responses dominated by Gaussian boundary effects rather than image structure.

**Fixed-image vs fixed-filter trade-off.** The classical pyramid discards half the pixels per octave — less memory and computation at coarse scales, but cross-octave coordinate mapping is required. The integral-image approach keeps full resolution at every scale at the cost of $O(WH)$ integral-image storage and box-filter-size quantisation to odd integers.

# Where it appears

The image pyramid is the shared multi-resolution data structure behind every algorithm that must detect or describe features across scale change.

- [sift](/atlas/sift) — the canonical Gaussian/DoG pyramid: $s + 3 = 6$ Gaussian images per octave with $s = 3$, differenced to a DoG pyramid whose 26-neighbour extrema are the keypoints; the scale of the extremal response is the keypoint's assigned scale.
- [surf](/atlas/surf) — the fixed-image, growing-filter alternative: Hessian-determinant responses from integral-image box filters at sizes $9 \times 9$ to $27 \times 27$, every level at input resolution.
- [orb](/atlas/orb) — a scale pyramid for multi-scale FAST detection, applying the FAST detector independently at each level for scale-invariant keypoints without a Gaussian scale-space.
- [pyramidal-blur-aware-xcorner](/atlas/pyramidal-blur-aware-xcorner) — a Gaussian pyramid for chessboard X-corner detection under blur, selecting per corner the level that maximises the response-to-resolution ratio.

The continuous object the pyramid discretises is the [scale-space](/atlas/scale-space) concept.

# References

1. P. J. Burt, E. H. Adelson. *The Laplacian Pyramid as a Compact Image Code.* IEEE Transactions on Communications, 31(4):532–540, 1983.
2. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 60(2):91–110, 2004.
3. H. Bay, T. Tuytelaars, L. Van Gool. *SURF: Speeded Up Robust Features.* ECCV, 2006.
4. P. Abeles. *Pyramidal Blur Aware X-Corner Chessboard Detector.* arXiv 2110.13793, 2021.
5. T. Lindeberg. *Scale-Space Theory in Computer Vision.* Kluwer Academic Publishers, 1994.
