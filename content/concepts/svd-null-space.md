---
title: "SVD Null-Space Estimation"
date: 2026-05-16
summary: "Estimating a geometric entity defined only up to scale by stacking constraints into a homogeneous linear system and taking the smallest right-singular vector of the design matrix."
tags: ["linear-algebra"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: intermediate
prerequisites: []
sources:
  primary: longuet-higgins1981-eight-point
  references:
    - hartley1997-eight-point
    - gao2011-dual-homography
    - zhang2000-flexible
---

# Definition

SVD null-space estimation is the standard technique for finding a geometric entity that is defined only up to scale from a set of homogeneous linear constraints. Given a coefficient matrix $A$ assembled from measurements, it returns the unit vector $x$ that minimises $\|Ax\|$ subject to $\|x\| = 1$.

:::definition[SVD null-space solution]
Let $A \in \mathbb{R}^{m \times n}$ be a design matrix ($m \geq n - 1$) built by stacking one linear constraint per measurement into the homogeneous system $Ax = 0$. The unique minimiser of $\|Ax\|$ subject to $\|x\| = 1$ is

$$x^\star = v_n,$$

the last column of $V$ in the SVD $A = U \Sigma V^\top$, i.e. the right-singular vector corresponding to the smallest singular value $\sigma_n$.
:::

The input is $A$ — any coefficient matrix whose rows encode linear constraints on an unknown vector $x$ meaningful only up to a global scale. The output is the unit vector $x^\star$ that best satisfies those constraints in the least-squares sense. In computer vision $A$ is called the design matrix or DLT matrix; the pattern of stacking one constraint per correspondence and extracting the smallest right-singular vector appears identically in fundamental-matrix estimation, homography estimation, and camera calibration.

# Mathematical Description

## The homogeneous system and its least-squares solution

A geometric entity described by $n$ parameters but defined only up to scale has $n - 1$ effective degrees of freedom. Each measurement contributes one linear equation; stacking $m \geq n - 1$ constraints yields

$$Ax = 0, \qquad A \in \mathbb{R}^{m \times n},$$

which has no non-trivial solution unless $A$ is exactly rank-deficient. Under measurement noise $A$ has full column rank, and the exact equation is replaced by the constrained minimisation $x^\star = \arg\min_{\|x\|=1} \|Ax\|^2$. Expanding via the SVD $A = U\Sigma V^\top$ with $\sigma_1 \geq \cdots \geq \sigma_n \geq 0$,

$$\|Ax\|^2 = \|\Sigma V^\top x\|^2 = \sum_{i=1}^n \sigma_i^2 (v_i^\top x)^2.$$

Subject to $\|x\| = 1$, this weighted sum of squared projections is minimised by placing all weight on the smallest term — $x^\star = v_n$ — giving minimum value $\sigma_n^2$. This is the Rayleigh-quotient argument applied to $A^\top A$, whose eigenvalues are $\sigma_i^2$ and eigenvectors the columns of $V$.

## Rank deficiency and the residual interpretation

An exact solution to $Ax = 0$ exists if and only if $\sigma_n = 0$: the system is rank-deficient and $v_n$ lies exactly in the null space. When $\sigma_n > 0$, no exact solution exists and $\sigma_n$ is the minimum achievable residual $\|Ax^\star\|$. The ratio $\sigma_{n-1}/\sigma_n$ measures how clearly the solution direction is separated: a large ratio indicates a well-determined unique solution; a ratio near 1 indicates near-degeneracy.

For the eight-point fundamental-matrix estimator, $A$ is the $m \times 9$ design matrix from $m \geq 8$ correspondences, each row $(u u',\, u v',\, u,\, v u',\, v v',\, v,\, u',\, v',\, 1)$; the nine-vector $\mathbf{f} = v_9$ reshapes to $F$ satisfying $\mathbf{u}'^T F \mathbf{u} = 0$. The stacking follows from the bilinear epipolar constraint $x'_\lambda Q_{\lambda\mu} x_\mu = 0$ that Longuet-Higgins derived in 1981, where each correspondence supplies one equation in the nine entries of the essential matrix. For the homography DLT the same structure applies with a $2m \times 9$ matrix; for Zhang's planar calibration the stacked system $Vb = 0$ is a $2n \times 6$ matrix whose smallest right-singular vector encodes the image of the absolute conic.

## Rank enforcement by truncating the spectrum

The null-space step produces an unconstrained solution. Many geometric entities carry an additional rank constraint, enforced by a second SVD applied to the recovered matrix. The fundamental matrix must have rank 2, yet the linear solution $\hat{F}$ generically has rank 3. The closest rank-2 matrix in Frobenius norm is obtained by computing $\hat{F} = U \operatorname{diag}(r, s, t) V^\top$ and setting $F' = U \operatorname{diag}(r, s, 0) V^\top$ — zeroing the smallest singular value. This projection is optimal in Frobenius norm but not in geometric (Sampson) error; iterative refinement is needed for calibration-grade accuracy.

# Numerical Concerns

**Conditioning of the design matrix.** The fundamental-matrix design matrix has entries ranging from $O(1)$ to $O(u_{\max}^2) \approx O(10^6)$ for $\sim$1000-pixel coordinates, making the condition number of $A^\top A$ of order $10^{11}$–$10^{13}$ on un-normalised data. At such conditioning, 64-bit floating point retains only a few significant digits in the smallest singular vector. The fix — [dlt-normalisation](/atlas/dlt-normalisation) — translates each point set to zero centroid and scales isotropically to unit mean distance, dropping the condition number by roughly $10^8$ and bringing all design-matrix entries to $O(1)$.

**The singular-value gap as a degeneracy indicator.** A ratio $\sigma_{n-1}/\sigma_n$ near 1 means two or more directions of $V$ compete for the null space — the solution is numerically unreliable and geometrically degenerate. For the eight-point algorithm this corresponds to degenerate correspondence configurations such as collinear or coplanar points; for Zhang's $Vb = 0$ system, parallel-plane views contribute linearly dependent rows.

**Exact vs overdetermined systems.** With exactly $n - 1$ consistent constraints, $\sigma_n = 0$ and $v_n$ is the unique null vector. With $m > n - 1$ constraints the system is overdetermined, $\sigma_n > 0$, and $v_n$ is the least-squares null vector. The eight-point algorithm is most stable from roughly ten correspondences onward.

**Sensitivity to outliers.** The null-space step minimises a global least-squares objective over all rows of $A$; a single grossly mismatched correspondence corrupts the entire fit by inflating the residual in a direction unrelated to the true null vector. The method has no intrinsic outlier rejection — in practice RANSAC wraps it: sample a minimal subset, compute $v_n$, count inliers, repeat, then re-estimate from the inlier set.

**Precision.** Applying SVD directly to $A$ is numerically preferable to forming $A^\top A$ and computing its eigendecomposition, since squaring the matrix squares the condition number. Even after normalisation, the smallest singular value and its right-singular vector should be computed in 64-bit double precision.

# Where it appears

The SVD null-space step is the shared computational core of every homogeneous linear estimator in the atlas; [dlt-normalisation](/atlas/dlt-normalisation) describes the preconditioning that must precede it.

- [longuet-higgins-eight-point](/atlas/longuet-higgins-eight-point) — the 1981 origin: eight correspondences determine the nine entries of the essential matrix up to scale via SVD of the $8 \times 9$ design matrix.
- [fundamental-matrix-eight-point](/atlas/fundamental-matrix-eight-point) — Hartley's normalised extension; SVD of the $m \times 9$ matrix yields $\hat{\mathbf{f}} = v_9$, followed by a second SVD enforcing rank 2.
- [gao-dual-homography-stitching](/atlas/gao-dual-homography-stitching) — fits one homography per correspondence cluster, each solved by SVD null-space estimation from its cluster's DLT design matrix.
- [homography](/atlas/homography) — the projective planar mapping; the $2m \times 9$ DLT matrix assembles two rows per correspondence and the nine-vector $h = v_9$ reshapes to the $3 \times 3$ homography.

# References

1. H. C. Longuet-Higgins. *A computer algorithm for reconstructing a scene from two projections.* Nature, 293:133–135, 1981.
2. R. I. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 19(6):580–593, 1997.
3. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 22(11):1330–1334, 2000.
4. J. Gao, S. J. Kim, M. S. Brown. *Constructing Image Panoramas Using Dual-Homography Warping.* IEEE CVPR, 2011.
5. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision*, 2nd ed. Cambridge University Press, 2004.
