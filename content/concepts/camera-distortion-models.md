---
title: "Camera Distortion Models"
date: 2026-05-02
summary: "Mathematical models for departures from the ideal pinhole projection — radial barrel/pincushion, tangential decentering, thin-prism — and the historical lineage from Brown's photogrammetric polynomial through Tsai's one-term radial, Weng's full Brown-Conrady, and Zhang's two-term planar formulation."
tags: ["calibration", "lens-distortion", "intrinsics", "camera-model"]
author: "Vitaly Vorobyev"
category: image-formation
difficulty: intermediate
prerequisites: []
related:
  - tsai-versatile-calibration
  - zhang-planar-calibration
  - kumar-generalized-rac
sources:
  references:
    - tsai1987-versatile
    - weng1992-camera
    - zhang2000-flexible
    - kumar2014-grac
---

# Definition

A **camera distortion model** describes the systematic deviation of an observed image point from where the ideal pinhole projection would place it. Lens elements introduce three independent classes of distortion that any practical calibration must model:

1. **Radial distortion** — points are displaced toward or away from the image centre as a function of their radial distance. "Barrel" distortion (negative coefficient — straight lines bow outward) is typical of wide-angle lenses; "pincushion" distortion (positive coefficient — straight lines bow inward) is typical of telephoto.
2. **Tangential (decentering) distortion** — caused by the lens elements being non-coaxial; the displacement has a non-zero component perpendicular to the radial direction. Significantly larger on cheap lenses and on lenses where the optical assembly is mechanically loose.
3. **Thin-prism distortion** — caused by tilt or wedge between optical elements; produces both radial and tangential components but with different angular dependence than pure decentering.

In the conventional notation, undistorted normalised image coordinates $(x, y)$ map to distorted normalised coordinates $(x_d, y_d)$ via

$$
\begin{aligned}
x_d &= x\,(1 + k_1 r^2 + k_2 r^4 + k_3 r^6 + \dots) + 2 p_1 x y + p_2 (r^2 + 2 x^2) + s_1 r^2 + \dots, \\
y_d &= y\,(1 + k_1 r^2 + k_2 r^4 + k_3 r^6 + \dots) + p_1 (r^2 + 2 y^2) + 2 p_2 x y + s_2 r^2 + \dots,
\end{aligned}
$$

with $r^2 = x^2 + y^2$. The radial polynomial has coefficients $(k_1, k_2, k_3, \dots)$; the tangential terms use $(p_1, p_2)$; the thin-prism terms use $(s_1, s_2)$. Each calibration paper picks a subset of these — there is no universal "correct" set.

# Mathematical Description

## The Brown polynomial (1966)

D. C. Brown's photogrammetric distortion model (1966, 1971) is the canonical full distortion polynomial. The radial component is the infinite series above; the tangential and thin-prism components are first-order in $(p_1, p_2)$ and $(s_1, s_2)$. Most modern calibration libraries (OpenCV, Bouguet, Kalibr) implement a truncated version of this polynomial — typically $(k_1, k_2, p_1, p_2, k_3)$ as a 5-parameter "Brown-Conrady" model, with $k_4$, $k_5$, $k_6$ as optional rational-distortion extensions.

## Tsai 1987 — one term, radial only

