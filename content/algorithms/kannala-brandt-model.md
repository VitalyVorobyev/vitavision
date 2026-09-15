---
title: "Kannala–Brandt Generic Camera Model"
date: 2026-09-15
summary: "Single projection and planar-pattern calibration model spanning conventional, wide-angle, and fish-eye lenses, built on an odd-power polynomial in the incidence angle that stays finite as the field of view approaches and exceeds 180 degrees."
tags: ["camera-model"]
domain: calibration
tasks: [camera-calibration]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [pinhole-camera-model, camera-distortion-models, homography]
failureModes: []
relations:
  - type: compared_with
    target: scaramuzza-omni-calibration
    confidence: medium
    caution: "Same year, different fit: polynomial in incidence angle vs Taylor polynomial in image radius."
sources:
  primary: kannala2006-generic
  references:
    - zhang2000-flexible
    - scaramuzza2006-omni
  notes: |
    §II-A pinhole model $r=f\tan\theta$ (Eq. 1) diverges as $\theta\to\pi/2$;
    classical fish-eye projections stereographic $r=2f\tan(\theta/2)$
    (Eq. 2), equidistant $r=f\theta$ (Eq. 3), equisolid-angle
    $r=2f\sin(\theta/2)$ (Eq. 4), orthogonal $r=f\sin\theta$ (Eq. 5) are all
    generalised by the odd-power polynomial $r(\theta)=k_1\theta+k_2\theta^3
    +\dots+k_5\theta^9$ (Eq. 6), truncated to 5 terms. §II-B full model
    $P_c$ (Eq. 12): radially symmetric mapping $F$ (Eq. 7) plus asymmetric
    radial/tangential distortion $\Delta_r,\Delta_t$ (Eqs. 8-9, 7 free
    params each) plus affine pixel map $A$ (Eq. 11) — 23 parameters total
    ($p_{23}$); reduced variants $p_9$ (radial+affine, 9 params) and $p_6$
    (2-term radial+affine, 6 params). §II-C backward model $D^{-1}$ via
    first-order Taylor approximation (Eqs. 14-16). §IV-A 4-step Zhang-style
    calibration: (1) initialise $k_1,k_2$ and affine params; (2) per-view
    homography from sphere back-projection; (3) SVD-orthogonalised
    extrinsics; (4) Levenberg-Marquardt joint refinement (Eq. 18). §IV-B
    centroid-correction integral (Eq. 19) for circular control points.
    Table I: Mičušík $M1$/$M2$ two-parameter fish-eye models reach 69-90px
    and 9.7px approximation error vs 0.1px/0.0px for the 9-parameter
    polynomial. Table II/III RMS residuals across Cosmicar/Sony/Watec/
    ORIFL190-3 lenses for $p_6$/$p_9$/$p_{23}$ vs Heikkilä's $\delta_8$.
    §V-C centroid-correction bias 0.45px without correction; backward-model
    error $10^{-3}$-$10^{-5}$ px, several orders below the forward residual.
---

# Goal

Compute a single projection model and calibration procedure that spans conventional (narrow-angle), wide-angle, and fish-eye lenses — including fields of view at and beyond 180° — from views of a planar calibration pattern alone. Input: pixel coordinates of circular control points at known planar positions, observed in $N$ views. Output: a forward model $P_c$ mapping a 3-D ray direction to pixel coordinates, and a backward model $P_c^{-1}$ mapping pixel coordinates back to a ray direction. The defining property is an odd-power polynomial in the incidence angle $\theta$ (the angle between the principal axis and the incoming ray) that stays finite as $\theta \to \pi/2$, a regime where the pinhole model with additive distortion terms diverges outright.

# Algorithm

Let $\theta$ denote the incidence angle between the principal axis and an incoming ray, and $\phi$ the azimuth angle around the axis. Let $r$ denote the image-plane radius. Let $\Phi = (\theta, \phi)^T$ denote a ray direction. Let $(x, y)^T$ denote normalised image coordinates and $(u, v)^T$ pixel coordinates. Let $m_u, m_v$ denote focal-length-like pixel scale factors and $(u_0, v_0)$ the principal point.

The pinhole projection $r = f\tan\theta$ (Eq. 1) diverges as $\theta \to \pi/2$; classical fish-eye lenses instead approximately follow one of several closed-form alternatives — stereographic $r = 2f\tan(\theta/2)$, equidistant $r = f\theta$, equisolid-angle $r = 2f\sin(\theta/2)$, or orthogonal $r = f\sin\theta$. Rather than selecting one of these per lens type, all five (including the pinhole) are generalised by a single odd-power polynomial:

:::definition[Generic radial projection]
$$
r(\theta) = k_1\theta + k_2\theta^3 + k_3\theta^5 + k_4\theta^7 + k_5\theta^9,
$$

