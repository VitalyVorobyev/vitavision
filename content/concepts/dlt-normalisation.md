---
title: "DLT Normalisation"
date: 2026-05-02
summary: "A two-line similarity transform — translate the point centroid to the origin, isotropically scale so the average distance is √2 — that conditions the design matrix of any DLT-based estimator (homography, fundamental matrix, projective camera, Moving DLT) by ~10⁸, and is the difference between unusable and reliable linear solutions."
tags: ["geometry", "linear-algebra", "numerical-conditioning", "dlt"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: intermediate
prerequisites: []
related:
  - homography
  - epipolar-geometry
  - apap-image-stitching
  - fundamental-matrix-eight-point
sources:
  references:
    - hartley1997-eight-point
    - zaragoza2013-apap
---

# Definition

DLT normalisation is a similarity preconditioning of point sets before solving any Direct Linear Transform (DLT) problem — fundamental matrix, homography, projective camera, Moving-DLT cell. The recipe (Hartley 1997) is two lines:

1. **Translate** so the centroid of the points is at the origin.
2. **Isotropically scale** so the average distance from the origin is $\sqrt{2}$.

Apply the same recipe independently to each image's point set. The transform is encoded as a $3 \times 3$ similarity matrix $T$:

$$
T = \begin{bmatrix} s & 0 & -s\,\bar u \\ 0 & s & -s\,\bar v \\ 0 & 0 & 1 \end{bmatrix}, \qquad s = \frac{\sqrt{2}}{\bar d},
$$

where $(\bar u, \bar v)$ is the centroid and $\bar d$ the mean distance to the centroid. After normalisation, a typical point is of the form $(1, 1, 1)^T$ — every entry of the DLT design matrix is $O(1)$, and the condition number of $A^T A$ drops by approximately $10^8$ (Graph 1 of Hartley 1997).

The normalisation is exact and invertible: solve in normalised coordinates, then recover the original-coordinate solution by denormalisation. For a fundamental matrix $F = T'^T \hat F\,T$; for a homography $H = T'^{-1} \hat H\,T$.

# Mathematical Description

## Why the design matrix needs conditioning

For a fundamental-matrix DLT, each correspondence $(\mathbf{u}_i, \mathbf{u}'_i)$ contributes one row

$$
A_i = \bigl[\, u_i u'_i,\; u_i v'_i,\; u_i,\; v_i u'_i,\; v_i v'_i,\; v_i,\; u'_i,\; v'_i,\; 1\,\bigr].
$$

For typical $\sim 1000$-pixel image coordinates, the entries of $A_i$ span $\sim 1$ to $\sim 10^6$. The condition number of $A^T A$ scales with the square of the coordinate range, so $\kappa(A^T A) \sim 10^{12}$ on un-normalised data — well beyond the $\sim 10^7$ resolution of single-precision floating-point. The smallest right singular vector of $A$ (the DLT solution $\mathbf{f}$) is dominated by floating-point error.

A homography DLT is structurally identical: each row of the $2N \times 9$ design matrix has entries up to $\sim u_i u'_i$, so $\kappa(A^T A) \sim u_{\max}^4$ on un-normalised data. The same conditioning argument and the same fix apply.

## Why the rank-2 SVD truncation is the most-perturbed step

Hartley's §5 insight: the entries of $F$ multiplied by the **largest** point coordinates correspond to the **smallest** singular values of $A^T A$. These are exactly the entries most corrupted by the rank-2 SVD truncation when $A^T A$ is ill-conditioned. Normalisation makes all entries of $F$ comparable in magnitude, so the rank-2 projection perturbs all of them equally instead of catastrophically perturbing the load-bearing ones. This is the structural reason normalisation matters for the **F-matrix specifically**, not just a generic conditioning argument.

## Isotropic vs anisotropic normalisation

Hartley's §6.2 tested an alternative non-isotropic normalisation — translate to origin, scale to unit principal moments via an affine transformation — and reported the results "were little different from those obtained using the isotropic scaling method." The isotropic version is one parameter ($s$) instead of three (an affine matrix), simpler to implement, and gives equivalently good conditioning. Use isotropic.

## Reuse in Moving-DLT (APAP)

[APAP](/atlas/apap-image-stitching) (Zaragoza 2013) reuses Hartley normalisation **once** per image pair, before its per-cell weighted SVDs. Without this, every cell's local DLT inherits the same $\kappa \sim 10^{12}$ catastrophe on each per-pixel SVD — which would amplify per-cell across the grid. With normalisation, each per-cell SVD operates on a numerically well-scaled $A$ and the only remaining numerical concern is the floor $\gamma$ on the Gaussian weights (which prevents data-poor cells from going singular).

## What normalisation is *not*

- **Not Cholesky / QR.** Those are linear-system *solver* preconditioners; they don't change the data. Hartley normalisation changes the data so the resulting linear system is well-conditioned regardless of solver.
- **Not RANSAC.** RANSAC handles **outliers** by sampling. Normalisation handles **noise** by conditioning. Use both: RANSAC sample → normalise inliers → DLT-solve → denormalise.
- **Not iterative refinement.** The normalised linear DLT is *almost* the gold-standard estimator. For calibration-grade accuracy (sub-pixel epipolar error), follow with Levenberg-Marquardt minimisation of the Sampson or gold-standard error using the normalised DLT result as the initial guess.

# Numerical Concerns

**Floating-point precision.** The normalised DLT operates on coordinates of magnitude $\sim 1$. SVD in 64-bit double-precision is essential — single-precision can lose accuracy in the smallest singular vector even after normalisation when $N$ is large. The 32-bit / 64-bit choice matters more for the SVD step than for the data conditioning itself.

**Centroid degeneracy.** If all points coincide ($\bar d = 0$), the normalisation transform is undefined. This is a trivial degeneracy — no estimator works on coincident points — and the implementation should reject it explicitly rather than divide by zero.

**Mean vs median distance.** The recipe says "mean distance from origin." Implementations that use the median (more robust to outliers) work equally well in Hartley's experiments; the precise choice is not load-bearing. The $\sqrt{2}$ target is what matters: it ensures a typical homogeneous point is $(1, 1, 1)^T$.

**Independent per-image normalisation.** In multi-view problems, each image gets its own $T_k$. Do **not** apply the same normalisation across views — the conditioning gain comes from each design-matrix block having $O(1)$ entries, which requires per-image scaling.

**Denormalisation order.** For the F-matrix, denormalise as $F = T'^T \hat F\,T$. For the H-matrix, as $H = T'^{-1} \hat H\,T$. Mixing up transpose vs inverse is a silent bug — both forms are valid invertible $3 \times 3$ matrices, so the result still "looks like" a matrix but encodes wrong geometry.

**Composability.** Normalisation can be composed with other preconditioners (e.g., a unit conversion on millimetre-coordinate data). The composition is a $3 \times 3$ similarity matrix; apply once, denormalise once.

# Where it appears

- [fundamental-matrix-eight-point](/atlas/fundamental-matrix-eight-point) — the canonical use case; the algorithm is essentially "DLT + Hartley normalisation + rank-2 enforcement."
- [homography](/atlas/homography) — same recipe applied to the 9-vector homography DLT. The reuse is direct: same $T$, same denormalisation pattern with $H = T'^{-1} \hat H\,T$.
- [apap-image-stitching](/atlas/apap-image-stitching) — Hartley pre-conditioning is applied once before the Moving-DLT per-cell solves so every per-cell SVD operates on a numerically well-scaled design matrix.
- [epipolar-geometry](/atlas/epipolar-geometry) — the concept page that documents the F-matrix estimation pipeline; the "Numerical Concerns" section there describes Hartley normalisation as non-optional for reliable F-matrix recovery.

# References

1. R. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE TPAMI 19(6):580–593, 1997. [pdf](https://users.cecs.anu.edu.au/~hartley/Papers/fundamental/ICCV-final/fundamental.pdf) (The original normalisation argument; §5 specifically on why F-matrix entries are differentially perturbed.)
2. J. Zaragoza, T.-J. Chin, M. S. Brown, D. Suter. *As-Projective-As-Possible Image Stitching with Moving DLT.* IEEE CVPR 2013. (Hartley pre-conditioning reused before per-cell SVD.)
3. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision*, 2nd ed. Cambridge University Press, 2004. Chapters 4 and 11. (Standard reference; §4.4 explicitly recommends normalisation as a default for any DLT problem.)
