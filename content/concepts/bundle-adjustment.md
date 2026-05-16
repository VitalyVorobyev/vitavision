---
title: "Bundle Adjustment"
date: 2026-05-16
summary: "Joint nonlinear least-squares refinement of all camera parameters — and, in structure-from-motion, all 3-D points — that minimises the total reprojection error."
tags: ["optimization"]
author: "Vitaly Vorobyev"
domain: calibration
difficulty: advanced
prerequisites:
  - pinhole-camera-model
sources:
  primary: zhang2000-flexible
  references:
    - tsai1987-versatile
    - weng1992-camera
---

# Definition

Bundle adjustment is the joint nonlinear least-squares refinement of all camera parameters — intrinsics, lens-distortion coefficients, and per-view extrinsics — and, in the general structure-from-motion case, all 3-D point positions, that minimises the total reprojection error across every observed image point.

:::definition[Bundle-adjustment objective]
Given $n$ views and $m$ 3-D points, with $m_{ij}$ the observed image coordinates of point $j$ in view $i$, the bundle-adjustment problem is

$$\min_{K,\,k,\,\{R_i, t_i\},\,\{M_j\}} \sum_i \sum_j \bigl\| m_{ij} - \hat{m}(K, k, R_i, t_i, M_j) \bigr\|^2,$$

where $\hat{m}(\cdot)$ is the predicted pixel position obtained by projecting $M_j$ through the pinhole model. Input: initial parameter estimates and observed correspondences. Output: the maximum-likelihood parameter set under i.i.d. Gaussian image noise.
:::

In camera calibration the 3-D point positions $M_j$ are fixed by the target geometry and only the camera parameters are free; in structure-from-motion the points are unknown and refined jointly.

# Mathematical Description

## Reprojection-error objective

Under i.i.d. zero-mean Gaussian image noise of equal variance in both pixel coordinates, the maximum-likelihood estimate of all parameters is exactly the minimiser of the sum of squared Euclidean reprojection errors,

$$\min \sum_i \sum_j \bigl\| m_{ij} - \hat{m}(K, k, R_i, t_i, M_j) \bigr\|^2.$$

Zhang's final calibration stage minimises this jointly over the five intrinsic parameters, the two radial-distortion coefficients, and the per-view extrinsics — a full bundle adjustment restricted to the camera variables. Weng et al. minimise the identical pixel-residual sum over the non-distortion intrinsics and the five distortion coefficients.

## Levenberg-Marquardt solver

The standard solver is Levenberg-Marquardt, a damped Gauss-Newton method. With residual vector $r(\theta)$ and Jacobian $J = \partial r/\partial\theta$, one iteration solves the damped normal equations

$$\bigl(J^\top J + \lambda D\bigr)\,\delta = -J^\top r,$$

where $\lambda > 0$ is the damping parameter and $D$ is typically $\mathrm{diag}(J^\top J)$. Large $\lambda$ makes $\delta$ a scaled steepest-descent step; small $\lambda$ approaches the Gauss-Newton step. The algorithm raises $\lambda$ when a step fails to decrease the cost and lowers it when a step is accepted, interpolating between robust gradient descent far from the minimum and fast quadratic convergence near it. Zhang reports convergence in three to five iterations from a closed-form linear initialisation; Tsai's stage-2 refinement is a two-iteration solve restricted to three unknowns.

## Sparse block structure

In the full structure-from-motion case each scalar residual depends only on the parameters of one camera and one point. The resulting $J^\top J$ is block-sparse — camera-camera and point-point diagonal blocks with camera-point off-diagonal blocks. The Schur complement eliminates the numerous small point blocks, leaving a reduced camera-only system; this is what keeps bundle adjustment tractable for thousands of views and millions of points. In the calibration-only case the 3-D points are fixed, there are no point blocks, and the normal equations are dense in the camera parameters.

## Initialisation from linear estimates

