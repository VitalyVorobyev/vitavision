---
title: "Optical Flow"
date: 2026-05-16
summary: "The apparent 2-D velocity field of image brightness between consecutive frames, recovered from the spatio-temporal gradient under the brightness-constancy assumption."
tags: ["optical-flow", "variational"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites:
  - image-gradient
  - structure-tensor
sources:
  primary: horn1981-horn-schunck
  references:
    - lucas1981-lucas-kanade
    - black1996-robust
    - tomasi1991-detection-tracking
---

# Definition

Optical flow is the apparent 2-D velocity field of image brightness induced by relative motion between a scene and the imaging sensor. Given a grayscale image sequence $I(x, y, t)$, optical flow assigns to every pixel a velocity vector $(u, v)$ — horizontal and vertical displacement per unit time — such that the observed intensity change is explained by advection of the brightness pattern.

The fundamental constraint relating the flow to the measured spatiotemporal gradient is the brightness-constancy equation:

:::definition[Optical-flow constraint equation]
Assuming image brightness is conserved along the trajectory of a moving point, a first-order Taylor expansion of $I(x + u\,\delta t,\, y + v\,\delta t,\, t + \delta t) = I(x, y, t)$ yields the linear constraint

$$I_x u + I_y v + I_t = 0,$$

where $I_x = \partial I/\partial x$, $I_y = \partial I/\partial y$, and $I_t = \partial I/\partial t$ are the spatial and temporal partial derivatives of brightness. Input: a sequence of at least two frames. Output: a per-pixel velocity field $(u, v)$ in units of pixels per frame.
:::

The constraint is one linear equation in two unknowns per pixel. Additional assumptions — global smoothness, local consistency, or robust statistics — are required to obtain a unique flow field.

# Mathematical Description

## Derivation of the brightness-constancy constraint

If a patch of brightness moves rigidly with velocity $(u, v)$, its brightness is conserved: $I(x + u\,\delta t,\, y + v\,\delta t,\, t + \delta t) = I(x, y, t)$. Expanding to first order in $\delta t$ and dividing through gives $I_x u + I_y v + I_t = 0$. The assumption is violated by illumination changes, specular reflections, and non-Lambertian surfaces; the equation then carries an incorrect $I_t$ with no indication of failure.

## The aperture problem

The brightness-constancy equation defines a constraint *line* in the $(u, v)$-plane — only the component of velocity normal to the local iso-brightness contour, the *normal flow* $-I_t / \sqrt{I_x^2 + I_y^2}$, is determined. The component along the contour is undetermined from local gradient information alone.

:::definition[Aperture problem]
A single edge, viewed through any finite aperture, determines only the gradient-aligned component of its motion. Recovering the full 2-D velocity requires either pooling pixels whose gradient directions span two dimensions, or imposing a prior over the velocity field.
:::

## Global / variational approach

The aperture problem can be resolved by penalising spatial variation in the flow field. The variational energy minimised over the image domain is

$$\mathcal{E}^2 = \iint \!\left[\alpha^2 (I_x u + I_y v + I_t)^2 + \|\nabla u\|^2 + \|\nabla v\|^2 \right] dx\, dy,$$

where $\alpha^2$ weights data fidelity against the smoothness penalty $\|\nabla u\|^2 + \|\nabla v\|^2$. Applying the Euler-Lagrange equations and approximating the Laplacian as $\nabla^2 u \approx K(\bar{u} - u)$ with proportionality factor $K = 3$ for the weighted 3×3 stencil yields the per-pixel iterative update

$$u^{n+1} = \bar{u}^n - \frac{I_x\!\left[I_x \bar{u}^n + I_y \bar{v}^n + I_t\right]}{\alpha^2 + I_x^2 + I_y^2}, \qquad v^{n+1} = \bar{v}^n - \frac{I_y\!\left[I_x \bar{u}^n + I_y \bar{v}^n + I_t\right]}{\alpha^2 + I_x^2 + I_y^2},$$

where $\bar{u}^n$, $\bar{v}^n$ are the local weighted averages of the flow at iteration $n$. Information propagates spatially across iterations, filling uniform regions by solving Laplace's equation from the textured boundary inward. The global formulation produces a dense flow field at every pixel but blurs discontinuities at motion boundaries.

## Local / windowed approach

The aperture problem can instead be resolved locally: under the assumption that all pixels in a window $\mathcal{W}$ share a single velocity, the brightness-constancy equations over the window form an over-determined system solvable in the least-squares sense. Setting the derivative of $E = \sum_{\mathcal{W}} (I_x u + I_y v + I_t)^2$ to zero yields the 2×2 normal equation

$$\underbrace{\left(\sum_{\mathcal{W}} \nabla I\, \nabla I^T\right)}_{M} \begin{pmatrix} u \\ v \end{pmatrix} = -\sum_{\mathcal{W}} I_t\, \nabla I,$$

whose coefficient matrix $M = \sum_{\mathcal{W}} \nabla I\, \nabla I^T$ is identically the [structure tensor](/atlas/structure-tensor) — the gradient outer-product sum over the window. The system is solvable if and only if $M$ is full-rank, which requires the window to contain gradient directions spanning two independent dimensions. The local approach yields no estimate in untextured windows but is accurate and efficient at texture-rich locations.

## Robust approach

The quadratic ($L_2$) penalties of the global and local formulations average competing constraints. When multiple motions coexist in a neighbourhood — at depth discontinuities or independently moving objects — constraints from competing motions act as gross errors that an $L_2$ penalty cannot reject. Replacing the quadratic penalties in both the data and smoothness terms with redescending M-estimators $\rho(\cdot)$ — whose influence $\psi(x) = \rho'(x)$ diminishes for residuals beyond a scale $\sigma$ — gives the robust regularisation energy

$$E(u,v) = \sum_s \rho_D(I_x u_s + I_y v_s + I_t,\, \sigma_D) + \lambda \sum_s \sum_{n \in \mathcal{N}(s)} \!\bigl[\rho_S(u_s - u_n,\, \sigma_S) + \rho_S(v_s - v_n,\, \sigma_S)\bigr],$$

with data and smoothness penalties $\rho_D$, $\rho_S$, scale parameters $\sigma_D$, $\sigma_S$, and smoothness weight $\lambda$. A common choice is the Lorentzian

$$\rho(x, \sigma) = \log\!\bigl(1 + \tfrac{1}{2}(x/\sigma)^2\bigr), \qquad \psi(x, \sigma) = \frac{2x}{2\sigma^2 + x^2}.$$

Because $\rho$ is non-convex, a graduated non-convexity (GNC) continuation is applied: $\sigma$ is initialised large enough to make the objective convex, then reduced progressively so that outliers are identified incrementally. Robustifying only the smoothness term while keeping a quadratic data term is insufficient; both terms must be robust.

# Numerical Concerns

**Temporal-derivative estimation.** Estimating $I_t$ requires differencing across frames at the same spatial location used for $I_x$, $I_y$. Averaging first differences over the corners of a 2×2×2 spatiotemporal voxel co-locates all three partial derivatives at the voxel centre and avoids temporal-misalignment artefacts. Larger finite-difference stencils are equivalent to pre-smoothing before differencing and widen the estimation kernel at the cost of spatial resolution.

**Large-displacement failure and coarse-to-fine pyramids.** The first-order linearisation requires inter-frame displacement well below one grid unit. Iterative gradient methods converge only when the initial displacement error is within roughly half a wavelength of the dominant texture frequency — for a pure sinusoid the convergence basin is $|h_0| < \pi$. Coarse-to-fine Gaussian pyramids extend the usable range by estimating at a coarse scale and propagating the estimate downward, warping one frame toward the other at each level.

**Rank-deficient structure tensor.** The windowed normal-equation matrix $M$ becomes rank-deficient when all gradient vectors in the window are parallel — the aperture-problem case. One eigenvalue $\lambda_2$ is then near zero, and inverting $M$ without regularisation produces arbitrarily large velocities in the uninformed direction. The acceptance criterion $\min(\lambda_1, \lambda_2) > \tau$ gates which windows are well-conditioned enough to solve; windows failing it are discarded rather than assigned a meaningless estimate.

**Smoothness weight and conditioning.** The denominator $\alpha^2 + I_x^2 + I_y^2$ of the variational update prevents division by zero in uniform regions and controls how strongly boundary conditions propagate inward. Too small an $\alpha^2$ produces haphazard updates in low-gradient regions; too large an $\alpha^2$ blurs flow discontinuities. The quantity $\alpha^2$ has units of squared gradient and is not transferable between images of different exposure or resolution without rescaling.

**GNC scale schedule.** The robust objective is convex only when the continuation scale $\sigma$ is initialised large enough — for the Lorentzian, $\sigma_\text{init} = r_\text{max}/\sqrt{2}$, where $r_\text{max}$ is the maximum expected residual. An incorrect initialisation leaves the objective non-convex from the start with no global-minimum guarantee. A slow geometric schedule (for example $\sigma_{i+1} = 0.95\,\sigma_i$) trades iteration count for the reliability of the outlier identification.

**Warping and interpolation bias.** Iterative refinement across pyramid levels evaluates gradients at non-integer positions after warping. Bilinear interpolation introduces a smoothing bias proportional to the local intensity Hessian; sub-pixel accuracy demands accurate gradient estimation at each warp step.

# Where it appears

The registered atlas pages each instantiate the optical-flow concept under a different resolution of the aperture problem.

- [horn-schunck](/atlas/horn-schunck) — the global variational formulation. Minimises the combined data + smoothness energy over the entire image domain; the Gauss-Seidel update propagates information from textured to untextured regions, producing a dense flow field. The quadratic smoothness prior is the explicit regularisation of the underdetermined brightness-constancy system.
- [lucas-kanade](/atlas/lucas-kanade) — the local windowed formulation. Replaces the global smoothness prior with a constant-flow assumption over a finite window; the resulting normal equation has the structure tensor as its coefficient matrix. The aperture problem survives as a rank condition on that matrix — the algorithm produces no estimate where $M$ is rank-deficient rather than propagating a regularised one.
- [black-anandan-robust-flow](/atlas/black-anandan-robust-flow) — the robust M-estimator extension of both formulations. Replaces the quadratic penalty in the data and smoothness terms with a redescending estimator, making the energy tolerant of outliers from competing motions; the GNC continuation operationalises the resulting non-convex optimisation.

The Tomasi-Kanade tracker applies the same brightness-constancy constraint and structure tensor to a different problem: rather than estimating flow densely, it selects windows where the structure tensor is well-conditioned ($\min(\lambda_1, \lambda_2) > \tau$) and tracks only those feature points across frames. It is not yet a registered page.

# References

1. B. K. P. Horn, B. G. Schunck. *Determining Optical Flow.* Artificial Intelligence, 17(1–3):185–203, 1981.
2. B. D. Lucas, T. Kanade. *An Iterative Image Registration Technique with an Application to Stereo Vision.* Proceedings of the 7th International Joint Conference on Artificial Intelligence, 1981.
3. M. J. Black, P. Anandan. *The Robust Estimation of Multiple Motions: Parametric and Piecewise-Smooth Flow Fields.* Computer Vision and Image Understanding, 63(1):75–104, 1996.
4. C. Tomasi, T. Kanade. *Detection and Tracking of Point Features.* Technical Report CMU-CS-91-132, Carnegie Mellon University, 1991.
