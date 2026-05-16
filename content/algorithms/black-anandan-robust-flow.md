---
title: "Black-Anandan Robust Optical Flow"
date: 2026-05-13
summary: "Optical flow that replaces the quadratic data and smoothness penalties of variational flow with redescending M-estimators, solved by SOR within a graduated non-convexity continuation; recovers piecewise-smooth flow without explicit line processes and a robust affine variant for multiple parametric motions."
tags: ["optical-flow", "robust-estimation", "variational"]
domain: features
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [image-gradient, scale-space]
failureModes: []
sources:
  primary: black1996-robust
  references: [horn1981-horn-schunck, lucas1981-lucas-kanade]
  notes: |
    Robust data + regularization energy (§4, eq. 12–14):
    $E(u,v) = \sum_s \rho_D(I_x u_s + I_y v_s + I_t, \sigma_D)
            + \lambda \sum_{s,n \in N(s)} \rho_S(u_s - u_n, \sigma_S) + \rho_S(v_s - v_n, \sigma_S)$.
    Lorentzian: $\rho(x,\sigma) = \log(1 + \tfrac{1}{2}(x/\sigma)^2)$,
    $\psi(x,\sigma) = 2x/(2\sigma^2 + x^2)$ (Fig. 8).
    Geman-McClure: $\rho(x,\sigma) = x^2/(\sigma + x^2)$,
    $\psi(x,\sigma) = 2x\sigma/(\sigma+x^2)^2$.
    SOR update (§4.1.1, eq. 15-16): $u_s^{n+1} = u_s^n - (\omega/T(u_s)) \partial E/\partial u_s$
    with $\omega \in (0,2)$; convex initial scale $\sigma_{\text{init}} = r_{\max}/\sqrt{2}$
    for Lorentzian. Outlier threshold: $\tau = \sqrt{2}\,\sigma$ (Lorentzian),
    $\sigma/\sqrt{3}$ (Geman-McClure). Coarse-to-fine pyramid with backward-warp
    image warping (§4.2, Appendix B eq. 29-34) handles displacements > 1 px.
---

# Goal

Estimate a dense, piecewise-smooth optical flow field $(u(s), v(s))$ at every pixel site $s$, or recover one or more parametric (affine) motion models from a two-frame image sequence, in the presence of multiple competing motions. Input: two consecutive grayscale frames $I(\mathbf{x}, t)$ and $I(\mathbf{x}, t{+}1)$, where $\mathbf{x} = (x, y)$. Output: either (a) a dense flow field with flow in pixels per frame, or (b) a set of affine parameter vectors $\mathbf{a}$ together with a per-pixel outlier indicator. Both outputs are obtained by replacing the quadratic (L2) penalty in the data conservation and spatial smoothness terms with a redescending robust M-estimator, solved via Iteratively Reweighted Least Squares (IRLS) within a Graduated Non-Convexity (GNC) continuation schedule.

# Algorithm

Let $I_x$, $I_y$, $I_t$ denote the partial spatial and temporal image derivatives at site $s$. Let $u_s$, $v_s$ denote the horizontal and vertical flow at $s$. Let $N(s)$ denote the 4-connected spatial neighbourhood of $s$. Let $\lambda > 0$ weight the smoothness term relative to the data term. Let $\rho(\cdot, \sigma)$ denote a robust penalty function with scale parameter $\sigma$, and $\psi(x, \sigma) = \partial \rho / \partial x$ its influence function.

Two penalty functions are used throughout.

:::definition[Lorentzian M-estimator]

$$\rho_L(x, \sigma) = \log\!\left(1 + \tfrac{1}{2}\!\left(\frac{x}{\sigma}\right)^{\!2}\right), \qquad \psi_L(x, \sigma) = \frac{2x}{2\sigma^2 + x^2}.$$

The IRLS weight is $w_L(x, \sigma) = \psi_L(x, \sigma) / x = 2\sigma^2 / (2\sigma^2 + x^2)$. The influence function $\psi_L$ is redescending: it equals zero when $x = \pm\sqrt{2}\,\sigma$, defining the outlier threshold $\tau_L = \sqrt{2}\,\sigma$.

:::

:::definition[Geman-McClure M-estimator]

