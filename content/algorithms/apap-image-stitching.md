---
title: "As-Projective-As-Possible Image Stitching"
date: 2026-04-26
summary: "Replace a global homography with a spatially varying field of homographies, each fit by a per-cell weighted DLT (Moving DLT) on the same point correspondences, so the warp stays globally projective but adapts locally where the projective model is inadequate."
tags: ["image-stitching", "homography", "projective-warp", "dlt"]
category: explainers
author: "Vitaly Vorobyev"
difficulty: advanced
draft: true
relatedAlgorithms: ["zhang-planar-calibration"]
sources:
  primary: zaragoza2013-apap
  references:
    - hartley1997-eight-point
    - schaefer2006-mls
    - gao2011-dual-homography
    - lin2011-svastitching
  notes: |
    §2.1 reviews DLT homography (Eq. 1-4): the design matrix A ∈ R^{2N×9}
    is built from cross-product linearisation 0 = x̃' × H x̃; ĥ is the
    smallest right singular vector of A. §2.2 introduces Moving DLT
    (Eq. 6-11): per-query weights w_*^i = max(exp(-‖x_* - x_i‖² / σ²), γ)
    form a diagonal W_* (Eq. 10, each weight repeated twice for the two
    rows of a_i), and h_* is the smallest right singular vector of
    W_* A (Eq. 9). γ is a weight floor that bounds the warp away from
    degeneracy in data-poor regions and forces graceful reduction to
    the global homography as γ → 1. §3 partitions the source image into
    C₁ × C₂ cells (default 100×100 for 1500×2000 images), one MDLT per
    cell. Hartley pre-conditioning (Eq. T, T') is applied once before
    the per-cell SVDs. §6 defaults: σ ∈ [8, 12], γ ∈ [0.0025, 0.025],
    grid 50–100 cells per axis.
---

# Goal

Stitch two overlapping images $I$ and $I'$ given a set of point correspondences $\{(x_i, x'_i)\}_{i=1}^{N}$ across them. Compute, for every pixel $x_*$ in $I$, a $3 \times 3$ projective transformation $H_*$ that maps the local neighbourhood of $x_*$ into $I'$. The field $\{H_*\}_{x_* \in I}$ varies smoothly with $x_*$ and reduces to a single global homography when the data are consistent with the projective model; elsewhere it deviates locally to absorb model inadequacy (parallax, non-rotational camera motion, non-planar scene). Globally projective, locally adjustable.

# Algorithm

Let $\tilde{x} = [x, y, 1]^T$ denote $x = [x, y]^T$ in homogeneous coordinates. A homography $H \in \mathbb{R}^{3 \times 3}$ acts as $\tilde{x}' = H \tilde{x}$, with $h_j^T$ the $j$-th row of $H$ and $h = \mathrm{vec}(H) \in \mathbb{R}^9$ the row-stacked vector.

