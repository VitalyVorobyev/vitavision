---
title: "Scaramuzza Omnidirectional Camera Calibration"
date: 2026-05-05
summary: "Calibrate any central catadioptric or fisheye camera from a few planar checkerboard views by fitting a radially-symmetric Taylor-polynomial imaging function with a linear estimate followed by maximum-likelihood refinement."
tags: ["camera-model"]
domain: calibration
tasks: [camera-calibration]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [pinhole-camera-model, camera-distortion-models, bundle-adjustment]
failureModes: []
sources:
  primary: scaramuzza2006-omni
  references:
    - zhang2000-flexible
    - rufli2008-blurred
  notes: |
    Page follows the IROS 2006 paper §III–V: §III defines the imaging
    function as the Taylor polynomial f(ρ) = a₀ + a₂ρ² + … + a_N ρ^N
    with the closure a₁ = 0; §IV factors the calibration into a linear
    least-squares stage that recovers per-view extrinsics together with
    the Taylor coefficients followed by Levenberg–Marquardt refinement
    of the maximum-likelihood reprojection cost; §V adds an iterative
    coarse-to-fine search for the image center O_c that minimises the
    sum of squared reprojection errors.
---

# Goal

Estimate the intrinsic and extrinsic parameters of any central omnidirectional camera — catadioptric systems (mirror plus conventional camera) and dioptric fisheye lenses — from a small set of images of a planar checkerboard pattern at unknown poses. The input is pixel coordinates of checkerboard corners across multiple views together with the known metric geometry of the calibration pattern. The output is a Taylor polynomial encoding the radially-symmetric imaging function, an affine pixel-to-sensor transform $(A, t_c)$, the image center $O_c$ in pixel coordinates, and per-view rotation and translation. The method requires no prior knowledge of the mirror or lens model and no 3-D calibration fixture; the central-projection constraint — all 3-D rays passing through a single effective viewpoint — is the only governing assumption.

# Algorithm

Let $u' = [u', v']^T$ denote pixel coordinates and $u'' = [u'', v'']^T$ denote sensor-plane coordinates, related by the affine map

$$
u'' = Au' + t_c
$$

where $A \in \mathbb{R}^{2 \times 2}$ is a stretch matrix and $t_c \in \mathbb{R}^{2}$ is the image-center translation. Let $\rho'' = \sqrt{u''^2 + v''^2}$ denote the radial distance on the sensor plane.

:::definition[Imaging function]
The sensor-plane point and its corresponding 3-D viewing ray are related by the rotationally-symmetric vector function

$$
g(u'', v'') = (u'',\; v'',\; f(\rho''))^T
$$

where $f$ is a polynomial in $\rho''$.
:::

:::definition[Taylor imaging polynomial]
For all standard mirror and fisheye models $df/d\rho|_{\rho=0} = 0$, forcing $a_1 = 0$. The simplified Taylor form is

$$
f(\rho'') = a_0 + a_2\rho''^2 + a_3\rho''^3 + \cdots + a_N\rho''^N
$$

with $N$ coefficients $a_0, a_2, \ldots, a_N$ to be estimated. Typical degree $N = 4$.
:::

Let $K$ denote the number of calibration views ($K \geq 3$) and $L$ the number of checkerboard corners per view. Let $[X_{ij}, Y_{ij}, 0]^T$ denote the 3-D coordinates of corner $j$ in the pattern frame ($Z_{ij} = 0$). Let $R_i = [r_1^i, r_2^i, r_3^i]$ and $t_i = [t_1^i, t_2^i, t_3^i]^T$ denote the per-view rotation and translation.

:::definition[Cross-product constraint]
For view $i$, corner $j$, the collinearity of the back-projected ray and the camera–point vector $[r_1^i\ r_2^i\ t_i] \cdot [X_{ij}, Y_{ij}, 1]^T$ produces three scalar equations. The third is linear in the six unknowns $H = [r_{11}, r_{12}, r_{21}, r_{22}, t_1, t_2]^T$; stacking $L$ corners gives

$$
M_i \cdot H = 0, \qquad M_i \in \mathbb{R}^{L \times 6}.
$$
:::

:::definition[Intrinsic linear system]
Substituting the recovered per-view extrinsics into the remaining two equations and stacking all $K$ views yields the overdetermined system

$$
\Phi \cdot \xi = 0, \qquad \xi = [a_0,\, a_2,\, \ldots,\, a_N,\, t_3^1,\, \ldots,\, t_3^K]^T,
$$

with $\Phi \in \mathbb{R}^{2KL \times (N + K)}$ — the $N$ Taylor coefficients plus one depth $t_3^i$ per view.
:::

:::definition[Maximum-likelihood reprojection functional]
$$
E = \sum_{i=1}^{K}\sum_{j=1}^{L}\bigl\|m_{ij} - \hat{m}(R_i, T_i, A, O_c, a_0, a_2, \ldots, a_N, M_j)\bigr\|^2,
$$

where $m_{ij}$ is the observed pixel coordinate and $\hat{m}$ is the reprojection predicted by the current parameter estimate.
:::

## Procedure