$$\rho_{GM}(x, \sigma) = \frac{\sigma\,x^2}{\sigma + x^2}, \qquad \psi_{GM}(x, \sigma) = \frac{2\sigma\,x}{(\sigma + x^2)^2}.$$

The IRLS weight is $w_{GM}(x, \sigma) = 2\sigma / (\sigma + x^2)^2$. The outlier threshold is $\tau_{GM} = \sigma / \sqrt{3}$.

:::

## Piecewise-smooth (dense) variant

The robust data energy penalises violation of the brightness-constancy constraint at each pixel.

:::definition[Robust data energy $E_D$]

$$E_D(u, v) = \sum_s \rho_D\!\left(I_x u_s + I_y v_s + I_t,\; \sigma_D\right),$$

where $\rho_D$ is the chosen M-estimator applied to the first-order brightness-constancy residual.

:::

The robust smoothness energy penalises large flow differences between neighbouring sites.

:::definition[Robust smoothness energy $E_S$]

$$E_S(u, v) = \sum_s \sum_{n \in N(s)} \!\left[\rho_S\!\left(u_s - u_n,\; \sigma_S\right) + \rho_S\!\left(v_s - v_n,\; \sigma_S\right)\right],$$

where $\rho_S$ is the chosen M-estimator for the inter-pixel flow difference.

:::

:::definition[Total robust energy $E$]

$$E(u, v) = E_D(u, v) + \lambda\, E_S(u, v).$$

:::

Minimisation proceeds by SOR within a GNC continuation schedule. The SOR update for $u_s$ at iteration $n$ is

$$u_s^{n+1} = u_s^n - \frac{\omega}{T(u_s)} \cdot \frac{\partial E}{\partial u_s},$$

where $\omega \in (0, 2)$ is the overrelaxation parameter and $T(u_s)$ is an upper bound on $\partial^2 E / \partial u_s^2$. The partial derivative expands as

$$\frac{\partial E}{\partial u_s} = I_x\,\psi_D(I_x u_s + I_y v_s + I_t,\; \sigma_D) + \lambda \sum_{n \in N(s)} \psi_S(u_s - u_n,\; \sigma_S).$$

The optimal overrelaxation parameter for an $n \times n$ image is

$$\beta_{\max} = \cos\!\left(\frac{\pi}{n+1}\right), \qquad \omega_{\mathrm{opt}} = \frac{2}{1 + \sqrt{1 - \beta_{\max}^2}}.$$

To avoid local minima from the non-convex $\rho$, the scale $\sigma$ is initialised large enough that the objective is convex. For the Lorentzian, convexity holds when $\rho_L'' > 0$ for all $x$, which requires $\sigma_{\mathrm{init}} \geq r_{\max} / \sqrt{2}$, where $r_{\max}$ is the maximum expected residual magnitude. $\sigma$ is then reduced linearly toward the target scale over 6 continuation stages. A 3-level Gaussian image pyramid is used; at each level, 20 SOR iterations are performed per continuation stage and the flow estimate is upsampled as initialisation for the finer level. Reference parameter ranges from §6: $\sigma_D$ from $18/\sqrt{2}$ to $5/\sqrt{2}$; $\sigma_S$ from $3/\sqrt{2}$ to $0.03/\sqrt{2}$; $\lambda_D = 5$, $\lambda_S = 1$.

:::algorithm[Dense piecewise-smooth flow]

::input[Two grayscale frames $I_t$, $I_{t+1}$; scale parameters $\sigma_D$, $\sigma_S$; smoothness weight $\lambda$; GNC stages $K$; pyramid levels $L$; SOR iterations $M$ per stage.]

::output[Dense flow field $(u_s, v_s)$ for all sites $s$; per-pixel outlier indicator $o_s = \mathbf{1}[|r_s| \geq \tau]$.]

1. Build an $L$-level Gaussian image pyramid for each frame.
2. Initialise $(u, v) = (0, 0)$ at the coarsest level.
3. For each pyramid level from coarsest to finest: warp $I_{t+1}$ toward $I_t$ using the current flow (backward warp); recompute $I_x$, $I_y$, $I_t$ from the warped frame pair; set $\sigma \leftarrow \sigma_{\mathrm{init}}$; for each of $K$ GNC stages run $M$ SOR iterations updating $u_s$ and $v_s$ at every site, then reduce $\sigma$ linearly toward the target; upsample $(u, v)$ to the next finer level.
4. Classify site $s$ as outlier if $|I_x u_s + I_y v_s + I_t| \geq \tau$.