For each correspondence $(x_i, x'_i)$, the constraint $\mathbf{0}_{3 \times 1} = \tilde{x}'_i \times H \tilde{x}_i$ linearises to three rows in $h$, of which two are independent:

$$
a_i = \begin{bmatrix}
\mathbf{0}_{1 \times 3} & -\tilde{x}_i^{T} & y'_i \tilde{x}_i^{T} \\
\tilde{x}_i^{T} & \mathbf{0}_{1 \times 3} & -x'_i \tilde{x}_i^{T}
\end{bmatrix} \in \mathbb{R}^{2 \times 9}.
$$

Stacking $a_i$ for all $i$ yields the DLT design matrix $A \in \mathbb{R}^{2N \times 9}$.

:::definition[Global DLT homography ($\hat{h}$)]
The single homography that minimises the algebraic residual on all correspondences.

$$
\hat{h} = \arg\min_{\|h\| = 1} \|A h\|^2,
$$

obtained as the right singular vector of $A$ with smallest singular value.
:::

:::definition[Moving DLT weights ($w_*^i$)]
A Gaussian locality kernel on the source-image distance from a query point $x_*$ to each correspondence's source position $x_i$, clipped from below by $\gamma$ for stability.

$$
w_*^i = \max\!\left(\exp\!\left(-\frac{\|x_* - x_i\|^2}{\sigma^2}\right),\; \gamma\right),
$$

with bandwidth $\sigma > 0$ and floor $\gamma \in [0, 1]$. As $\gamma \to 1$ the field collapses to the global homography; as $\gamma \to 0$ extrapolation regions become numerically singular.
:::

![Moving-DLT weight $w_*^i$ as a function of source-image distance $\|x_* - x_i\|$ for the paper's parameter ranges. The exponential decays with bandwidth $\sigma$; the floor $\gamma$ bounds the weight away from zero so distant correspondences still contribute a stable homography in extrapolation regions.](./images/apap-image-stitching/weight-kernel.svg)

:::definition[Moving-DLT homography ($h_*$)]
The location-dependent homography at query $x_*$, fit by weighting each correspondence's DLT contribution by $w_*^i$.

$$
h_* = \arg\min_{\|h\| = 1} \|W_* A h\|^2,
$$

with $W_* = \mathrm{diag}([w_*^1,\, w_*^1,\, w_*^2,\, w_*^2,\, \ldots,\, w_*^N,\, w_*^N]) \in \mathbb{R}^{2N \times 2N}$ — each weight repeats once for each of the two rows of $a_i$. The solution is the right singular vector of $W_* A$ with smallest singular value.
:::

## Procedure

:::algorithm[As-projective-as-possible image stitching]
::input[Source image $I$, target image $I'$, correspondences $\{(x_i, x'_i)\}_{i=1}^{N}$, bandwidth $\sigma$, weight floor $\gamma$, grid resolution $C_1 \times C_2$.]
::output[A per-cell homography field $\{H_*\}$ and the warped, blended composite of $I$ and $I'$.]

1. Detect and match keypoints between $I$ and $I'$. Run RANSAC with a DLT minimal solver to discard outlier correspondences.
2. Apply Hartley pre-conditioning: translate each point set to centroid zero and isotropically scale so the mean distance from the origin is $\sqrt{2}$. Build the conditioned design matrix $A$ once.
3. Partition $I$ into a uniform $C_1 \times C_2$ grid of cells. Take each cell's centre as the query $x_*$.
4. For every cell, compute the weight vector $\{w_*^i\}_{i=1}^{N}$ from $x_*$ and $\{x_i\}$.
5. For every cell, take the right singular vector of $W_* A$ with smallest singular value as $h_*$, reshape to $H_*$, and de-normalise via $H_* \leftarrow T'^{-1} H_* T$.
6. Warp every pixel inside a cell using that cell's $H_*$. Composite the warped source onto the target.
:::

# Implementation

Per-cell Moving DLT in Rust. The function takes the once-conditioned design matrix $A$ and returns the local homography at one cell centre — the kernel that steps 4–5 of the procedure invoke $C_1 \cdot C_2$ times.

```rust
use nalgebra::{DMatrix, Matrix3};

fn moving_dlt(
    a: &DMatrix<f64>,        // 2N×9 conditioned DLT design matrix
    src_pts: &[[f64; 2]],    // source-image positions of the N matches
    cell_centre: [f64; 2],   // query x_*
    sigma: f64,
    gamma: f64,
) -> Matrix3<f64> {
    let n = src_pts.len();
    let s2 = sigma * sigma;
    // Eq. 11: per-match Gaussian weights with floor γ.
    let w: Vec<f64> = src_pts.iter().map(|p| {
        let dx = p[0] - cell_centre[0];
        let dy = p[1] - cell_centre[1];
        (-(dx * dx + dy * dy) / s2).exp().max(gamma)
    }).collect();
    // Eq. 10: scale row 2i and row 2i+1 of A by w_i so that ‖W_* A h‖² = ∑ w_i² ‖a_i h‖².
    let mut wa = a.clone();
    for i in 0..n {
        let wi = w[i];
        for j in 0..9 {
            wa[(2 * i, j)]     *= wi;
            wa[(2 * i + 1, j)] *= wi;
        }
    }
    // Eq. 9: smallest right singular vector of W_* A.
    let svd = wa.svd(false, true);
    let v_t = svd.v_t.expect("SVD V^T");
    let h = v_t.row(8).transpose();      // last row of V^T → smallest singular direction
    Matrix3::new(
        h[0], h[1], h[2],
        h[3], h[4], h[5],
        h[6], h[7], h[8],
    )
}
```

Each branch of the function corresponds to one equation: the weight loop is Eq. (11), the row scaling is Eq. (10), and the SVD line is Eq. (9). Hartley pre-conditioning (and de-normalisation $H_* \leftarrow T'^{-1} H_* T$) live one level up, since they are applied once outside the per-cell loop.

# Remarks

- Complexity: each per-cell solve is one SVD of a $2N \times 9$ matrix, $O(N \cdot 9^2 + 9^3) = O(N)$ in $N$; the full warp is $O(C_1 C_2 \cdot N)$ for the field plus $O(|\Omega|)$ for the pixel warp. The paper documents an $O(m^2 \log^2 m)$ rank-one SVD update to exploit the observation that most cells share most weights.
- The bandwidth $\sigma$ and the floor $\gamma$ trade locality against stability. Small $\sigma$ tightens locality and improves overlap-region alignment; small $\gamma$ frees the warp in data-poor regions and risks degeneracy. The paper's defaults span $\sigma \in [8, 12]$ pixels and $\gamma \in [0.0025, 0.025]$ for $1024 \times 768$ to $1500 \times 2000$ images.
- The warp reduces gracefully to a global homography in two limits: as $\gamma \to 1$ all weights equalise and every cell solves the same DLT; as the inter-camera translation tends to zero, the data become projectively consistent and every weighted DLT recovers the same $H$.
- The estimator is local in the source image only. Two correspondences with similar $x_i$ but very different $x'_i$ — moving objects, occluding edges — receive equal weights and pull the local homography toward an average, producing visible misalignment. The paper relies on RANSAC to remove such matches before MDLT and on downstream blending or seam cutting to absorb residuals.
- Cell partitioning is a computational shortcut, not a regularisation. Within a cell every pixel uses the same $H_*$; the field is piecewise-constant in $H$ but still continuous in the warped pixel position to within cell-boundary precision, since neighbouring cells solve nearly identical weighted SVDs.
- Common extensions name the limitation they address: the as-natural-as-possible warp (Lin 2015) attaches a global similarity prior to the boundary cells to suppress perspective distortion in extrapolation regions; bundle-adjusted multi-image stitching iterates MDLT and a shared similarity over $> 2$ views.

# References

1. J. Zaragoza, T.-J. Chin, M. S. Brown, D. Suter. *As-Projective-As-Possible Image Stitching with Moving DLT.* IEEE CVPR, 2013. DOI: [10.1109/CVPR.2013.303](https://doi.org/10.1109/CVPR.2013.303)
2. R. I. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE TPAMI, 1997. DOI: [10.1109/34.601246](https://doi.org/10.1109/34.601246)
3. S. Schaefer, T. McPhail, J. Warren. *Image Deformation Using Moving Least Squares.* ACM SIGGRAPH, 2006. DOI: [10.1145/1141911.1141920](https://doi.org/10.1145/1141911.1141920)
4. J. Gao, S. J. Kim, M. S. Brown. *Constructing Image Panoramas Using Dual-Homography Warping.* IEEE CVPR, 2011. DOI: [10.1109/CVPR.2011.5995433](https://doi.org/10.1109/CVPR.2011.5995433)
5. W.-Y. Lin, S. Liu, Y. Matsushita, T.-T. Ng, L.-F. Cheong. *Smoothly Varying Affine Stitching.* IEEE CVPR, 2011. DOI: [10.1109/CVPR.2011.5995314](https://doi.org/10.1109/CVPR.2011.5995314)