The objective is non-convex and Levenberg-Marquardt converges only to a local minimum, so a sufficiently accurate closed-form initialisation is required to place the solver in the basin of the global minimum. Zhang's linear stage solves a homogeneous system for the image of the absolute conic, extracts the intrinsics in closed form, and recovers per-view extrinsics from the homographies — the seed for the nonlinear refinement. Tsai's radial-alignment-constraint linear stage and Weng's central-point linear solve play the same role. In every case the final nonlinear refinement is a bundle adjustment seeded by a linear estimate.

# Numerical Concerns

**Initialisation dependence.** The reprojection-error objective is non-convex; solution quality depends critically on the initial estimate. Zhang notes that the closed-form linear estimate of the first distortion coefficient can carry the wrong sign — a local-minimum risk that joint refinement resolves only because the other parameters are already well initialised.

**Rotation parameterisation.** Rotations lie on the three-dimensional manifold $SO(3)$; adding an unconstrained perturbation to a rotation matrix breaks orthogonality. The Rodrigues 3-vector keeps the nine matrix entries consistent and the Jacobian unconstrained; a unit quaternion is the alternative, with a unit-norm constraint enforced by normalisation after each update.

**Gauge freedom.** In unconstrained structure-from-motion the absolute scale is unobservable — rescaling all points and translations leaves every reprojection error unchanged — so $J^\top J$ is rank-deficient and a gauge-fixing convention is required. With a known calibration target the point positions are fixed and gauge freedom does not arise.

**Jacobian conditioning.** Parameters of very different scale — focal lengths in pixels ($\sim 10^3$) versus distortion coefficients ($\sim 10^{-3}$) — produce $J$ columns of very different norm and a poorly scaled $J^\top J$. Marquardt damping with $D = \mathrm{diag}(J^\top J)$ normalises each parameter direction to its own curvature; double precision is required for the small intermediate quantities.

**Schur-complement cost.** Eliminating point blocks introduces fill-in in the reduced camera matrix whenever two cameras share a point; for large problems the reduced system's sparsity must be analysed before choosing a direct Cholesky or a preconditioned-conjugate-gradient solver.

**Outlier sensitivity.** The least-squares objective penalises all residuals quadratically, so a single mismatch can dominate the Jacobian. Robust loss functions — Huber, Cauchy, truncated quadratic — grow more slowly for large residuals, approximating maximum likelihood under a heavy-tailed error distribution; standard practice alternates robust bundle adjustment with outlier rejection.

# Where it appears

Bundle adjustment — in the restricted form of joint camera-parameter refinement over a fixed 3-D pattern — is the final and most accurate step of every classical camera-calibration pipeline in the atlas.

- [zhang-planar-calibration](/atlas/zhang-planar-calibration) — the nonlinear Levenberg-Marquardt refinement is the bundle-adjustment stage: all intrinsics, both distortion coefficients, and all per-view extrinsics refined jointly by minimising the total reprojection error, seeded by the closed-form IAC solve.
- [tsai-versatile-calibration](/atlas/tsai-versatile-calibration) — stage 2 is a restricted bundle adjustment: with rotation and the lateral translation fixed from the linear stage, only focal length, depth translation, and one distortion coefficient are refined.
- [scaramuzza-omni-calibration](/atlas/scaramuzza-omni-calibration) — the omnidirectional model's final nonlinear refinement minimises the same reprojection-error objective with the same solver, over the polynomial coefficients and per-view extrinsics.

Bundle adjustment is the numerical procedure that recovers the parameters of the [pinhole-camera-model](/atlas/pinhole-camera-model) to maximum-likelihood accuracy from image observations.

# References

1. B. Triggs, P. McLauchlan, R. Hartley, A. Fitzgibbon. *Bundle Adjustment — A Modern Synthesis.* In Vision Algorithms: Theory and Practice, LNCS 1883, Springer, 2000.
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 22(11):1330–1334, 2000.
3. R. Y. Tsai. *A Versatile Camera Calibration Technique for High-Accuracy 3D Machine Vision Metrology.* IEEE Journal on Robotics and Automation, 3(4):323–344, 1987.
4. J. Weng, P. Cohen, M. Herniou. *Camera Calibration with Distortion Models and Accuracy Evaluation.* IEEE TPAMI, 14(10):965–980, 1992.
5. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision*, 2nd ed. Cambridge University Press, 2004.