:::

## Parametric (affine) variant

The 6-parameter affine flow model at pixel $\mathbf{x} = (x, y)$ is

$$\mathbf{u}(\mathbf{x}; \mathbf{a}) = \begin{pmatrix} a_0 + a_1 x + a_2 y \\ a_3 + a_4 x + a_5 y \end{pmatrix}.$$

The robust parametric energy over a region $R$ is

$$E_p(\mathbf{a}) = \sum_{\mathbf{x} \in R} \rho\!\left((\nabla I)^T \mathbf{u}(\mathbf{x}; \mathbf{a}) + I_t,\; \sigma\right).$$

Minimisation proceeds by SOR over the six parameters $a_0, \ldots, a_5$ with the GNC $\sigma$-schedule. The SOR update for each $a_i$ is

$$a_i^{n+1} = a_i^n - \frac{\omega}{T_{a_i}} \cdot \frac{\partial E_p}{\partial a_i},$$

where $T_{a_i} = \sum_{\mathbf{x}} \{x^2, y^2, 1, \ldots\} \cdot \max_x \rho''(x, \sigma)$ bounds the second derivative. The overrelaxation parameter is fixed at $\omega = 1.995$ and the GNC schedule reduces $\sigma$ geometrically: $\sigma_{i+1} = 0.95\,\sigma_i$.

After recovering the dominant motion parameters $\mathbf{a}^*$, pixels where $|r_\mathbf{x}| = |(\nabla I)^T \mathbf{u}(\mathbf{x}; \mathbf{a}^*) + I_t| \geq \tau$ are collected as outliers. The residual set is re-submitted to the same robust regression to recover a second motion; the process repeats until no consistent motion remains in the residuals.

:::algorithm[Parametric (affine) motion estimation]

::input[Two grayscale frames $I_t$, $I_{t+1}$; region $R$; initial $\sigma_{\mathrm{init}}$; $\omega = 1.995$; convergence threshold $\epsilon = 10^{-5}$; pyramid levels $L = 4$; SOR iterations $M = 30$ per level.]

::output[One or more affine parameter vectors $\mathbf{a}^{(1)}, \mathbf{a}^{(2)}, \ldots$; per-pixel outlier map.]

1. Build a 4-level Gaussian image pyramid for each frame.
2. Initialise $\mathbf{a} = \mathbf{0}$ at the coarsest level.
3. For each pyramid level from coarsest to finest: set $\sigma \leftarrow \sigma_{\mathrm{init}}$; repeat until $\|\Delta \mathbf{a}\|_\infty < \epsilon$ or $M$ iterations elapsed — for each $a_i$ compute $\partial E_p / \partial a_i$ and apply the SOR update, then reduce $\sigma$ by $\sigma \leftarrow 0.95\,\sigma$; upsample $\mathbf{a}$ to the next finer level.
4. Collect outlier pixels where $|r_\mathbf{x}| \geq \tau$.
5. If the outlier set is large enough, submit it to step 2 to recover $\mathbf{a}^{(2)}$.
6. Repeat step 5 until no consistent motion remains.

:::

# Implementation

The per-pixel IRLS update for the dense variant in Rust, implementing the data-plus-smoothness gradient $\partial E / \partial u_s$ and the SOR step. The snippet covers one horizontal-component update; the vertical component $v_s$ follows the same pattern with $I_y$ in place of $I_x$.

