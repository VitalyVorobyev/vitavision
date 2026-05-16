---
title: "Epipolar Geometry"
date: 2026-04-30
summary: "The intrinsic projective geometry of two views of a scene, encoding the constraint that a point visible in one image must lie on a specific line in the other image determined entirely by the camera positions."
tags: ["stereo", "two-view-geometry"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: advanced
prerequisites: [ransac]
sources:
  references:
    - hartley1997-eight-point
---

# Definition

Epipolar geometry describes the geometric relationship between two images of the same scene taken from different camera centers $C$ and $C'$. For any point $P$ in the scene, its projections $\mathbf{x}$ and $\mathbf{x}'$ into the two images, together with the two camera centers, are coplanar. This plane is called the **epipolar plane** of $P$. The epipolar plane intersects image 1 along the **epipolar line** $\mathbf{l}$ corresponding to $\mathbf{x}'$, and image 2 along the epipolar line $\mathbf{l}'$ corresponding to $\mathbf{x}$.

The epipolar constraint states: given a point $\mathbf{x}$ in image 1, its corresponding point $\mathbf{x}'$ in image 2 must lie on the epipolar line $\mathbf{l}'$ in image 2. This reduces stereo correspondence search from 2-D to 1-D.

The **epipoles** $\mathbf{e}$ and $\mathbf{e}'$ are the projections of each camera center into the opposite image: $\mathbf{e}$ is the projection of $C'$ into image 1; $\mathbf{e}'$ is the projection of $C$ into image 2. All epipolar lines in image 1 pass through $\mathbf{e}$; all epipolar lines in image 2 pass through $\mathbf{e}'$.

# Mathematical Description

## Fundamental matrix

:::definition[Fundamental matrix]
The unique $3 \times 3$ rank-2 matrix $F$ encoding the epipolar constraint between two uncalibrated cameras.

For any pair of corresponding points $\mathbf{x} \leftrightarrow \mathbf{x}'$ (in pixel coordinates), $F$ satisfies:

$$
\mathbf{x}'^T F\,\mathbf{x} = 0.
$$
:::

The epipolar line in image 2 corresponding to $\mathbf{x}$ is $\mathbf{l}' = F\,\mathbf{x}$; the epipolar line in image 1 corresponding to $\mathbf{x}'$ is $\mathbf{l} = F^T\mathbf{x}'$.

**Properties of $F$:**
- Rank 2 (not full rank; $\det F = 0$).
- 7 degrees of freedom (9 entries, $-1$ for scale, $-1$ for the rank constraint).
- Skew-symmetric part is related to the epipole: $F\,\mathbf{e} = \mathbf{0}$ and $F^T\mathbf{e}' = \mathbf{0}$.

## Essential matrix

When the camera intrinsic matrices $K$ and $K'$ are known, the epipolar constraint can be expressed in calibrated (normalized) coordinates $\hat{\mathbf{x}} = K^{-1}\mathbf{x}$ and $\hat{\mathbf{x}}' = K'^{-1}\mathbf{x}'$:

$$
\hat{\mathbf{x}}'^T E\,\hat{\mathbf{x}} = 0,
$$

where $E$ is the **essential matrix**.

:::definition[Essential matrix]
The fundamental matrix in calibrated coordinates; encodes only the relative rotation $R$ and translation $t$ between the two cameras.

$$
E = [t]_\times R,
$$

where $[t]_\times$ is the skew-symmetric matrix of $t$.
:::

**Relationship between $E$ and $F$:**

$$
E = K'^T F K.
$$

**Properties of $E$:**
- Rank 2, with two equal non-zero singular values (this is a necessary and sufficient condition for a $3\times 3$ matrix to be an essential matrix).
- 5 degrees of freedom: 3 for rotation $R \in SO(3)$, 2 for the direction of $t$ (translation is determined only up to scale from image correspondences alone).

## Decomposing $E$ into $R$ and $t$

Given $E$, compute its SVD: $E = U\,\mathrm{diag}(\sigma, \sigma, 0)\,V^T$. The four candidate decompositions are:

$$
(R, t) \in \{(UWV^T,\, u_3),\,(UWV^T,\,-u_3),\,(UW^TV^T,\,u_3),\,(UW^TV^T,\,-u_3)\},
$$

where $W = \begin{bmatrix}0&-1&0\\1&0&0\\0&0&1\end{bmatrix}$ and $u_3$ is the third column of $U$. A single triangulated 3-D point with positive depth in both cameras disambiguates the four solutions.

## Estimation

**8-point algorithm.** Each correspondence $\mathbf{x}_i \leftrightarrow \mathbf{x}'_i$ yields one linear equation in the 9 entries of $F$ (or $E$). Stacking $n \geq 8$ equations gives the design matrix $A$; the solution is the smallest right singular vector of $A$. The rank-2 constraint is enforced by zeroing the smallest singular value of the initial estimate.

**Normalized 8-point algorithm.** Hartley normalization (translate to zero mean, scale to $\sqrt{2}$ RMS distance) is applied to both point sets before forming $A$. This conditions the design matrix and produces numerically accurate results even from hundreds of noisy correspondences.

**5-point algorithm.** For the essential matrix specifically, 5 correspondences suffice (since $E$ has 5 degrees of freedom). The 5-point solver of Nistér (2004) finds the set of all valid $E$ consistent with 5 correspondences by solving a polynomial system (up to 10 real solutions), selecting the physically valid one via a depth-positivity test. It is the minimal solver used inside RANSAC for calibrated stereo and structure-from-motion.

# Numerical Concerns

**Rank-2 enforcement.** DLT minimizes an algebraic error and does not constrain $F$ to rank 2. The rank-2 projection is applied after DLT by setting the smallest singular value of the $3\times 3$ DLT solution to zero. This projection is optimal in the Frobenius norm but not in the geometric (Sampson) error; iterative refinement of the rank-constrained $F$ using the geometric error is preferred for accuracy.

**Hartley normalization.** Without normalization the design matrix $A$ for the 8-point algorithm has a large condition number (proportional to the image coordinate range squared), producing solutions that are sensitive to noise. Normalization is not optional for the fundamental matrix; it is required for the algorithm to work reliably.

**Gauge ambiguity.** The fundamental matrix is defined only up to scale. Setting $\|F\|_F = 1$ is standard. For the essential matrix, the two equal singular values are conventionally set to 1 after enforcing the rank constraint; this fixes the scale of $E$ relative to the image coordinate system but not the metric scale of $t$.

**Degenerate configurations.** The fundamental matrix is undefined when all scene points are coplanar (the epipolar constraint degenerates to a planar homography). This case is detected when the design matrix $A$ is rank-deficient or has two near-equal small singular values. Structure-from-motion pipelines use a homography-vs-fundamental-matrix test (comparing inlier counts under both models) to detect planar scenes and select the appropriate initialization.

**Epipole near or in the image.** When the second camera is looking at the first camera (forward motion), $\mathbf{e}'$ lies inside or near the image. Algorithms that parameterize $F$ via the epipole (e.g., 7-point solver) become poorly conditioned. The Sampson correction to the algebraic error is well-behaved even in this case.

**Translation-only degeneracy.** Pure translation with no rotation gives $E = [t]_\times$, which is symmetric and has a unique right null vector $t$. The 5-point solver does not degenerate in this case, but the 8-point solver can yield inaccurate rotation estimates because the off-diagonal terms are dominated by the skew-symmetric part.

# Where it appears

Epipolar geometry is the foundational constraint for any algorithm that uses two or more camera views. It reduces stereo matching from a 2-D search to a 1-D search along epipolar lines, and it is the core relation recovered in the first step of structure-from-motion.

No algorithm pages on this site currently cover stereo reconstruction, triangulation, or multi-view structure-from-motion — the domains where epipolar geometry is used directly. The concept is documented here because it is a prerequisite for those topics and because the homography (documented separately) is the degenerate case of epipolar geometry for planar scenes.

# References

1. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision.* 2nd ed. Cambridge University Press, 2004. Chapters 9–11 give the definitive treatment of the fundamental matrix, essential matrix, and estimation algorithms.
2. H. C. Longuet-Higgins. "A Computer Algorithm for Reconstructing a Scene from Two Projections." *Nature* 293, 1981. Introduces the essential matrix and the 8-point algorithm for calibrated cameras.
3. R. Hartley. "In Defense of the Eight-Point Algorithm." *IEEE TPAMI* 19(6), 1997. Establishes data normalization as the key fix that makes the 8-point algorithm reliable.
4. D. Nistér. "An Efficient Solution to the Five-Point Relative Pose Problem." *IEEE TPAMI* 26(6), 2004. The 5-point minimal solver; standard in RANSAC-based pose estimation.
5. R. Szeliski. *Computer Vision: Algorithms and Applications.* 2nd ed. Springer, 2022. §11.1–11.3 cover stereo and two-view geometry with implementation notes.