truncated to 5 terms, sufficient for sub-pixel approximation of all five reference projections. $r(\theta)$ is assumed monotonically increasing on $[0, \theta_\mathrm{max}]$, so recovering $\theta$ from a measured $r$ requires numerically rooting a 9th-order polynomial and selecting the real root in range.
:::

:::definition[Radially symmetric mapping]
$$
F(\Phi) = (x, y)^T = r(\theta)\,(\cos\phi, \sin\phi)^T.
$$
:::

Real lenses deviate from radial symmetry through decentering and tilted elements. Two additional terms, separable in $\theta$ and $\phi$, are added:

:::definition[Asymmetric distortion]
$$
\begin{aligned}
\Delta_r(\theta,\phi) &= (l_1\theta+l_2\theta^3+l_3\theta^5)(i_1\cos\phi+i_2\sin\phi+i_3\cos2\phi+i_4\sin2\phi), \\
\Delta_t(\theta,\phi) &= (m_1\theta+m_2\theta^3+m_3\theta^5)(j_1\cos\phi+j_2\sin\phi+j_3\cos2\phi+j_4\sin2\phi),
\end{aligned}
$$

each with 7 free parameters. The distorted normalised coordinates are $x_d = r(\theta)u_r(\phi) + \Delta_r u_r(\phi) + \Delta_t u_\phi(\phi)$, and pixel coordinates follow from the affine map $\begin{bmatrix}u\\v\end{bmatrix} = \begin{bmatrix}m_u&0\\0&m_v\end{bmatrix}x_d + \begin{bmatrix}u_0\\v_0\end{bmatrix}$.
:::

Combining the radial polynomial, the asymmetric terms, and the affine map gives the full forward model with **23 parameters** ($p_{23}$): 5 radial ($k_1,\dots,k_5$) plus 7+7 asymmetric plus 4 affine. Two reduced variants — $p_9$ (radial + affine only, 9 parameters, no asymmetric distortion) and $p_6$ (2-term radial + affine, 6 parameters) — trade capacity for robustness against overfitting when control points do not cover the full image. The backward model has no closed form for the asymmetric-distortion inverse and is approximated by a first-order Taylor expansion around the distorted point.

:::algorithm[Kannala–Brandt calibration]
::input[Images $\{I_i\}_{i=1}^N$ of a planar pattern with circular control points at known positions; nominal manufacturer projection (for initialisation); a chosen model variant ($p_6$, $p_9$, or $p_{23}$).]
::output[Radial coefficients $k_1,\dots,k_5$; optional asymmetric-distortion coefficients; affine parameters $m_u, m_v, u_0, v_0$; per-view rotations $R_j$ and translations $t_j$.]

1. Initialise $k_1, k_2$ by fitting $r = k_1\theta + k_2\theta^3$ to the nominal manufacturer projection; initialise $m_u, m_v, u_0, v_0$ from the observed circular image boundary or, for full-frame lenses, from the image center and pixel pitch.
2. Back-project each observed point onto the unit sphere by solving $\theta$ from $k_2\theta^3 + k_1\theta - r = 0$ per point, then compute a per-view homography $H_j$ between sphere points and the planar pattern by a linear algorithm with data normalisation, refined by minimising the angle between predicted and back-projected unit vectors.
3. Extract initial rotations $R_j$ and translations $t_j$ from $H_j$, orthogonalising $R_j$ by SVD.
4. Jointly refine all internal and external parameters (and asymmetric-distortion parameters, if used) by Levenberg-Marquardt minimisation of the total squared reprojection error $\sum_{j=1}^N\sum_{i=1}^M d(m_j^i, \hat m_j^i)^2$.
5. Apply the centroid-correction step: because circular control-point centroids are not the projections of the true circle centers under a nonlinear model, numerically integrate the modelled projection over the interior of each physical circle to compute the true expected centroid, rather than projecting the nominal circle center.
:::

# Implementation

Forward projection (Eq. 6-7) and the numerical inversion of $r(\theta)$ by Newton's method, in Rust:

```rust
/// Forward radial projection r(theta) = k1*theta + k2*theta^3 + ... + k5*theta^9.
fn r_of_theta(theta: f64, k: [f64; 5]) -> f64 {
    let t2 = theta * theta;
    let mut term = theta;
    let mut r = 0.0;
    for &ki in &k {
        r += ki * term;
        term *= t2; // advance theta -> theta^3 -> theta^5 -> ...
    }
    r
}

/// dr/dtheta, needed for the Newton inversion step.
fn dr_dtheta(theta: f64, k: [f64; 5]) -> f64 {
    let t2 = theta * theta;
    let mut term = 1.0;
    let mut deriv = 0.0;
    for (n, &ki) in k.iter().enumerate() {
        let power = 2 * n + 1;
        deriv += ki * power as f64 * term;
        term *= t2;
    }
    deriv
}

/// Invert r(theta) = r_target for theta via Newton's method (Eq. 6).
/// r(theta) is monotonic on [0, theta_max], so the root is unique there.
fn theta_from_r(r_target: f64, k: [f64; 5], theta0: f64, iters: usize) -> f64 {
    let mut theta = theta0;
    for _ in 0..iters {
        let residual = r_of_theta(theta, k) - r_target;
        let slope = dr_dtheta(theta, k).max(1e-12);
        theta -= residual / slope;
    }
    theta
}
```

