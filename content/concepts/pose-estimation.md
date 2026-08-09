---
title: "Pose Estimation"
date: 2026-05-16
summary: "Recovery of the 6-DOF rigid transformation — rotation and translation — relating a camera to a scene, an object, or a second camera."
tags: ["pose-estimation"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: intermediate
prerequisites:
  - pinhole-camera-model
sources:
  primary: lepetit2009-epnp
  references:
    - longuet-higgins1981-eight-point
    - zhang2000-flexible
---

# Definition

Pose estimation is the recovery of the 6-DOF rigid transformation that places a camera relative to a scene, an object, or a second camera. The transformation is a rotation $R \in SO(3)$ and translation $t \in \mathbb{R}^3$; together they form the extrinsic matrix $[R \mid t]$ of the [pinhole camera model](/atlas/pinhole-camera-model). Two structurally distinct sub-problems are in common use, distinguished by the input correspondences.

:::definition[Absolute pose — Perspective-n-Point]
Given a calibrated camera with intrinsic matrix $K$ and $n$ correspondences between known 3-D world points $\tilde{M}_i$ and their observed image projections $\tilde{m}_i$, recover $[R \mid t]$ such that $\tilde{m}_i \sim K\,[R \mid t]\,\tilde{M}_i$ for all $i$. Input: $n \geq 4$ 2D-3D point pairs and $K$. Output: the camera pose $[R \mid t]$.
:::

:::definition[Relative pose from two views]
Given two calibrated views with corresponding image points $\mathbf{x}_i \leftrightarrow \mathbf{x}_i'$ in normalised coordinates, recover the rotation $R$ and translation direction $\mathbf{T}$ (unit norm, scale unobservable) satisfying the epipolar constraint $\mathbf{x}_i'^{\,T} E\, \mathbf{x}_i = 0$, where $E = [\mathbf{T}]_\times R$ is the essential matrix. Input: $n \geq 8$ corresponding normalised points. Output: $R$ and $\mathbf{T}$ up to scale, with a four-fold ambiguity resolved by cheirality.
:::

# Mathematical Description

## Absolute pose: Perspective-n-Point

The calibrated PnP problem asks for $[R \mid t]$ given $n$ 2D-3D correspondences and $K$. EPnP solves it in $O(n)$ by expressing every reference point as a barycentric combination of four virtual control points,

$$\mathbf{p}_i^w = \sum_{j=1}^{4} \alpha_{ij}\,\mathbf{c}_j^w, \qquad \sum_{j=1}^{4} \alpha_{ij} = 1.$$

Because affine combinations are preserved by rigid motion, the same weights hold in camera coordinates, $\mathbf{p}_i^c = \sum_j \alpha_{ij}\,\mathbf{c}_j^c$. Substituting the camera-frame decomposition into the perspective projection and eliminating the projective scale yields two linear equations per point; stacking $n$ points gives the $2n \times 12$ homogeneous system $M\mathbf{x} = \mathbf{0}$, whose solution lies in the null space of the constant-size $12 \times 12$ matrix $M^\top M$,

$$\mathbf{x} = \sum_{i=1}^{N} \beta_i\,\mathbf{v}_i,$$

with $N \in \{1,2,3,4\}$ the effective null-space dimension. The $\beta_i$ are fixed by requiring inter-control-point distances in camera coordinates to match the world distances, and the pose is extracted from the recovered control points by absolute orientation. The minimal cases are $n = 3$ (planar) and $n = 4$ (general position).

## Relative pose: the essential matrix

For two calibrated views with normalised coordinates, the essential matrix $E$ encodes the relative pose through the bilinear epipolar constraint $\mathbf{x}_i'^{\,T} E\, \mathbf{x}_i = 0$, with

$$E = R\,S, \qquad S = [\mathbf{T}]_\times,$$

the skew-symmetric matrix of the unit translation $\mathbf{T}$. Each correspondence supplies one linear constraint on the nine entries of $E$; eight correspondences determine their ratios by linear least squares, and the scale is fixed by $\mathrm{tr}(E^\top E) = 2$. The translation components follow from $E^\top E$, whose diagonal entries are $1 - T_\lambda^2$ and off-diagonal entries $-T_\lambda T_\mu$; the rotation follows in closed form. The recovered pose carries a four-fold sign ambiguity, resolved by cheirality — all reconstructed points must lie in front of both cameras. This recovered $(R, \mathbf{T})$ is precisely the input calibrated [stereo rectification](/atlas/stereo-rectification) consumes to re-orient both cameras onto a common baseline-aligned frame, as in [Fusiello compact rectification](/atlas/fusiello-compact-rectification).

## Pose from a calibration target

During calibration, per-view extrinsic pose is an implicit output. For a planar target the projection reduces to the homography $s\,\tilde{m} = H\,\tilde{M}_{2D}$ with $H = \lambda K[r_1\;\;r_2\;\;t]$; the rotation columns and translation are extracted directly,

$$r_1 = \lambda K^{-1} h_1, \qquad r_2 = \lambda K^{-1} h_2, \qquad t = \lambda K^{-1} h_3,$$

with $\lambda = 1/\|K^{-1}h_1\|$ enforcing unit norm and $r_3 = r_1 \times r_2$ completing the rotation.

## Nonlinear refinement

Closed-form solutions seed a nonlinear refinement that minimises the total reprojection error $\sum_i \mathrm{dist}^2(K[R\mid t]\tilde{M}_i,\, \tilde{m}_i)$ over the six pose degrees of freedom — and, during calibration, jointly over the intrinsics.

# Numerical Concerns

**Rotation parameterisation.** A rotation matrix has nine entries under six constraints; unconstrained optimisation of the entries violates orthogonality. The Rodrigues 3-vector keeps all nine entries consistent and the Jacobian unconstrained; a unit quaternion is the alternative, with a unit-norm side constraint handled by normalisation.

**Translation scale ambiguity.** Relative pose recovers $\mathbf{T}$ only as a direction; absolute scale is unobservable from image data alone and requires a metric anchor — a known distance, a stereo baseline, or an IMU.

**Planar and collinear degeneracy.** A coplanar, tilted point set admits two valid PnP solutions; collinear points make the constraint matrix rank-deficient regardless of $n$. For the eight-point algorithm, coplanar or collinear configurations similarly cause rank loss.

**Sensitivity to correspondence noise.** PnP solvers and the eight-point algorithm are pure model fitters — a single mismatch degrades the solution. The standard remedy wraps the solver in a RANSAC loop over minimal samples.

**Minimal vs overdetermined solvers.** The minimal calibrated absolute-pose solver is P3P; the minimal relative-pose solver is the five-point algorithm. EPnP targets the overdetermined regime ($n \geq 4$) and is suited to run after RANSAC inlier selection.

**Reprojection error vs pose error.** Reprojection error is the measurable surrogate for pose error, but minimising it does not strictly minimise rotation or translation error; near degeneracy or at high noise the two criteria disagree.

# Where it appears

Pose estimation appears at every layer of the calibration and localisation pipeline.

- [epnp](/atlas/epnp) — the calibrated PnP solver: absolute pose in $O(n)$ from $n \geq 4$ 2D-3D correspondences with a known intrinsic matrix.
- [longuet-higgins-eight-point](/atlas/longuet-higgins-eight-point) — the foundational linear algorithm for relative pose from $n \geq 8$ calibrated correspondences; introduces the essential matrix and cheirality resolution.
- [zhang-planar-calibration](/atlas/zhang-planar-calibration) — recovers per-view extrinsic pose alongside intrinsics; pose extraction follows from the per-view homography factorisation.
- [tsai-versatile-calibration](/atlas/tsai-versatile-calibration) — recovers extrinsic pose from a 3-D calibration rig via the radial alignment constraint.
- [stereo-rectification](/atlas/stereo-rectification) — calibrated rectification consumes the relative pose $(R, \mathbf{T})$ recovered here to build the common-orientation camera pair.
- [fusiello-compact-rectification](/atlas/fusiello-compact-rectification) — builds its new, shared-orientation projection matrices directly from this relative pose.

Pose is defined within the [pinhole-camera-model](/atlas/pinhole-camera-model): it is precisely the extrinsic component $[R \mid t]$ of the central projection equation.

# References

1. V. Lepetit, F. Moreno-Noguer, P. Fua. *EPnP: An Accurate O(n) Solution to the PnP Problem.* International Journal of Computer Vision, 81(2):155–166, 2009.
2. H. C. Longuet-Higgins. *A computer algorithm for reconstructing a scene from two projections.* Nature, 293:133–135, 1981.
3. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 22(11):1330–1334, 2000.
4. G. Schweighofer, A. Pinz. *Robust Pose Estimation from a Planar Target.* IEEE TPAMI, 28(12):2024–2030, 2006.
5. D. Nistér. *An Efficient Solution to the Five-Point Relative Pose Problem.* IEEE TPAMI, 26(6):756–777, 2004.