:::algorithm[Scaramuzza omnidirectional camera calibration]
::input[Images $\{I_i\}_{i=1}^{K}$ ($K \geq 3$) of a planar checkerboard; pixel coordinates of $L$ corners per view; pattern metric geometry.]
::output[Taylor coefficients $a_0, a_2, \ldots, a_N$; affine transform $(A, t_c)$; image center $O_c$; per-view extrinsics $\{(R_i, t_i)\}$.]

1. For each view $i$, stack the cross-product constraint into $M_i \in \mathbb{R}^{L \times 6}$ and solve $M_i H = 0$ by SVD with a unit-norm constraint to recover $H$. Apply orthonormality $\|r_1\| = \|r_2\|$ and $r_1^T r_2 = 0$ to fix the scale and recover $r_{31}, r_{32}$.
2. Substitute all recovered extrinsics into the global system $\Phi \xi = 0$ and solve by pseudoinverse to obtain $a_0, a_2, \ldots, a_N$ and per-view depths $t_3^i$. Select $N$ by incrementing from $N = 2$ until the mean reprojection error reaches a local minimum.
3. Run a two-pass linear refinement: re-estimate extrinsics with the updated intrinsics (Step 1), then re-estimate intrinsics with the updated extrinsics (Step 2).
4. Conduct a coarse-to-fine grid search over candidate image-center positions $O_c$. At each candidate evaluate the sum of squared reprojection errors. Halt when successive candidates differ by $\varepsilon < 0.5$ pixels.
5. Minimise $E$ by Levenberg–Marquardt, initialised from the linear result with $A = I$. Solve in two sequential sub-steps: extrinsics first, then intrinsics.
:::

```mermaid
flowchart LR
  A["Per-view linear extrinsics<br/>SVD on cross-product"] --> B["Global Taylor coefficients<br/>Pseudoinverse over views"]
  B --> C["Two-pass linear refinement<br/>extrinsics ↔ intrinsics"]
  C --> D["Image-center search<br/>iterative SSRE minimum"]
  D --> E["Levenberg–Marquardt MLE<br/>final refinement"]
```

# Implementation

The per-view linear stage in Rust:

```rust
use nalgebra::{DMatrix, DVector, SVD};

/// Solve M H = 0 for H = [r11, r12, r21, r22, t1, t2]^T from the
/// cross-product third-component constraint, given sensor-plane
/// corner coordinates and pattern-plane metric coordinates for one view.
fn solve_per_view_extrinsics(
    corners_sensor: &[(f64, f64)], // (u'', v'')
    pattern_xy: &[(f64, f64)],     // (X, Y), Z = 0
) -> DVector<f64> {
    let l = corners_sensor.len();
    let mut m = DMatrix::<f64>::zeros(l, 6);

    for (k, (&(u, v), &(x, y))) in corners_sensor
        .iter()
        .zip(pattern_xy.iter())
        .enumerate()
    {
        // Third row of the cross product (Eq. 10.3): linear in H.
        m[(k, 0)] =  v * x;   // r11
        m[(k, 1)] =  v * y;   // r12
        m[(k, 2)] = -u * x;   // r21
        m[(k, 3)] = -u * y;   // r22
        m[(k, 4)] =  v;       // t1
        m[(k, 5)] = -u;       // t2
    }

    // H is the right singular vector for the smallest singular value.
    let svd = SVD::new(m, true, true);
    let vt = svd.v_t.expect("SVD failed");
    vt.row(vt.nrows() - 1).transpose().into()
}
```

The intrinsic stage stacks $2KL$ rows from equations (10.1) and (10.2) into $\Phi$ and the $r_{31}, r_{32}, t_3$ recovery from orthonormality closes the per-view rotation; both follow the same SVD-and-substitute pattern as above and are omitted for brevity.

# Remarks

- The intrinsic step solves $2KL$ linear equations in $N + K$ unknowns ($N$ Taylor coefficients plus $K$ depths). Conditioning improves with more views and more corners per view; $K \geq 3$ is the minimum for rank-sufficiency.
- The polynomial degree $N$ controls model capacity. The increment-and-stop heuristic (start at $N = 2$, raise until mean reprojection error stops decreasing) provides modest protection against overfitting; $N = 4$ is typical for both catadioptric and fisheye sensors.
- The central-projection assumption ($a_1 = 0$, single effective viewpoint) is a hard constraint. Non-central catadioptric systems with significant misalignment between mirror focus and camera optical centre violate it and produce irreducible systematic residuals that the Levenberg–Marquardt stage cannot eliminate.
- Near-coplanar viewing geometries make $M_i$ ill-conditioned: the per-view SVD approaches rank deficiency when corner configurations across views span a low-dimensional subspace.
- The algorithm does not recover pixel skew or non-unit aspect ratio in the linear phase — $A$ is initialised to the identity and refined only by Levenberg–Marquardt. Sensors with strong axis misalignment or large aspect ratio degrade the linear initialisation.

# References

1. D. Scaramuzza, A. Martinelli, R. Siegwart. *A Toolbox for Easily Calibrating Omnidirectional Cameras.* IEEE/RSJ IROS, 2006. [PDF](https://rpg.ifi.uzh.ch/docs/IROS06_scaramuzza.pdf)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11), 2000.
3. M. Rufli, D. Scaramuzza, R. Siegwart. *Automatic Detection of Checkerboards on Blurred and Distorted Images.* IEEE/RSJ IROS, 2008.
