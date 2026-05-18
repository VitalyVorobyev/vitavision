---
title: "SURF: Speeded Up Robust Features"
date: 2026-05-09
summary: "Detects scale- and rotation-invariant blob keypoints as scale-space maxima of the Hessian determinant, approximated with box filters on an integral image, and emits a 64-D Haar-wavelet response descriptor matched by Euclidean distance with a Laplacian-sign pre-filter."
tags: ["local-descriptors", "multi-scale", "blob-detection"]
domain: features
tasks: [feature-detection, local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [scale-space, image-gradient, integral-image, image-pyramid]
failureModes: []
relations:
  - type: alternative_formulation_of
    target: sift
    confidence: high
  - type: compared_with
    target: fast-corner-detector
    confidence: medium
    caution: "FAST is detector-only; SURF bundles a descriptor."
  - type: compared_with
    target: harris-corner-detector
    confidence: medium
  - type: compared_with
    target: shi-tomasi-corner-detector
    confidence: medium
  - type: compared_with
    target: orb
    confidence: high
sources:
  primary: bay2006-surf
  references: [lowe2004-sift, harris1988-corner, viola2001-detector]
  notes: |
    Three pillars (Bay et al. 2006). Pillar 1 — Fast-Hessian detector (§3):
    integral image $I_\Sigma(x,y) = \sum_{i \le x, j \le y} I(i, j)$ enables
    constant-time rectangular sums; box filters $D_{xx}, D_{yy}, D_{xy}$
    approximate Gaussian second derivatives with empirical balancing
    $\det(\mathcal{H}_\text{approx}) = D_{xx} D_{yy} - (0.9\, D_{xy})^2$
    (Eq. 2). The factor 0.9 ≈ ratio of Frobenius norms of the lobes;
    squared as 0.81 in the cross-term. Scale-space upscales filters
    instead of downsampling: octave 1 uses 9×9, 15×15, 21×21, 27×27
    (σ = 1.2 at 9×9, σ = 3.6 at 27×27); octave step doubles per octave
    (6, 12, 24). NMS in 3×3×3 (image+scale); sub-pixel/sub-scale via
    quadratic fit (Brown). Pillar 2 — Orientation (§4.1): Haar-wavelet
    responses $d_x, d_y$ at sample step $s$ in a $6s$-radius circular
    neighbourhood (wavelet side $4s$), Gaussian-weighted with σ = 2.5s,
    sliding 60° (π/3) angular window picks the longest summed vector.
    U-SURF skips this step (~28% speed gain). Pillar 3 — Descriptor
    (§4.2): aligned 20s × 20s window, 4×4 sub-region grid, 5×5 sample
    points per sub-region, Haar size 2s, Gaussian σ = 3.3s; per
    sub-region $v = (\sum d_x, \sum |d_x|, \sum d_y, \sum |d_y|)$ ⇒ 64-D
    vector; L2-normalized to unit length. Laplacian-sign of the keypoint
    indexes matching for early reject. SURF-128 splits sums by sign of
    the orthogonal axis. Matching: nearest-neighbour-ratio at 0.7.
---

# Goal

Detect scale- and rotation-invariant blob keypoints in a greyscale image and emit a 64-D descriptor robust to moderate illumination and geometric change. Input: a single-channel image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega$. Output: a set of keypoints $\{(x_i, y_i, s_i, \theta_i)\}$, each paired with a unit-norm descriptor $\mathbf{f}_i \in \mathbb{R}^{64}$ and a Laplacian sign for matching pre-filter. The algorithm is specific to the use of an **integral image** to evaluate **box-filter approximations** of the Hessian determinant in $O(1)$ per pixel regardless of scale, making detection cost independent of the filter size.

# Algorithm

Let $I: \Omega \to \mathbb{R}$ denote the greyscale image and let $I_\Sigma$ denote its integral image. Let $\mathcal{H}(\mathbf{x}, \sigma)$ denote the Hessian matrix of the Gaussian-smoothed image $L(\mathbf{x}, \sigma)$ at point $\mathbf{x} = (x, y)$ and scale $\sigma$. Let $D_{xx}, D_{yy}, D_{xy}$ denote the box-filter approximations of $L_{xx}, L_{yy}, L_{xy}$. Let $s$ denote the keypoint scale parameter. Let $d_x, d_y$ denote Haar-wavelet responses in $x$ and $y$.

:::definition[Integral image]
Cumulative pixel sum that lets any rectangular sum be computed with four lookups regardless of size.

$$
I_\Sigma(x, y) = \sum_{i \le x,\, j \le y} I(i, j).
$$
:::

:::definition[Approximated Hessian determinant]
Detector response combining box-filtered second-derivative approximations with an empirical balancing factor that compensates for the difference in lobe weights between true Gaussian derivatives and the box-filter approximation.

$$
\det(\mathcal{H}_\text{approx}) = D_{xx}\, D_{yy} - (0.9\, D_{xy})^2.
$$
:::

:::definition[Sub-region descriptor vector]
Per-sub-region Haar-wavelet response statistics.

$$
\mathbf{v} = \left(\sum d_x,\; \sum |d_x|,\; \sum d_y,\; \sum |d_y|\right).
$$
:::

The first-octave box-filter sizes are $9, 15, 21, 27$ pixels with the $9 \times 9$ filter corresponding to $\sigma = 1.2$. Subsequent octaves double the inter-filter step (octave step sizes $6, 12, 24, \ldots$). Filter responses are area-normalized so that the Frobenius norm is constant across scales.

:::algorithm[SURF detect-and-describe]
::input[Greyscale image $I$; number of octaves and intervals; Hessian threshold $t$.]
::output[Keypoints $\{(x_i, y_i, s_i, \theta_i)\}$ with 64-D descriptors $\mathbf{f}_i$ and Laplacian signs.]

1. Build the integral image $I_\Sigma$ in a single pass.
2. For each scale layer in each octave, evaluate $\det(\mathcal{H}_\text{approx})$ at every pixel using box filters $D_{xx}, D_{yy}, D_{xy}$ via $I_\Sigma$.
3. Threshold the response at $t$ and apply non-maximum suppression in the $3 \times 3 \times 3$ image-and-scale neighbourhood.
4. Refine each surviving extremum to sub-pixel and sub-scale accuracy by fitting a 3D quadratic to $\det(\mathcal{H}_\text{approx})$ around the discrete maximum.
5. Compute $d_x, d_y$ Haar responses (wavelet side $4s$) at sample step $s$ over a circular neighbourhood of radius $6s$; weight with Gaussian $\sigma = 2.5s$.
6. Slide a $\pi/3$ angular window over the response vectors; assign the dominant orientation $\theta$ as the direction of the longest summed response. (Skip this step for U-SURF.)
7. Build a $20s \times 20s$ window aligned to $\theta$ around the keypoint; split into a $4 \times 4$ grid of sub-regions with $5 \times 5$ sample points each.
8. At each sample point, compute Haar responses $d_x, d_y$ with wavelet side $2s$, Gaussian-weighted with $\sigma = 3.3s$, expressed in the keypoint's rotated frame.
9. For each sub-region, accumulate $\mathbf{v} = (\sum d_x, \sum |d_x|, \sum d_y, \sum |d_y|)$ and concatenate the sixteen 4-vectors into a 64-D descriptor.
10. L2-normalize the descriptor to a unit vector; record the sign of the Hessian trace (Laplacian sign) for matching pre-filter.
:::

![SURF detect-and-describe pipeline: integral image → box-filter Hessian-determinant evaluation → threshold + 3×3×3 NMS → sub-pixel quadratic refinement → Haar-wavelet orientation assignment → 64-D descriptor extraction over 4×4 sub-regions → L2 normalisation with Laplacian-sign indexing.](./images/surf/pipeline.svg)

# Implementation

The Hessian-determinant evaluation is the per-pixel kernel; the integral image makes each box-filter response a constant-time sum. The per-pixel detector response in Rust:

```rust
fn integral_at(ii: &[u32], w: usize, x: i32, y: i32) -> u32 {
    if x < 0 || y < 0 { return 0; }
    ii[(y as usize) * w + (x as usize)]
}

fn box_sum(ii: &[u32], w: usize, x0: i32, y0: i32, x1: i32, y1: i32) -> i32 {
    let a = integral_at(ii, w, x1, y1) as i32;
    let b = integral_at(ii, w, x0 - 1, y1) as i32;
    let c = integral_at(ii, w, x1, y0 - 1) as i32;
    let d = integral_at(ii, w, x0 - 1, y0 - 1) as i32;
    a - b - c + d
}

// Box-filter approximations D_xx, D_yy, D_xy at scale `l` (filter side in pixels),
// evaluated at pixel (x, y) on the integral image `ii` of width `w`.
// Returns det(H_approx) = D_xx * D_yy - (0.9 * D_xy)^2, area-normalised.
fn fast_hessian(ii: &[u32], w: usize, x: i32, y: i32, l: i32) -> f32 {
    let lobe = l / 3;
    let half = l / 2;
    let dxx = box_sum(ii, w, x - l + 1, y - lobe, x + l - 1, y + lobe)
            - 3 * box_sum(ii, w, x - lobe + 1, y - lobe, x + lobe - 1, y + lobe);
    let dyy = box_sum(ii, w, x - lobe, y - l + 1, x + lobe, y + l - 1)
            - 3 * box_sum(ii, w, x - lobe, y - lobe + 1, x + lobe, y + lobe - 1);
    let dxy = box_sum(ii, w, x - lobe, y - lobe, x - 1, y - 1)
            + box_sum(ii, w, x + 1, y + 1, x + lobe, y + lobe)
            - box_sum(ii, w, x + 1, y - lobe, x + lobe, y - 1)
            - box_sum(ii, w, x - lobe, y + 1, x - 1, y + lobe);
    let inv_area = 1.0 / ((l * l) as f32);
    let dxx = dxx as f32 * inv_area;
    let dyy = dyy as f32 * inv_area;
    let dxy = dxy as f32 * inv_area;
    dxx * dyy - (0.9 * dxy).powi(2)
}
```

# Remarks

- Detector cost is $O(N)$ pixels per scale layer, independent of filter size, because each box-filter response is four integral-image lookups regardless of $l$.
- The descriptor is half the dimension of SIFT's 128-D vector; the Laplacian-sign index halves the candidate set for nearest-neighbour matching by polarity, both of which compound at match time.
- Box-filter quantisation in scale $\sigma$ is roughly $\pm 0.1$ at the smallest scales; sub-scale quadratic refinement partially absorbs this, but the smallest detectable structures are bounded by the $9 \times 9$ filter ($\sigma = 1.2$).
- Integral-image precision must be 64-bit for image dimensions beyond approximately $4100 \times 4100$ pixels; 32-bit unsigned overflows on the cumulative sum at 8-bit input.
- Affine and large out-of-plane viewpoint changes are out of scope — the detector is scale- and rotation-invariant only.
- U-SURF drops the orientation-assignment step for additional speed at the cost of in-plane rotation invariance; valid only when the camera stays approximately upright.
- ORB (2011) replaces SURF's box-filter Hessian detector and 64-D Haar-wavelet descriptor with a FAST-9 + Harris-ranked detector and a 256-bit rBRIEF binary descriptor, yielding an order-of-magnitude speedup at comparable inlier rates on textured outdoor scenes — at the cost of SURF's continuous scale estimate and float descriptor capacity. See [§When to choose SURF over ORB](#when-to-choose-surf-over-orb).

## When to choose SURF over ORB

SURF (2006) is the older method; this page hosts the comparison.

**Subpixel scale.** SURF carries a continuous scale $\sigma$ per keypoint via quadratic interpolation in $(x, y, \sigma)$ across the box-filter response stack. ORB's scale is the discrete pyramid level on which the keypoint survived; there is no sub-level interpolation. Use SURF when downstream geometry — wide-baseline reconstruction, scale-precise stitching — needs an explicit per-keypoint scale.

**Blob versus corner detection.** SURF's $\det(\mathcal{H}^\sigma)$ response detects blob-like structures: spots, junctions, and rounded features. ORB detects FAST-9 corners. On graffiti-style monochromatic regions with sparse corners but visible blobs (illumination gradients, painted shapes), SURF localises keypoints where ORB does not. Use SURF when the scene's salient structure is blob-like rather than corner-like.

**Descriptor capacity.** SURF emits a 64-D float descriptor; ORB emits a 256-bit binary descriptor. SURF's float-valued Haar-wavelet responses retain more discriminative information per keypoint, helping in dense or repetitive scenes where binary tests collide. Use SURF when descriptor capacity dominates the decision — fine-grained recognition, retrieval over highly similar imagery, scene re-identification.

**Compute and storage.** ORB is roughly an order of magnitude faster than SURF on the same CPU at $640 \times 480$, with 32-byte binary descriptors against SURF's 256-byte float descriptors and Hamming-distance matching that reduces to bitwise XOR + popcount. Use ORB when frame budget, descriptor storage, or matching throughput dominates the decision.

# References

1. H. Bay, T. Tuytelaars, L. Van Gool. *SURF: Speeded Up Robust Features.* Lecture Notes in Computer Science, 2006. [link.springer.com](https://link.springer.com/content/pdf/10.1007/11744023_32.pdf)
2. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 2004. [cs.ubc.ca](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf)
3. C. Harris, M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988.