```rust
/// Lorentzian IRLS weight: w(x, σ) = 2σ² / (2σ² + x²).
#[inline]
fn w_lorentzian(x: f32, sigma: f32) -> f32 {
    let s2 = 2.0 * sigma * sigma;
    s2 / (s2 + x * x)
}

/// One SOR update for u_s (horizontal flow at site s).
fn sor_update_u(
    r: f32,            // brightness-constancy residual I_x·u_s + I_y·v_s + I_t
    ix: f32,           // spatial gradient I_x at s
    neighbours: &[f32],// (u_n) for n ∈ N(s); length 4 on a 4-connected grid
    u_s: f32,
    sigma_d: f32,
    sigma_s: f32,
    lambda: f32,
    omega: f32,
    t_upper: f32,      // upper bound on ∂²E/∂u_s²
) -> f32 {
    // ψ_D(r, σ_D) · I_x, with ψ = w · x.
    let grad_data = ix * (w_lorentzian(r, sigma_d) * r);
    // λ · Σ_{n∈N(s)} ψ_S(u_s − u_n, σ_S).
    let grad_smooth: f32 = lambda * neighbours.iter().map(|&u_n| {
        let diff = u_s - u_n;
        w_lorentzian(diff, sigma_s) * diff
    }).sum::<f32>();
    u_s - (omega / t_upper) * (grad_data + grad_smooth)
}
```

The vectorised inner loop in Python:

```python
import numpy as np

def w_lorentzian(x, sigma):
    s2 = 2.0 * sigma ** 2
    return s2 / (s2 + x ** 2)

def sor_update_u(r, ix, u, u_nbrs, sigma_d, sigma_s, lam, omega, t_upper):
    grad_data = ix * (w_lorentzian(r, sigma_d) * r)
    diffs = u[None] - u_nbrs                              # (4, H, W)
    grad_smooth = lam * (w_lorentzian(diffs, sigma_s) * diffs).sum(axis=0)
    return u - (omega / t_upper) * (grad_data + grad_smooth)
```

# Remarks

- $O(K \cdot M \cdot N)$ work per pyramid level for the dense variant, where $K$ is the number of GNC continuation stages, $M$ is the SOR iteration count per stage, and $N$ is the number of pixels. Reference values are $K = 6$, $M = 20$ for the dense variant, and $M = 30$ per pyramid level for the parametric variant.
- Both the data term and the smoothness term must use robust penalties. Robustifying the smoothness term alone — the approach taken by classical line-process methods — leaves the data term quadratic and can increase flow error relative to the fully-quadratic baseline.
- The Lorentzian outlier threshold is $\tau_L = \sqrt{2}\,\sigma$, derived from where $\rho_L'' = 0$. The Geman-McClure threshold is $\tau_{GM} = \sigma / \sqrt{3}$. Sites where the final residual magnitude exceeds $\tau$ are classified as motion outliers; this yields an explicit outlier map as a by-product of estimation.
- Local minima in the non-convex energy are avoided via the GNC $\sigma$-schedule: $\sigma$ is initialised at $\sigma_{\mathrm{init}} \geq r_{\max} / \sqrt{2}$ (Lorentzian) or $\sigma_{\mathrm{init}} \geq r_{\max} \cdot \sqrt{3}$ (Geman-McClure) so the objective is globally convex, then lowered until the true non-convex penalty is recovered. A geometric schedule $\sigma_{i+1} = 0.95\,\sigma_i$ is used for the parametric variant; a linear ramp is preferred for the dense variant.
- The Gaussian pyramid handles displacements larger than one pixel per frame. Motions exceeding the coarse-level resolution cause hard failure; transparency that does not yield a dominant motion in a local region and global illumination changes are not handled by the brightness-constancy data term.
- The redescending M-estimator is equivalent to an analog (continuous-valued) outlier process: an explicit line-process layer on the flow field is therefore unnecessary when a redescending $\rho$ is used.

# References

1. M. J. Black and P. Anandan. *The Robust Estimation of Multiple Motions: Parametric and Piecewise-Smooth Flow Fields.* Computer Vision and Image Understanding, 63(1):75–104, 1996. [doi:10.1006/cviu.1996.0006](https://doi.org/10.1006/cviu.1996.0006)
2. B. K. P. Horn and B. G. Schunck. *Determining Optical Flow.* Artificial Intelligence, 17:185–203, 1981. [hdl:1721.1/6337](http://hdl.handle.net/1721.1/6337)
3. B. D. Lucas and T. Kanade. *An Iterative Image Registration Technique with an Application to Stereo Vision.* Proc. IJCAI, 1981. [pdf](https://www.ri.cmu.edu/pub_files/pub3/lucas_bruce_d_1981_2/lucas_bruce_d_1981_2.pdf)
