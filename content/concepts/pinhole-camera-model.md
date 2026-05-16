---
title: "Pinhole Camera Model"
date: 2026-05-16
summary: "The projective map from 3-D scene points to 2-D image pixels through a single centre of projection, parameterised by an intrinsic matrix and an extrinsic pose."
tags: ["camera-model"]
author: "Vitaly Vorobyev"
domain: image-formation
difficulty: intermediate
prerequisites: []
sources:
  primary: zhang2000-flexible
  references:
    - tsai1987-versatile
    - sturm2003-plane-based
    - weng1992-camera
---

# Definition

The pinhole camera model is the projective map from a 3-D scene point to a 2-D image pixel through a single centre of projection — the optical centre — in which every ray from the scene passes through that centre and strikes the image plane at a unique location. No lens optics, aperture, or depth-of-field effects are modelled: the camera is an ideal perspective projector.

:::definition[Central projection equation]
Given a scene point $\tilde{M} = [X, Y, Z, 1]^T$ in homogeneous world coordinates, its image in homogeneous pixel coordinates $\tilde{m} = [u, v, 1]^T$ satisfies

$$\tilde{m} \sim K\,[R \mid t]\,\tilde{M},$$

where $K$ is the $3 \times 3$ intrinsic matrix, $[R \mid t]$ is the $3 \times 4$ extrinsic matrix encoding the rigid transformation from world to camera frame, and $\sim$ denotes equality up to a nonzero scale factor. Input: a 3-D point in world coordinates. Output: a 2-D point in pixel coordinates.
:::

The up-to-scale relation reflects the homogeneous-coordinate ambiguity: multiplying $\tilde{m}$ by any nonzero scalar gives the same pixel. Recovering the absolute depth $Z$ from $\tilde{m}$ alone is impossible; depth is the information irreversibly discarded by the projection.

# Mathematical Description

## Intrinsic matrix

The intrinsic matrix encodes how the 3-D optical geometry maps to the sensor's discrete pixel grid:

$$K = \begin{bmatrix} f_x & \gamma & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix}.$$

- $f_x = f / d_x$ and $f_y = f / d_y$ are the focal lengths in pixels — the physical focal length $f$ divided by the pixel pitches $d_x$, $d_y$. Zhang writes these $(\alpha, \beta)$, Weng et al. $(f_u, f_v)$.
- $(c_x, c_y)$ is the principal point — the pixel coordinates where the optical axis meets the image plane. Tsai fixes it at the image centre and instead calibrates a scale factor $s_x$ to absorb CCD scanning uncertainty.
- $\gamma$ is the skew, non-zero only when the pixel axes are not perpendicular. Modern digital sensors have $\gamma \approx 0$; the parameter is retained for generality.

$K$ has five degrees of freedom in general, four when zero skew is enforced.

## Extrinsic transform

The extrinsic matrix $[R \mid t]$ concatenates a rotation $R \in SO(3)$ and translation $t \in \mathbb{R}^3$, mapping a world point $M$ to camera coordinates $M_c = RM + t$. Tsai parameterises the rotation by yaw, pitch, and roll; Zhang uses the Rodrigues 3-vector to keep the Jacobian unconstrained during Levenberg-Marquardt refinement. The extrinsic parameters are per-view: each image of a calibration target yields its own $(R_i, t_i)$.

## Projection matrix and normalised coordinates

The $3 \times 4$ projection matrix combines intrinsics and extrinsics, $P = K\,[R \mid t]$, giving the expanded pixel projection

$$u = f_x \frac{r_1^T M + t_x}{r_3^T M + t_z} + c_x, \qquad v = f_y \frac{r_2^T M + t_y}{r_3^T M + t_z} + c_y,$$

with $r_i^T$ the $i$-th row of $R$. The normalised image coordinates are the camera-frame coordinates before intrinsic scaling,

$$x_n = X_c / Z_c, \qquad y_n = Y_c / Z_c,$$

so that $u = f_x x_n + c_x$ and $v = f_y y_n + c_y$. These normalised coordinates are the input to the distortion model.

## Calibration homography and planar targets

When the calibration target is planar — placed at $Z = 0$ — the third column of $R$ drops out and the $3 \times 4$ projection reduces to a $3 \times 3$ plane-to-image homography,

$$s\,\tilde{m} = H\,\tilde{M}_{2D}, \qquad H = K\,[r_1 \;\; r_2 \;\; t],$$