[Tsai's versatile calibration](/atlas/tsai-versatile-calibration) uses **only** the first radial term $\kappa_1$. Tsai explicitly excludes tangential and higher-order terms:

> "For industrial machine vision application, only radial distortion needs to be considered, and only one term is needed. Any more elaborate modelling not only would not help but also would cause numerical instability." (§II-B)

This claim is correct for the era's industrial CCD cameras with high-quality lenses, but is not generally true for modern wide-angle, fisheye, or low-cost optics. The exclusion of tangential terms is the structural limitation that [Weng's Brown-Conrady extension](#weng-1992--brown-conrady-with-tangential) lifts.

## Weng 1992 — full Brown-Conrady with tangential

J. Weng, P. Cohen, M. Herniou (TPAMI 1992) introduce the **Brown-Conrady model** to camera calibration, including both radial and tangential terms with closed-form derivatives suitable for nonlinear refinement. The model:

$$
\begin{aligned}
x_d &= x + x\,(k_1 r^2 + k_2 r^4) + 2 p_1 x y + p_2 (r^2 + 2 x^2), \\
y_d &= y + y\,(k_1 r^2 + k_2 r^4) + p_1 (r^2 + 2 y^2) + 2 p_2 x y.
\end{aligned}
$$

Five parameters $(k_1, k_2, p_1, p_2)$ plus image-centre offset. Weng's experiments compare the four-parameter and five-parameter variants against Tsai's one-parameter model and demonstrate measurable accuracy improvements on non-industrial lenses.

This is the model adopted by OpenCV, MATLAB Camera Calibration Toolbox (Bouguet), Kalibr, and most modern open-source calibration pipelines. When a paper says "Brown-Conrady distortion" or "OpenCV distortion model," they mean Weng 1992.

## Zhang 2000 — two-term radial, no tangential

[Zhang's planar calibration](/atlas/zhang-planar-calibration) adopts **two radial terms** $(k_1, k_2)$ and excludes tangential. The authoritative MSR-TR-98-71 paper does not cite Brown directly but matches the Brown radial form with a 2-coefficient truncation. The exclusion of tangential is consistent with most checkerboard-target use cases on standard machine-vision lenses; it is the default in MATLAB's `cameraCalibrator` "Standard" option (vs "Three Coefficients" which adds $k_3$).

## Kumar gRAC 2014 — radial generalised to non-frontal sensors

[Kumar-Ahuja's generalized RAC](/atlas/kumar-generalized-rac) extends Tsai's RAC to lenses that are not normal to the sensor (lens-sensor tilt up to $\sim 10°$). The distortion model is again one-term radial $\kappa_1$, but the radial axis is in the **lens** frame, not the sensor frame — the projection between them is governed by the tilt angles $(\rho, \sigma)$ which the calibration recovers as part of the linear stage. gRAC reduces to Tsai's RAC when $(\rho, \sigma) = 0$ and the model coincides with Tsai's one-term radial in that case.

## Inverse distortion (rectification)

Given the forward distortion $f: (x, y) \to (x_d, y_d)$, the inverse $f^{-1}: (x_d, y_d) \to (x, y)$ has no closed form for the polynomial models above. Practical implementations:

- **Iterative.** Newton's method on the residual $f(x, y) - (x_d, y_d)$, initialised at $(x_d, y_d)$ itself. Three to five iterations converge to sub-pixel residual on standard distortion magnitudes. This is what OpenCV's `cv::undistortPoints` does internally.
- **Lookup table.** Precompute the inverse on a dense pixel grid; bilinearly interpolate at query time. Used in real-time rectification pipelines (camera streamers, AR/VR engines).
- **Approximation polynomial.** Fit a separate polynomial $g(x_d, y_d) \approx (x, y)$ to the ground-truth inverse on training samples. Used when a forward-only model is needed at runtime (no Newton step) and a moderate accuracy floor is acceptable.

## Coefficient estimation in calibration

Distortion coefficients are estimated jointly with intrinsics and per-view extrinsics by Levenberg-Marquardt minimisation of the total reprojection error. Initial guesses depend on the calibration method:

- **Tsai 1987.** Stage 2 estimates $\kappa_1$ jointly with $f$ and $T_z$ from the linear approximation (Eq. 15 → Eq. 8b); the linear approximation seeds the LM step.
- **Zhang 2000.** $(k_1, k_2)$ are initialised to zero or by linear least squares on the homography residuals after the linear intrinsic recovery. The full LM step then jointly refines $(A, k_1, k_2, R_i, t_i)$ across all views.
- **Weng 1992.** All five $(k_1, k_2, p_1, p_2)$ initialised to zero; the full polynomial is refined by LM together with the intrinsic and extrinsic parameters.

# Numerical Concerns

**Truncation order.** Adding higher radial terms ($k_3, k_4, \dots$) does not always improve accuracy — the LM optimisation can over-fit to noise on the calibration target, and the recovered coefficients can have large magnitudes that destabilise rectification. Default: $(k_1, k_2, p_1, p_2)$ for general use; add $k_3$ for wide-angle (>90° FoV); use a fisheye-specific model (Kannala-Brandt) for fisheye lenses where the polynomial breaks down entirely.

**Distortion–intrinsic correlation.** Radial distortion coefficients are statistically correlated with the principal point $(c_x, c_y)$: a small shift of the centre can be compensated by a different $k_1$. Small calibration sets (few views, narrow viewing-angle distribution) yield principal-point estimates with high standard error. This is the rationale for "calibrating the principal point separately" in some pipelines (Lenz-Tsai 1987 is one).

**Numerical instability of higher-order terms.** Weng 1992 explicitly warns against adding $k_3, k_4$ on standard lenses because the higher terms are dominated by gradient noise on the calibration target — the LM Hessian has very small eigenvalues in the high-order directions, leading to coefficient estimates with large variance. This is the "numerical instability" Tsai warns about (§II-B).

**Inverse-distortion convergence.** The iterative Newton inverse converges fast on small distortion magnitudes ($|k_1| < 0.5$, normalised radius $< 1$) but can diverge near the corners of fisheye images where the forward map is no longer one-to-one in the corners. Production rectification code clamps the inverse iteration count (typically 5–10) and falls back to the forward warp at extreme radii.

**Rectification grid sampling.** When undistorting an entire image, the standard recipe is: for each output pixel $(x, y)$, compute $(x_d, y_d) = f(x, y)$, sample the input image at $(x_d, y_d)$. This avoids the inverse-distortion problem entirely (the forward map is closed-form) but costs one bilinear sample per output pixel. The lookup-table optimisation precomputes the $(x_d, y_d)$ map and reuses it across frames.

**Coordinate system conventions.** Distortion coefficients are defined on **normalised image coordinates** (after dividing by focal length, before adding principal point). Implementations that mix pixel-coordinate distortion with normalised-coordinate intrinsics are a perennial source of bugs. Always check whether $(x, y)$ in your distortion equations are pixels or normalised before using a published coefficient.

# Where it appears

- [Tsai's versatile calibration](/atlas/tsai-versatile-calibration) — uses one-term radial; the canonical historical baseline.
- [Zhang's planar calibration](/atlas/zhang-planar-calibration) — uses two-term radial; the most widely deployed model for chessboard-based calibration.
- [Kumar gRAC](/atlas/kumar-generalized-rac) — one-term radial in the lens frame; reduces to Tsai when sensor-lens tilt is zero.
- The Brown-Conrady model from Weng 1992 is not currently a standalone atlas page but is described here as the canonical full-polynomial reference. When a future page needs it (e.g., a fisheye or wide-angle calibration page), this concept is the citation target.

# References

1. R. Y. Tsai. *A versatile camera calibration technique for high-accuracy 3D machine vision metrology using off-the-shelf TV cameras and lenses.* IEEE Journal on Robotics and Automation 3(4):323–344, 1987.
2. J. Weng, P. Cohen, M. Herniou. *Camera calibration with distortion models and accuracy evaluation.* IEEE TPAMI 14(10):965–980, 1992. [pdf](https://www.cs.auckland.ac.nz/courses/compsci773s1c/lectures/camera%20distortion.pdf)
3. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000.
4. M. K. Kumar, N. Ahuja. *A Generalized Radial Alignment Constraint for Camera Calibration.* IEEE ICPR, 2014.
5. D. C. Brown. *Decentering distortion of lenses.* Photogrammetric Engineering 32(3):444–462, 1966. (Foundational; introduces both radial and decentering polynomial.)
6. J. Kannala, S. Brandt. *A Generic Camera Model and Calibration Method for Conventional, Wide-Angle, and Fish-Eye Lenses.* IEEE TPAMI 28(8):1335–1340, 2006. (Fisheye-appropriate alternative.)