# Remarks

- Real-camera RMS reprojection residuals (conventional/wide-angle lenses): Heikkilä's one-term-radial $\delta_8$ model reaches 0.061 px / 0.124 px; the 9-parameter $p_9$ variant reaches 0.055 px / 0.092 px despite lacking tangential terms; the full 23-parameter $p_{23}$ reaches 0.052 px / 0.057 px.
- Two-parameter fish-eye models (Mičušík's $M1$, $M2$) fit only their design lens family: $M1$'s approximation error reaches 69 px against the pinhole curve and 90 px against the stereographic curve, versus 0.1 px for the 9-parameter polynomial fit to the same curves.
- The centroid-correction step is not optional at high accuracy: skipping it introduces a simulated 0.45 px RMS bias, larger than the reported real-data RMS residuals (0.089–0.146 px).
- The backward-model first-order Taylor approximation is negligible in practice: maximum back-project-then-reproject displacement is on the order of $10^{-3}$ to $10^{-5}$ px, several orders of magnitude below the forward-model residual.
- Model-order selection ($p_6$ vs $p_9$ vs $p_{23}$) is a manual bias-variance trade-off: the full 23-parameter model can overfit systematic illumination-induced error when calibration images have poor corner coverage or non-uniform lighting.

## When to choose Kannala–Brandt over Scaramuzza

[Scaramuzza's omnidirectional calibration](/atlas/scaramuzza-omni-calibration) (IROS 2006) and Kannala–Brandt (TPAMI 2006) are same-year, independently developed generic lens models calibrated from planar-pattern views, with no paper-stated relation between them. Per the same-year tiebreaker, the broader-scope model hosts the comparison: Kannala–Brandt targets conventional, wide-angle, *and* fish-eye lenses under one parameterisation, while Scaramuzza's model is scoped to central omnidirectional cameras (catadioptric mirrors and fisheye lenses under a single-effective-viewpoint constraint).

| | Kannala–Brandt 2006 | Scaramuzza 2006 |
|---|---|---|
| Parameterisation | odd-power polynomial in incidence angle $\theta$ (Eq. 6) | Taylor polynomial in image radius $\rho''$: $f(\rho'')=a_0+a_2\rho''^2+\cdots$ |
| Lens scope | conventional, wide-angle, fish-eye up to and beyond 180° FOV | central catadioptric mirrors and fisheye lenses |
| Central-projection assumption | not required (pinhole is a degenerate case of the model) | hard requirement (single effective viewpoint, $a_1=0$ closure) |
| Asymmetric distortion | optional 14-parameter decentering/tilt model (Eqs. 8-9) | not modelled (only an affine sensor-plane transform) |
| Model variants | $p_6$ / $p_9$ / $p_{23}$ (parameter-count trade-off) | single Taylor degree $N$, chosen by increment-and-stop (typically $N=4$) |
| Calibration | homography-based initialisation with sphere back-projection, LM refinement, circular-marker centroid correction | linear extrinsic/intrinsic estimation, iterative image-center search, LM refinement |

Choose Kannala–Brandt when the sensor is a dioptric lens (no folding mirror) and asymmetric decentering distortion is expected to matter, or when circular calibration markers are used and centroid correction is needed to avoid the 0.45 px bias quantified above. Choose Scaramuzza when calibrating a catadioptric (mirror-based) omnidirectional camera, where the single-effective-viewpoint assumption applies directly and a minimal-parameter, fast-converging toolbox (roughly 3 seconds for the image-center search) is preferred over Kannala–Brandt's larger parameter set.

# References

1. J. Kannala, S. S. Brandt. *A Generic Camera Model and Calibration Method for Conventional, Wide-Angle, and Fish-Eye Lenses.* IEEE Transactions on Pattern Analysis and Machine Intelligence 28(8):1335–1340, 2006. [PDF](https://web.archive.org/web/2018id_/http://www.ee.oulu.fi/~jkannala/calibration/Kannala_Brandt_calibration.pdf)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000.
3. D. Scaramuzza, A. Martinelli, R. Siegwart. *A Toolbox for Easily Calibrating Omnidirectional Cameras.* IEEE/RSJ IROS, 2006. [PDF](https://rpg.ifi.uzh.ch/docs/IROS06_scaramuzza.pdf)
