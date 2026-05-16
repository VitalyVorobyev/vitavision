---
title: "Integral Image"
date: 2026-05-16
summary: "A precomputed prefix-sum array that returns the sum of pixel values over any axis-aligned rectangle in constant time with four array reads."
tags: ["classical"]
author: "Vitaly Vorobyev"
domain: features
difficulty: beginner
prerequisites: []
sources:
  primary: viola2001-detector
  references:
    - bay2006-surf
    - calonder2010-brief
    - rublee2011-orb
---

# Definition

The integral image — also called a summed-area table — is a precomputed two-dimensional prefix-sum array derived from a grayscale input image. Every entry stores the sum of all pixel values above and to the left of that position, inclusive. Any axis-aligned rectangular sum over the original image can then be retrieved using exactly four array reads, in time independent of the rectangle's area.

:::definition[Integral image and rectangle sum]
Given a grayscale image $I$ of width $W$ and height $H$, the integral image $II$ is defined at every pixel $(x, y)$ by

$$II(x,\, y) = \sum_{\substack{x' \le x \\ y' \le y}} I(x',\, y').$$

For a rectangle with corners $A$ (top-left), $B$ (top-right), $C$ (bottom-left), $D$ (bottom-right), the pixel sum $S$ over the rectangle is

$$S = II(D) - II(B) - II(C) + II(A).$$

The evaluation cost is $O(1)$ regardless of rectangle dimensions.
:::

# Mathematical Description

## Construction by two-pass recurrence

The integral image is computed in a single scan over the input using two scalar recurrences. A column accumulator $s(x, y)$ holds the running column sum,

$$s(x,\, y) = s(x,\, y-1) + I(x,\, y), \qquad s(x,\, -1) = 0,$$

which is then accumulated horizontally,

$$II(x,\, y) = II(x-1,\, y) + s(x,\, y), \qquad II(-1,\, y) = 0.$$

These two recurrences traverse the image once in row-major order, writing $O(WH)$ values with $O(1)$ arithmetic per pixel. No temporary buffer larger than one column is required.

## Constant-time rectangle sum

Given the integral image, the pixel sum over a rectangle spanning columns $[x_1, x_2]$ and rows $[y_1, y_2]$ is computed with four reads — $A = II(x_1-1, y_1-1)$, $B = II(x_2, y_1-1)$, $C = II(x_1-1, y_2)$, $D = II(x_2, y_2)$ — and the combination $S = D - B - C + A$. The cost is independent of $(x_2 - x_1)$ and $(y_2 - y_1)$, which is what makes box-filter convolutions at multiple scales practical on a CPU.

## Rotated integral images

Sums over $45°$-tilted rectangles — required by SURF and the rotated-rectangle Haar features — use a rotated integral image $II_R$ that accumulates pixel values along a diagonal,

$$II_R(x,\, y) = \sum_{\substack{|x' - x| \le y - y' \\ y' \le y}} I(x',\, y').$$

A sum over a $45°$-rotated rectangle then reduces to a small fixed number of reads of $II_R$, keeping tilted features as cheap as axis-aligned ones.

## Higher-order tables

A squared integral image accumulates $I(x', y')^2$ using the same two-pass recurrence. With first and squared rectangle sums $S_1(R)$ and $S_2(R)$, the pixel variance over any rectangle is recovered in $O(1)$,

$$\mathrm{Var}(R) = \frac{S_2(R)}{|R|} - \left(\frac{S_1(R)}{|R|}\right)^2,$$

which Viola and Jones use to variance-normalise each detection sub-window before feature evaluation.

# Numerical Concerns

**Accumulator magnitude and integer overflow.** The bottom-right entry of the integral image equals the sum of all pixels. For a $W \times H$ image with 8-bit pixels the maximum is $255\,WH$; a 32-bit unsigned accumulator overflows once $255\,WH > 2^{32}-1$, i.e. for images larger than roughly $4100 \times 4100$ pixels. The squared integral image reaches $255^2\,WH$ and overflows a 32-bit accumulator at roughly $660 \times 660$ pixels — so squared tables require 64-bit accumulators at any practical resolution.

**Loss of significance in rectangle sums.** The four-tap formula subtracts two large, nearly equal quantities when the rectangle sits near the bottom-right corner. In floating-point implementations this causes catastrophic cancellation when $D \approx B + C$; integer implementations are exact provided the accumulator is wide enough. Floating-point integral images should use 64-bit doubles when sub-pixel precision is required.

**Variance-normalisation instability.** Computing $\sigma = \sqrt{\mu_2 - \mu^2}$ from two integral images subtracts two large squared quantities; for a nearly uniform sub-window $\mu_2 \approx \mu^2$ and rounding can drive the argument slightly negative, producing a NaN. Implementations should clamp the argument to zero before the square root.

**Border initialisation.** The recurrence requires the sentinels $II(-1, y) = 0$ and $s(x, -1) = 0$. Implementations typically pad the array with one zero row and column and offset all lookups by one; a missing border silently corrupts every rectangle sum that touches the image edge.

**Cache behaviour.** The four corner reads $A, B, C, D$ span two distinct cache lines for all but single-row rectangles. For feature detection with many small rectangles the access pattern is irregular enough to produce frequent cache misses; tiling construction and evaluation improves throughput.

# Where it appears

- [viola-jones-detector](/atlas/viola-jones-detector) — the integral image is the enabling primitive: each two-, three-, or four-rectangle Haar feature over a $24 \times 24$ sub-window is retrieved in four reads regardless of rectangle size, and a second squared integral image supplies the sub-window variance used for contrast normalisation. Both tables are computed once per image and reused across all scales and positions.
- [surf](/atlas/surf) — replaces continuous Gaussian second-derivative filters with box-filter approximations $D_{xx}, D_{yy}, D_{xy}$ evaluated on the integral image in $O(1)$ per pixel; the box-filter size grows across octaves while the image stays at full resolution, so all filter sizes are equally cheap.
- [brief](/atlas/brief) — integral-image box filtering is a fast approximation to the Gaussian patch smoothing that precedes the binary tests, the step that dominates BRIEF's descriptor-computation time.
- [orb](/atlas/orb) — reads $5 \times 5$ sub-window mean intensities from an integral image for its steered binary tests, and computes the patch moments behind its intensity-centroid orientation as integral-image sub-window sums.

# References

1. P. Viola, M. Jones. *Rapid Object Detection using a Boosted Cascade of Simple Features.* IEEE CVPR, 2001.
2. H. Bay, T. Tuytelaars, L. Van Gool. *SURF: Speeded Up Robust Features.* ECCV, 2006.
3. M. Calonder, V. Lepetit, C. Strecha, P. Fua. *BRIEF: Binary Robust Independent Elementary Features.* ECCV, 2010.
4. E. Rublee, V. Rabaud, K. Konolige, G. Bradski. *ORB: An Efficient Alternative to SIFT or SURF.* IEEE ICCV, 2011.
5. F. C. Crow. *Summed-Area Tables for Texture Mapping.* ACM SIGGRAPH, 1984.
