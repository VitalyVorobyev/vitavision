---
title: "SIFT: Scale-Invariant Feature Transform"
date: 2026-05-05
summary: "Detects keypoints as scale-space extrema in a Difference-of-Gaussian image pyramid, refines location and scale by 3D quadratic interpolation, assigns canonical orientation from local gradient histograms, and emits a 128-D descriptor invariant to scale, rotation, and moderate affine and illumination change."
tags: ["local-descriptors", "multi-scale"]
domain: features
tasks: [feature-detection, local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [scale-space, image-gradient]
failureModes: []
relations:
  - type: compared_with
    target: harris-corner-detector
    confidence: high
  - type: compared_with
    target: shi-tomasi-corner-detector
    confidence: high
  - type: compared_with
    target: fast-corner-detector
    confidence: high
  - type: compared_with
    target: orb
    confidence: high
  - type: feeds_into
    target: gao-dual-homography-stitching
    confidence: high
    caution: "SIFT correspondences are the standard input to dual-homography stitching"
  - type: feeds_into
    target: lin-sva-stitching
    confidence: high
  - type: feeds_into
    target: apap-image-stitching
    confidence: high
sources:
  primary: lowe2004-sift
  references: [harris1988-corner]
  notes: |
    Four-stage cascade. Stage 1 (§3): Gaussian pyramid with s=3 intervals/octave
    (k=2^(1/3)), σ=1.6 initial blur, optional 2× upsampling for fine-scale
    recovery; DoG D(x,y,σ) = L(x,y,kσ) − L(x,y,σ) (Eq. 1) approximates
    σ²∇²G; 26-neighbor extrema in (x,y,σ). Stage 2 (§4): Taylor expansion to
    second order (Eq. 2); sub-pixel offset x̂ = −H⁻¹·∂D/∂x (Eq. 3); reject
    |D(x̂)| < 0.03 (low-contrast); reject Tr(H_2D)²/Det(H_2D) ≥ (r+1)²/r with
    r=10 → threshold 12.1 (edge response, Eq. 4). Stage 3 (§5): 36-bin
    gradient-orientation histogram in Gaussian window σ_w = 1.5×σ_keypoint;
    secondary peaks within 80% of dominant peak emit additional keypoints
    (~15% multi-orientation rate). Stage 4 (§6.1): 16×16 sample grid rotated
    to keypoint frame; 4×4 array of 8-bin orientation histograms with
    trilinear interpolation; Gaussian weighting σ = half-window; L2-normalize,
    clamp to 0.2 (illumination robustness), renormalize → 128-D vector.
    Matching (§7.1): nearest/second-nearest ratio < 0.8 discards ~90% false
    matches with <5% correct-match loss.
---

# Goal

Given a grayscale image $I(x, y)$ with pixel values in $[0, 1]$, detect a sparse set of locally distinctive keypoints and compute, for each, a 2D location, scale $\sigma$, dominant orientation $\theta$, and a 128-dimensional L2-normalized descriptor vector. The output is suitable for matching across images related by scale change, in-plane rotation, moderate affine distortion, illumination change, and noise. Invariance to scale and rotation is achieved through a Difference-of-Gaussian scale-space pyramid, a canonical orientation assignment from a gradient-histogram peak, and a gradient-histogram descriptor sampled in the keypoint's own coordinate frame.

# Algorithm

Let $I: \Omega \to [0, 1]$ denote the grayscale image on pixel domain $\Omega$.
Let $G(x, y, \sigma) = \frac{1}{2\pi\sigma^2} \exp\!\left(-\frac{x^2+y^2}{2\sigma^2}\right)$ denote the Gaussian kernel at scale $\sigma$.
Let $L(x, y, \sigma) = G(x, y, \sigma) \ast I(x, y)$ denote the scale-space representation.
Let $k = 2^{1/s}$ denote the constant multiplicative scale step, with $s = 3$ intervals per octave.
Let $\mathbf{H}$ denote the $2 \times 2$ spatial Hessian of the DoG function evaluated at a candidate keypoint.
Let $r = 10$ denote the edge-response rejection threshold.
Let $\sigma_w = 1.5 \times \sigma_\text{keypoint}$ denote the Gaussian window scale used for orientation assignment.

:::definition[Difference of Gaussians]
The Difference-of-Gaussian function approximates the scale-normalized Laplacian $\sigma^2 \nabla^2 G$:

$$
D(x, y, \sigma) = L(x, y, k\sigma) - L(x, y, \sigma).
$$

Extrema of $D$ across $(x, y, \sigma)$ are used as candidate keypoint locations.
:::

:::definition[Sub-pixel keypoint offset]
A 3D quadratic is fit to the DoG volume by Taylor expansion through second order:

$$
D(\mathbf{x}) \approx D + \frac{\partial D}{\partial \mathbf{x}}^{\!\top} \mathbf{x} + \frac{1}{2}\,\mathbf{x}^{\top} \frac{\partial^2 D}{\partial \mathbf{x}^2}\,\mathbf{x},
$$

where $\mathbf{x} = (x, y, \sigma)^{\top}$ is the offset from the discrete sample. Setting the derivative to zero gives the sub-pixel offset:

$$
\hat{\mathbf{x}} = -\!\left(\frac{\partial^2 D}{\partial \mathbf{x}^2}\right)^{\!-1} \frac{\partial D}{\partial \mathbf{x}}.
$$

If $|\hat{x}_i| > 0.5$ in any dimension, the candidate is relocated to the neighbouring sample and the fit is repeated.
:::

:::definition[Edge-response ratio]
To reject keypoints localised on edges rather than corners, the ratio of principal curvatures of the spatial Hessian $\mathbf{H}$ is bounded:

$$
\frac{\operatorname{Tr}(\mathbf{H})^2}{\operatorname{Det}(\mathbf{H})} < \frac{(r+1)^2}{r}.
$$

With $r = 10$ the threshold is $121/10 = 12.1$. Candidates with $\operatorname{Det}(\mathbf{H}) \leq 0$ (saddle points) are always rejected.
:::

:::definition[Descriptor formation]
Image gradients are sampled in a $16 \times 16$ neighbourhood rotated to the keypoint orientation. Samples are accumulated into a $4 \times 4$ array of 8-bin orientation histograms with trilinear interpolation and Gaussian weighting (window $\sigma = $ half the descriptor window width). The resulting 128-element vector is L2-normalized, each element clamped at $0.2$, then renormalized:

$$
\mathbf{d} \in \mathbb{R}^{128}, \quad \mathbf{d} \leftarrow \mathbf{d}/\|\mathbf{d}\|_2, \quad d_i \leftarrow \min(d_i,\, 0.2), \quad \mathbf{d} \leftarrow \mathbf{d}/\|\mathbf{d}\|_2.
$$
:::

## Procedure

:::algorithm[SIFT keypoint detection and description]
::input[Grayscale image $I(x,y)$ with pixel values in $[0,1]$, assumed to carry at least $\sigma = 0.5$ blur; scale-space parameters $s = 3$, $\sigma_0 = 1.6$.]
::output[Set of keypoints, each with $(x, y, \sigma, \theta)$ and a 128-dimensional descriptor vector $\mathbf{d}$.]

1. Double the image resolution (bilinear or similar); the assumed input blur $\sigma = 0.5$ becomes $\sigma = 1.0$ in the doubled image. Apply an additional Gaussian with $\sigma \approx 1.25$ to reach the target initial blur $\sigma_0 = 1.6$.
2. For each octave, convolve the base image with Gaussians at scales $\sigma, k\sigma, k^2\sigma, \ldots$ to produce $s + 3 = 6$ blurred images. Downsample by a factor of 2 to advance to the next octave.
3. Subtract adjacent Gaussian-blurred images within each octave to obtain $D(x, y, \sigma)$. This yields $s + 2 = 5$ DoG images per octave.
4. For each interior DoG sample, compare it with its 26 neighbours (8 in the same scale layer, 9 in the layer above, 9 in the layer below). Retain the sample if it is strictly greater than or less than all 26 neighbours.
5. Fit a 3D quadratic to the DoG volume to compute $\hat{\mathbf{x}}$. If $|\hat{x}_i| > 0.5$, relocate and refit. Discard the keypoint if $|D(\hat{\mathbf{x}})| < 0.03$ (low contrast).
6. Compute the $2 \times 2$ spatial Hessian $\mathbf{H}$ at the refined location. Discard the keypoint if $\operatorname{Det}(\mathbf{H}) \leq 0$ or $\operatorname{Tr}(\mathbf{H})^2 / \operatorname{Det}(\mathbf{H}) \geq 12.1$.
7. Compute gradient magnitudes $m(x,y) = \sqrt{(L_{x+1}-L_{x-1})^2 + (L_{y+1}-L_{y-1})^2}$ and orientations $\theta(x,y) = \arctan\!\bigl((L_{y+1}-L_{y-1})/(L_{x+1}-L_{x-1})\bigr)$ in a Gaussian-weighted region ($\sigma_w = 1.5 \times \sigma_\text{keypoint}$). Accumulate into a 36-bin histogram covering $[0°, 360°)$. Fit a parabola over each local peak and its two neighbours. Assign the dominant peak orientation; create additional keypoints for any secondary peaks within $80\%$ of the dominant peak height.
8. Rotate the gradient sample grid to the assigned orientation. Accumulate a $4 \times 4$ grid of 8-bin histograms with trilinear interpolation and Gaussian weighting. L2-normalize, clamp each element at $0.2$, and renormalize to produce a 128-dimensional descriptor $\mathbf{d}$.
:::

# Implementation

The per-keypoint sub-pixel refinement and edge-response rejection in Rust, corresponding line-by-line to the Taylor-expansion localization and Hessian ratio test:

```rust
use nalgebra::{Matrix3, Vector3};

/// Returns the refined offset `x_hat` (in [x, y, sigma] sample units) and
/// the interpolated DoG value at the refined location, or `None` if the
/// keypoint fails the contrast or edge-response tests.
fn refine_keypoint(dog: &[[[f32; 3]; 3]; 3]) -> Option<(Vector3<f32>, f32)> {
    let dx = 0.5 * (dog[1][1][2] - dog[1][1][0]);
    let dy = 0.5 * (dog[1][2][1] - dog[1][0][1]);
    let ds = 0.5 * (dog[2][1][1] - dog[0][1][1]);
    let grad = Vector3::new(dx, dy, ds);

    let d = dog[1][1][1];
    let dxx = dog[1][1][2] - 2.0 * d + dog[1][1][0];
    let dyy = dog[1][2][1] - 2.0 * d + dog[1][0][1];
    let dss = dog[2][1][1] - 2.0 * d + dog[0][1][1];
    let dxy = 0.25 * ((dog[1][2][2] - dog[1][2][0]) - (dog[1][0][2] - dog[1][0][0]));
    let dxs = 0.25 * ((dog[2][1][2] - dog[2][1][0]) - (dog[0][1][2] - dog[0][1][0]));
    let dys = 0.25 * ((dog[2][2][1] - dog[2][0][1]) - (dog[0][2][1] - dog[0][0][1]));
    let hessian = Matrix3::new(dxx, dxy, dxs, dxy, dyy, dys, dxs, dys, dss);

    let x_hat = hessian.try_inverse()? * (-grad);

    let d_interp = d + 0.5 * grad.dot(&x_hat);
    if d_interp.abs() < 0.03 {
        return None;
    }

    let tr = dxx + dyy;
    let det = dxx * dyy - dxy * dxy;
    if det <= 0.0 || (tr * tr / det) >= 12.1 {
        return None;
    }

    Some((x_hat, d_interp))
}
```

# Remarks

- Gaussian pyramid construction is $O(N)$ per pixel (fixed number of convolutions per octave); descriptor computation is $O(1)$ per keypoint. A 500×500 image typically yields approximately 2000 stable keypoints.
- $s = 3$ intervals per octave ($k = 2^{1/3} \approx 1.26$) is empirically optimal: fewer intervals miss extrema; more intervals detect increasingly unstable ones without improving correct-match count. Changing $s$ materially affects keypoint count and stability.
- The Hessian ratio threshold $r = 10$ (giving the limit 12.1) is a geometric parameter that does not depend on image contrast. It is rarely tuned; values smaller than 10 produce tighter edge rejection and fewer keypoints on elongated structures.
- Low-texture or uniform regions produce no DoG extrema and thus no keypoints. Repetitive periodic patterns (brickwork, fabric, gratings) produce many ambiguous matches that the ratio test fails to disambiguate. Viewpoint changes beyond approximately 50° tilt for planar surfaces cause matching reliability to fall below 50%.
- The descriptor encodes gradient magnitude and orientation from a grayscale image only. Color extensions (RootSIFT, ColorSIFT) exist but are not part of this algorithm. For dense per-pixel correspondence, SIFT is not applicable — it is a sparse detector by design.
- The practitioner comparison of SIFT against the Harris corner detector is hosted on the Harris page (Harris 1988 is the older paper). See [harris-corner-detector §When to choose SIFT over Harris](../harris-corner-detector#when-to-choose-sift-over-harris).
- ORB (2011) couples FAST-9 with a steered, learned binary descriptor and matches via Hamming distance, eliminating the floating-point gradient histograms that dominate SIFT's per-keypoint cost. The two methods overlap on textured rigid scenes; SIFT's DoG blob detector localises better on graffiti-style monochromatic regions where FAST corners are sparse. See [§When to choose SIFT over ORB](#when-to-choose-sift-over-orb) for the practitioner-choice breakdown.

## When to choose SIFT over FAST

SIFT (2004) is the older method; this page hosts the comparison.

**Scale invariance.** SIFT is scale-invariant by construction: the DoG pyramid spans multiple octaves and each keypoint carries an explicit scale $\sigma$. FAST operates at a single fixed scale; a scene captured at different resolutions or zoom levels will not produce matching FAST keypoints. Use SIFT whenever scale change between images is expected.

**Descriptor bundled.** SIFT produces a 128-dimensional descriptor alongside each detected point. FAST is a detector only and must be paired with a separate descriptor (BRIEF, BRISK, ORB) to produce matchable feature vectors. Use SIFT when a self-contained detect-and-describe pipeline is required.

**Computational cost.** FAST is an order of magnitude faster than SIFT on CPU: its ring-pixel brightness comparison requires no convolution and no floating-point gradient computation. FAST was designed for real-time video tracking under bounded scale change. Use FAST for high-frame-rate tracking where scale variation is controlled and descriptor cost matters.

**Wide-baseline accuracy on textured rigid scenes.** When images are taken from significantly different viewpoints (different zoom, different distance) and the scene is textured and approximately rigid, SIFT keypoints repeat more reliably and descriptors disambiguate matches more accurately than FAST + lightweight descriptors. Use SIFT for wide-baseline matching, panorama assembly, and structure-from-motion pipelines.

## When to choose SIFT over ORB

SIFT (2004) is the older method; this page hosts the comparison.

**Detector regime.** SIFT detects scale-space extrema in a Difference-of-Gaussian pyramid — blob-like structures localised at a continuous scale $\sigma$. ORB detects FAST-9 corners at five discrete pyramid levels and ranks them by Harris cornerness. On graffiti-style monochromatic regions where corner responses are sparse, SIFT's blob detector finds keypoints that ORB does not. Use SIFT when the scene contains few corner-like structures and the image-matching budget allows continuous scale-space construction.

**Subpixel scale.** SIFT carries an explicit subpixel scale $\sigma$ per keypoint via 3D quadratic interpolation in $(x, y, \sigma)$. ORB's scale is the discrete pyramid level the keypoint survived at — there is no sub-level interpolation. Use SIFT when downstream geometry (homography, fundamental-matrix estimation under wide-baseline) benefits from precise scale matching.

**Descriptor capacity.** SIFT emits a 128-D float descriptor with gradient-histogram cells; ORB emits a 256-bit binary descriptor with rotated pixel-pair tests. SIFT's higher descriptor capacity disambiguates more aggressively in dense scenes; ORB's Hamming-distance matching is integer-only and an order of magnitude faster but trades absolute discriminability for compute. Use SIFT when descriptor capacity matters more than match cost — bag-of-words retrieval over million-image corpora, re-identification, fine-grained classification.

**Compute and storage.** ORB is roughly two orders of magnitude faster than SIFT on the same CPU at $640 \times 480$ — its integer-only pipeline (FAST + integral-image box-sums + bitwise tests + popcount) suits real-time tracking, embedded vision, and mobile devices. Storage is 32 bytes per ORB descriptor against 512 bytes per SIFT descriptor (128 floats). Use ORB when frame budget, descriptor storage, or matching throughput dominates the decision.

# References

1. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 60(2), 2004. [PDF](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf)
2. C. Harris and M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988.
