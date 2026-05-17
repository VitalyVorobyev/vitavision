---
title: "EPnP: O(n) Perspective-n-Point"
date: 2026-05-04
summary: "Non-iterative O(n) solver for the calibrated Perspective-n-Point problem: express the n reference points as weighted sums of four virtual control points, recover their camera-frame coordinates from the null space of a 12×12 matrix, and extract pose by absolute orientation."
tags: ["pose-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [pinhole-camera-model, pose-estimation, dlt-normalisation, ransac]
failureModes: []
sources:
  primary: lepetit2009-epnp
  references:
    - fischler1981-ransac
  notes: |
    EPnP — Lepetit, Moreno-Noguer, Fua, IJCV 2009 (received April 2008).
    Reduces calibrated PnP to recovering the camera-frame coordinates of
    four virtual control points whose barycentric weights describe the n
    reference points (Eqs. 1–2). Stacks two equations per correspondence
    into Mx = 0 where x is the 12-vector of control-point camera
    coordinates (Eqs. 5–7); solves in the null space of MᵀM (12×12)
    expressed as a linear combination of N null eigenvectors v_i (Eq. 8).
    Effective null-space dimension N varies from 1 to 4 with focal length
    and noise; the method computes solutions for all four N and keeps the
    one with smallest reprojection error (Eq. 9). β coefficients are
    recovered from inter-control-point distance constraints — closed form
    for N=1 (Eq. 11), pseudoinverse / inverse on Lβ = ρ for N=2,3
    (Eq. 13), relinearisation (Kipnis–Shamir 1999, Eq. 14) for N=4.
    Optional Gauss-Newton refinement minimises pairwise distance residuals
    over only four scalar β's (Eqs. 15–16) — constant time, fewer than
    10 iterations. Planar fallback uses three control points and a 2n×9
    system. Linear-time scaling is dominated by the MᵀM product (O(n)),
    which kicks in around n ≈ 15.
---

# Goal

Recover camera pose $[\mathbf{R} \mid \mathbf{t}]$ from $n \geq 4$ known 3D-to-2D point correspondences and a calibrated intrinsic matrix $\mathbf{A}$. Input: $n$ reference points $\mathbf{p}_i^w \in \mathbb{R}^3$ with known world coordinates, their 2D image projections $\mathbf{u}_i \in \mathbb{R}^2$, and $\mathbf{A}$ containing focal lengths $f_u$, $f_v$ and principal point $(u_c, v_c)$. Output: rotation $\mathbf{R}$ and translation $\mathbf{t}$ placing the world frame in the camera frame. The defining property is an O(n) non-iterative formulation: every reference point is expressed as a weighted sum of four virtual control points, reducing the unknowns to a constant-size 12-vector regardless of $n$. The dominant cost — forming $\mathbf{M}^\top\mathbf{M}$ — is linear in $n$ and dominates for $n \gtrsim 15$.

# Algorithm

Let $\mathbf{p}_i^w \in \mathbb{R}^3$ denote the $i$-th reference point in world coordinates, $i = 1, \ldots, n$.
Let $\mathbf{u}_i = (u_i, v_i) \in \mathbb{R}^2$ denote its measured 2D projection.
Let $\mathbf{A}$ denote the intrinsic matrix with focal lengths $f_u$, $f_v$ and principal point $(u_c, v_c)$.
Let $\mathbf{c}_j^w$, $j = 1, \ldots, 4$, denote the four virtual control points in world coordinates (three for the planar case).
Let $\alpha_{ij} \in \mathbb{R}$ denote the barycentric weight of control point $j$ for reference point $i$.
Let $\mathbf{c}_j^c \in \mathbb{R}^3$ denote the camera-frame coordinates of control point $j$.
Let $\mathbf{x} = [\mathbf{c}_1^{c\top}, \mathbf{c}_2^{c\top}, \mathbf{c}_3^{c\top}, \mathbf{c}_4^{c\top}]^\top \in \mathbb{R}^{12}$ denote the unknown 12-vector of camera-frame control-point coordinates.
Let $N \in \{1, 2, 3, 4\}$ denote the effective null-space dimension of $\mathbf{M}^\top\mathbf{M}$.
Let $\mathbf{v}_i \in \mathbb{R}^{12}$ denote the $i$-th null eigenvector of $\mathbf{M}^\top\mathbf{M}$, and $\beta_i$ its coefficient.

Each reference point decomposes as an affine combination of the control points:

:::definition[Barycentric decomposition]

$$
\mathbf{p}_i^w = \sum_{j=1}^{4} \alpha_{ij}\, \mathbf{c}_j^w, \qquad \sum_{j=1}^{4} \alpha_{ij} = 1.
$$

Rigid motion preserves affine combinations, so the same weights hold in camera coordinates:

$$
\mathbf{p}_i^c = \sum_{j=1}^{4} \alpha_{ij}\, \mathbf{c}_j^c.
$$
:::

Substituting the camera-frame decomposition into the perspective projection and eliminating the projective scale $w_i = \sum_j \alpha_{ij} z_j^c$ yields two linear constraints per reference point:

$$
\begin{aligned}
\sum_{j=1}^{4} \alpha_{ij} f_u\, x_j^c + \alpha_{ij}(u_c - u_i)\, z_j^c &= 0, \\
\sum_{j=1}^{4} \alpha_{ij} f_v\, y_j^c + \alpha_{ij}(v_c - v_i)\, z_j^c &= 0.
\end{aligned}
$$

Stacking all $n$ pairs gives the homogeneous system

$$
M\mathbf{x} = \mathbf{0},
$$

where $\mathbf{M}$ is $2n \times 12$ (or $2n \times 9$ for the planar case). The matrix $\mathbf{M}^\top\mathbf{M}$ is always $12 \times 12$ and is computed in $O(n)$ time.

:::definition[Null-space combination]
The solution lies in the null space of $\mathbf{M}$, expressed as a linear combination of the $N$ null eigenvectors $\mathbf{v}_i$ of $\mathbf{M}^\top\mathbf{M}$:

$$
\mathbf{x} = \sum_{i=1}^{N} \beta_i\, \mathbf{v}_i.
$$
:::

:::definition[Reprojection residual]
The candidate $N$ is selected by minimum reprojection error over all $n$ correspondences:

$$
\mathrm{res} = \sum_i \mathrm{dist}^2\!\left(\mathbf{A}[\mathbf{R}\mid\mathbf{t}]\begin{bmatrix}\mathbf{p}_i^w \\ 1\end{bmatrix},\, \mathbf{u}_i\right).
$$
:::

## β recovery

The $\beta_i$ coefficients are determined by requiring that inter-control-point distances computed from $\mathbf{x}$ match the known world-frame distances — six quadratic constraints. Four closed-form cases handle the effective null-space dimension $N$.

**Case $N = 1$.** A single eigenvector $\mathbf{v}_1$ spans the null space; $\beta_1$ is obtained in closed form as a ratio of dot products over squared norms,

$$
\beta = \sqrt{\frac{\|\mathbf{c}_i^w - \mathbf{c}_j^w\|^2}{\|\mathbf{v}_1^{[i]} - \mathbf{v}_1^{[j]}\|^2}}.
$$

The sign of $\beta_1$ is chosen so that all camera-frame control points have positive $z$-coordinates.

**Cases $N = 2$ and $N = 3$.** Expanding the pairwise distance constraints and linearising the bilinear products $\beta_{ab} = \beta_a \beta_b$ as new unknowns yields a linear system

$$
L\boldsymbol{\beta} = \boldsymbol{\rho},
$$

where $\boldsymbol{\rho}$ is the 6-vector of squared world-frame inter-control-point distances $\|\mathbf{c}_i^w - \mathbf{c}_j^w\|^2$. For $N = 2$, $L \in \mathbb{R}^{6 \times 3}$ and $\boldsymbol{\beta} = [\beta_{11}, \beta_{12}, \beta_{22}]^\top$ — solved by pseudoinverse. For $N = 3$, $L \in \mathbb{R}^{6 \times 6}$ and $\boldsymbol{\beta} = [\beta_{11}, \beta_{12}, \beta_{13}, \beta_{22}, \beta_{23}, \beta_{33}]^\top$ — solved by direct inverse.

**Case $N = 4$.** With ten $\beta_{ab}$ products and only six distance constraints, the system is underdetermined. The relinearisation technique adds commutativity equations,

$$
\beta_{ab}\beta_{cd} = \beta_a\beta_b\beta_c\beta_d = \beta_{a'b'}\beta_{c'd'},
$$

where $\{a', b', c', d'\}$ is any permutation of $\{a, b, c, d\}$. These four additional scalar equations close a $10 \times 10$ linear system. The same relinearisation is required in the planar case for $N \geq 3$, where the six distance constraints drop to three.

:::definition[Gauss-Newton objective]
The optional constant-time refinement minimises pairwise camera-frame distance residuals over only four scalar $\beta_j$ parameters:

$$
\mathrm{Error}(\boldsymbol{\beta}) = \sum_{\substack{(i,j) \\ i < j}} \left(\|\mathbf{c}_i^c - \mathbf{c}_j^c\|^2 - \|\mathbf{c}_i^w - \mathbf{c}_j^w\|^2\right)^2,
$$

with control-point camera coordinates parameterised as

$$
\mathbf{c}_i^c = \sum_{j=1}^{4} \beta_j\, \mathbf{v}_j^{[i]}.
$$

Fewer than 10 Gauss-Newton iterations are required; the overall complexity remains $O(n)$.
:::

## Procedure

:::algorithm[EPnP pose estimation]
::input[Reference points $\mathbf{p}_i^w$ ($i = 1, \ldots, n$, $n \geq 4$); 2D projections $\mathbf{u}_i$; intrinsic matrix $\mathbf{A}$ with $f_u, f_v, u_c, v_c$.]
::output[Camera pose $[\mathbf{R} \mid \mathbf{t}]$.]

1. **Select control points.** Set $\mathbf{c}_1^w$ to the centroid of the $n$ reference points; set $\mathbf{c}_2^w, \mathbf{c}_3^w, \mathbf{c}_4^w$ to the scaled principal directions of the point cloud — analogous to DLT normalisation. For planar input, use three control points.
2. **Solve barycentric weights.** For each $i$, compute $\alpha_{ij}$ from $\mathbf{p}_i^w = \sum_j \alpha_{ij} \mathbf{c}_j^w$ with $\sum_j \alpha_{ij} = 1$. The weights transfer unchanged to camera coordinates.
3. **Build $\mathbf{M}$.** For each reference point, form two rows from the linear constraints above. $\mathbf{M}$ is $2n \times 12$ (or $2n \times 9$ for the planar case).
4. **Compute $\mathbf{M}^\top\mathbf{M}$.** The product is $12 \times 12$ and costs $O(n)$. Extract the $N$ smallest-eigenvalue eigenvectors $\mathbf{v}_i$.
5. **Solve for $\boldsymbol{\beta}$ for each candidate $N \in \{1, 2, 3, 4\}$.** Apply the appropriate closed-form case from the β recovery section. Compute the reprojection residual for each candidate and retain the $N$ that minimises it.
6. **Reconstruct camera-frame control points.** Form $\mathbf{x} = \sum_i \beta_i \mathbf{v}_i$; partition into $\mathbf{c}_j^c$. Choose signs of $\beta_a$ so that all $z_j^c > 0$.
7. **Recover $[\mathbf{R} \mid \mathbf{t}]$.** Apply absolute orientation (Horn / Arun) aligning $\{\mathbf{c}_j^c\}$ onto $\{\mathbf{c}_j^w\}$. This step operates on exactly four point pairs and is constant-time.
8. **Optionally refine.** Minimise the Gauss-Newton objective over $\boldsymbol{\beta} = [\beta_1, \beta_2, \beta_3, \beta_4]^\top$ with control-point coordinates parameterised by the four-eigenvector combination; fewer than 10 iterations suffice.
:::

# Implementation

The per-correspondence row builder for $\mathbf{M}$, corresponding line-by-line to the two linear constraints derived above:

```rust
/// Build two rows of M for one reference point.
/// `alpha`: barycentric weights α_{ij}, j = 0..4
/// `u`, `v`: 2D projection of the reference point
/// `fu`, `fv`, `uc`, `vc`: calibrated intrinsics
fn build_m_rows(
    alpha: &[f32; 4],
    u: f32, v: f32,
    fu: f32, fv: f32,
    uc: f32, vc: f32,
) -> [[f32; 12]; 2] {
    let mut row_u = [0.0f32; 12];
    let mut row_v = [0.0f32; 12];
    for j in 0..4 {
        let a = alpha[j];
        // α_ij · fu · x_j^c + α_ij · (uc − u) · z_j^c = 0
        row_u[3 * j]     = a * fu;
        row_u[3 * j + 1] = 0.0;
        row_u[3 * j + 2] = a * (uc - u);
        // α_ij · fv · y_j^c + α_ij · (vc − v) · z_j^c = 0
        row_v[3 * j]     = 0.0;
        row_v[3 * j + 1] = a * fv;
        row_v[3 * j + 2] = a * (vc - v);
    }
    [row_u, row_v]
}
```

The full $\mathbf{M}$ is the vertical stack of `build_m_rows` over all $n$ correspondences. The next steps form $\mathbf{M}^\top\mathbf{M}$ ($12 \times 12$, $O(n)$), extract its null eigenvectors, solve for $\boldsymbol{\beta}$ in each of the four $N$ cases, and recover $[\mathbf{R}\mid\mathbf{t}]$ from the four control-point pairs by absolute orientation.

# Remarks

- The $\mathbf{M}^\top\mathbf{M}$ product is $12 \times 12$ and costs $O(n)$; its eigendecomposition is constant-time. For $n \gtrsim 15$ the product dominates the total runtime; below that threshold the constant-time eigendecomposition and $\boldsymbol{\beta}$-solve remain the bottleneck.
- The effective null-space dimension $N$ depends on focal length and measurement noise. As focal length grows toward orthographic projection, all four smallest eigenvalues of $\mathbf{M}^\top\mathbf{M}$ approach zero simultaneously. At higher noise, the distribution of $N$ shifts toward $N = 3$ and $N = 4$. All four candidates are always computed; the reprojection selector chooses the best.
- Planar reference-point configurations require three control points. The rank-9 system has only three pairwise distance constraints (not six); relinearisation is required for $N \geq 3$.
- Tilted planar reference points carry an inherent two-fold pose ambiguity. The closed-form solution does not arbitrate between the two valid poses, and the Gauss-Newton step on inter-control-point distances cannot break the ambiguity either.
- Wrap EPnP in [Fischler–Bolles RANSAC](/atlas/fischler-bolles-ransac) for outlier-robust pose estimation; the original real-image experiment uses sample size 7 and runs EPnP on the resulting inlier set for final pose refinement. The optional Gauss-Newton step is independent of the outlier-rejection loop.

# References

1. V. Lepetit, F. Moreno-Noguer, P. Fua. *EPnP: An Accurate O(n) Solution to the PnP Problem.* International Journal of Computer Vision, 2009. [hdl/2117/10327](http://hdl.handle.net/2117/10327)
2. M. A. Fischler, R. C. Bolles. *Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography.* Communications of the ACM, 24(6):381–395, 1981. [dl.acm.org](https://dl.acm.org/doi/pdf/10.1145/358669.358692)