with $r_1, r_2$ the first two columns of $R$. Because $r_1$ and $r_2$ are orthonormal, the product $B = K^{-T}K^{-1}$ — the image of the absolute conic — satisfies two linear constraints per homography, $h_1^T B h_2 = 0$ and $h_1^T B h_1 - h_2^T B h_2 = 0$. Stacking two rows per view across $n \geq 3$ views yields a homogeneous system whose null vector encodes the five intrinsic parameters. Sturm and Maybank derive the same constraints independently in the form $h_1^T \omega h_1 - h_2^T \omega h_2 = 0$, $h_1^T \omega h_2 = 0$ with $\omega = K^{-T}K^{-1}$.

## Departure from the ideal model

Real lenses displace the normalised coordinates $(x_n, y_n)$ from their ideal positions by radial, tangential, and thin-prism components. The pinhole model describes the undistorted ideal case; the additive correction is treated separately in [camera-distortion-models](/atlas/camera-distortion-models).

# Numerical Concerns

**Homogeneous-coordinate scale ambiguity.** The third component of $P\tilde{M}$ is the scene depth $Z_c$, the divisor that recovers pixel coordinates. A near-zero $Z_c$ — a point at or behind the camera — makes the projection ill-defined and must be guarded in any implementation.

**Principal-point and focal-length correlation.** The principal point is statistically correlated with the radial distortion coefficients and, to a lesser degree, the focal length. Calibration sets with narrow angular diversity — all views near fronto-parallel — yield a poorly conditioned constraint system; inter-view rotations near $45°$ from the image plane give the best conditioning.

**Pixel vs metric units.** Focal lengths in pixels are dimensionless ratios, whereas the physical focal length and pixel pitches carry units. Mixing the two conventions in a single Jacobian is a common error source.

**Skew near zero.** For virtually all digital sensors $\gamma \approx 0$, which drives the IAC entry $B_{12} \approx 0$ and makes the extraction of $K$ from $B$ numerically stable. Cameras with genuine skew face a less stable extraction.

**Planar degeneracy and minimum views.** A single view of a planar target gives only 2 independent constraints on the 5-DOF intrinsic matrix; at least 3 views at non-parallel orientations are required for a fully determined system, or 2 with the zero-skew prior. Parallel planes contribute linearly dependent rows regardless of view count — a provable rank deficiency, not a conditioning issue.

**Normalisation for the linear estimate.** The DLT system for the calibration homography is poorly conditioned when raw pixel and world coordinates are mixed; isotropic normalisation of both point sets is required before assembly and inverted afterwards.

# Where it appears

The pinhole camera model is the shared projection foundation of every calibration and pose-estimation algorithm in the atlas.

- [zhang-planar-calibration](/atlas/zhang-planar-calibration) — recovers $K$ and per-view $(R_i, t_i)$ from multiple planar views via the IAC linear system derived from the $H = K[r_1\;r_2\;t]$ factorisation.
- [tsai-versatile-calibration](/atlas/tsai-versatile-calibration) — recovers $K$ and $(R, t)$ from a 3-D rig via the radial alignment constraint, parameterising $K$ by effective focal length and scale factor $s_x$.
- [sturm-plane-based-calibration](/atlas/sturm-plane-based-calibration) — derives the same two IAC constraints per homography independently, with an exhaustive singularity catalogue for degenerate plane configurations.
- [scaramuzza-omni-calibration](/atlas/scaramuzza-omni-calibration) — replaces the perspective projection with a polynomial omnidirectional model; the standard pinhole projection is its small-field-of-view limit.
- [epnp](/atlas/epnp) — solves for the extrinsic pose $[R \mid t]$ given a calibrated camera and $n$ 2D-3D correspondences, assuming the pinhole projection.
- [camera-distortion-models](/atlas/camera-distortion-models) — the additive correction to the normalised image coordinates that accounts for real-lens departure from the ideal map.

# References

1. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 22(11):1330–1334, 2000.
2. R. Y. Tsai. *A Versatile Camera Calibration Technique for High-Accuracy 3D Machine Vision Metrology Using Off-the-Shelf TV Cameras and Lenses.* IEEE Journal on Robotics and Automation, 3(4):323–344, 1987.
3. P. F. Sturm, S. J. Maybank. *On Plane-Based Camera Calibration: A General Algorithm, Singularities, Applications.* IEEE CVPR, 1999.
4. J. Weng, P. Cohen, M. Herniou. *Camera Calibration with Distortion Models and Accuracy Evaluation.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 14(10):965–980, 1992.
5. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision*, 2nd ed. Cambridge University Press, 2004.
