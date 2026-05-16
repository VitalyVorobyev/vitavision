---
title: "Homography"
date: 2026-04-30
summary: "An invertible projective transformation of the plane, represented by a 3×3 matrix defined up to a non-zero scalar, mapping points between two images of a planar surface or capturing a pure camera rotation."
tags: ["two-view-geometry"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: intermediate
prerequisites: [ransac]
sources:
  references:
    - hartley1997-eight-point
    - zhang2000-flexible
---

# Definition

A homography is an invertible map between two projective planes $\mathbb{P}^2$. In the context of image formation, a homography maps every point in one image of a planar scene to the corresponding point in another image of the same scene, under the projective camera model. It is the unique map that is consistent with perspective projection from two camera centers onto a common world plane.

A homography is represented by a non-singular $3 \times 3$ matrix $H$ acting on homogeneous coordinates: if $\mathbf{x} = (x, y, 1)^T$ is a point in image 1, its image in image 2 is

$$
\mathbf{x}' \sim H\,\mathbf{x},
$$

where $\sim$ denotes equality up to a non-zero scalar (projective equivalence). Because $\lambda H$ and $H$ represent the same map for any $\lambda \neq 0$, a homography has $9 - 1 = 8$ degrees of freedom.

# Mathematical Description

## Projective geometry of the homography

A homography maps:
- **Points** $\mathbf{x} \mapsto H\mathbf{x}$ (projective equivalence).
- **Lines** $\mathbf{l} \mapsto H^{-T}\mathbf{l}$ (covariant under the dual transformation).
- **Conics** $C \mapsto H^{-T}CH^{-1}$.

Homographies preserve **collinearity** (points on a line map to points on a line) and the **cross-ratio** of four collinear points. They do not in general preserve angles, distances, or parallelism.

## Special cases

:::definition[Affine homography]
Last row is $(0, 0, 1)$; the map is an affinity. Has 6 degrees of freedom.

$$
H_A = \begin{bmatrix} a_{11} & a_{12} & t_x \\ a_{21} & a_{22} & t_y \\ 0 & 0 & 1 \end{bmatrix}.
$$
:::

:::definition[Similarity homography]
Affinity with $A = s R(\theta)$ for rotation $R(\theta)$ and scale $s > 0$. Has 4 degrees of freedom: $s$, $\theta$, $t_x$, $t_y$.
:::

:::definition[Euclidean homography]
$s = 1$; the map is a rigid transform (rotation + translation). Has 3 degrees of freedom.
:::

The hierarchy is: projective $\supset$ affinity $\supset$ similarity $\supset$ Euclidean.

## Physical correspondences

A homography arises in four distinct physical situations:

1. **Planar scene**: two cameras view the same planar surface; the projection onto each image is a homography of the plane.
2. **Pure rotation**: a camera rotates about its optical center with no translation; all depth levels map consistently, giving a homography between the two image planes.
3. **Projective texture-mapping**: the mapping from a reference texture atlas to a rendered image is a homography of the texture plane.
4. **Image rectification**: the warp that remaps two perspective images into a common rectified plane is a homography applied to each image.

## Estimation: DLT and normalized DLT

Given $n \geq 4$ point correspondences $\{(\mathbf{x}_i, \mathbf{x}'_i)\}$, each correspondence yields two linear constraints on the $9$-vector $\mathbf{h} = \mathrm{vec}(H)$:

$$
\begin{bmatrix}
-x_i & -y_i & -1 & 0 & 0 & 0 & x'_i x_i & x'_i y_i & x'_i \\
0 & 0 & 0 & -x_i & -y_i & -1 & y'_i x_i & y'_i y_i & y'_i
\end{bmatrix}
\mathbf{h} = \mathbf{0}.
$$

Stacking $n$ correspondences gives the $2n \times 9$ design matrix $A$; the solution is the right singular vector of $A$ corresponding to the smallest singular value (Direct Linear Transform, DLT). The Hartley normalization conditions the design matrix before DLT: translate each point set to zero mean and scale isotropically so the mean distance from the origin is $\sqrt{2}$, reducing the condition number of $A$ by orders of magnitude.

## Decomposition for calibration

When the camera intrinsic matrix $K$ is known, a homography between a world plane and the image can be decomposed into extrinsic parameters. Write $H = \lambda K [r_1 \; r_2 \; t]$ where $r_1$, $r_2$ are the first two columns of the rotation matrix $R$ and $t$ is the translation. From the columns $h_1 = \lambda K r_1$ and $h_2 = \lambda K r_2$:

$$
r_1 = \lambda^{-1} K^{-1} h_1, \quad r_2 = \lambda^{-1} K^{-1} h_2, \quad r_3 = r_1 \times r_2,
$$

with $\lambda = 1/\|K^{-1} h_1\|$. This decomposition is the core of Zhang's planar calibration method: observing the same planar target from $n$ views yields $n$ homographies, and the constraints $r_1^T r_2 = 0$ and $\|r_1\| = \|r_2\| = 1$ give two linear equations per homography in the entries of $K^{-T}K^{-1}$.

# Numerical Concerns

**Data normalization (Hartley normalization) is mandatory.** Without normalizing the coordinate systems of both point sets before DLT, the condition number of $A$ is proportional to the squared image coordinate range (typically $\sim 10^6$), leading to large numerical errors in the recovered $H$. The normalized DLT conditions $A$ to a condition number near 1 by applying the similarity transforms $T$ and $T'$ and recovering $H = T'^{-1} \hat{H} T$.

**Minimal configuration and degeneracy.** Four point correspondences are the minimum for DLT; fewer than four yield an underdetermined system. Degenerate configurations exist even with four or more points: if three or more points are collinear in either image, or if all points lie on a conic, the homography is not uniquely determined. RANSAC sampling should avoid or detect collinear triplets.

**Gauge fixing for nonlinear refinement.** $H$ is defined only up to scale; fixing $\|H\|_F = 1$ or $H_{33} = 1$ removes the scale ambiguity. The first normalization is better behaved for iterative nonlinear least squares because it avoids the singularity when $H_{33} \to 0$ (which occurs for nearly-affine homographies). LM refinement should parameterize $H$ as a unit-norm 9-vector with the scale fixed at initialization.

**Transfer error metric.** The algebraic error $\|A\mathbf{h}\|^2$ is minimized by DLT but does not correspond to a geometric distance. The symmetric transfer error $\sum_i (d(\mathbf{x}_i, H^{-1}\mathbf{x}'_i)^2 + d(\mathbf{x}'_i, H\mathbf{x}_i)^2)$ in pixel units is the geometrically meaningful cost for nonlinear refinement. The reprojection error using the full camera model is preferred when $K$ is known.

**Near-affine homographies.** When the scene plane is far from the camera and the depth variation is small, $H$ is nearly affine: $H_{31} \approx 0$ and $H_{32} \approx 0$. DLT is stable in this regime, but the normalized DLT can over-condition by removing perspective structure that is genuinely present at the few-pixel level. Using the Sampson error instead of the full reprojection error is more numerically stable near the affine regime.

**RANSAC sample size.** A minimal sample of 4 correspondences determines $H$ uniquely (generically). RANSAC draws 4-point minimal samples and fits DLT to each; the inlier threshold is typically 1–3 pixels in transfer error. The number of RANSAC iterations required for 99% success probability with 50% inliers is approximately $1 - (1 - 0.5^4)^N \geq 0.99$, giving $N \geq 72$.

# Where it appears

The homography is the geometric primitive underlying planar calibration, marker board detection, and image stitching. Every time a calibration target is a flat object, the mapping from its surface to the image is a homography.

- **zhang-planar-calibration** — estimates one homography per view of a planar calibration target; stacks the two linear constraints per view to solve for the intrinsic matrix $K$; decomposes each homography into the extrinsic rotation and translation for that view.
- **apap-image-stitching** — the global DLT homography between two images is the baseline warp; APAP replaces it with a spatially-varying field of per-pixel homographies estimated by Moving DLT, each weighted by proximity to matched feature points.

# References

1. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision.* 2nd ed. Cambridge University Press, 2004. §§4–5 cover projective transformations; §13 covers homography estimation and its role in calibration.
2. R. Hartley. "In Defense of the Eight-Point Algorithm." *IEEE TPAMI* 19(6), 1997. Establishes the Hartley normalization procedure as essential for numerically stable DLT.
3. Z. Zhang. "A Flexible New Technique for Camera Calibration." *IEEE TPAMI* 22(11), 2000. §§2–3 derive the two linear constraints per homography on the image of the absolute conic.
4. O. Faugeras. *Three-Dimensional Computer Vision.* MIT Press, 1993. Chapter 3 covers the algebraic and geometric properties of the homography group.
