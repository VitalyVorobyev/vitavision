---
title: "Yang Parametric-Model Sub-Pixel Corner Fit"
date: 2026-05-10
summary: "Refine pixel-level chessboard corner positions to sub-pixel accuracy by nonlinear least-squares fitting a seven-parameter ideal blurred-corner model directly to the raw image patch, then reject unreliable corners via a boxplot-based fit-quality self-check before passing to PnP."
tags: ["subpixel", "chessboard"]
domain: features
tasks: [corner-detection, chessboard-detection]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [image-gradient]
failureModes: []
relations:
  - type: compared_with
    target: rochade
    confidence: high
  - type: compared_with
    target: geiger-chessboard-detector
    confidence: high
  - type: compared_with
    target: pyramidal-blur-aware-xcorner
    confidence: medium
    caution: "Pyramidal builds on ROCHADE; yang2018 fits a parametric saddle model — different mechanism"
  - type: compared_with
    target: duda-radon-corners
    confidence: medium
sources:
  primary: yang2018-sub-pixel
  references: [zhang2000-flexible, lepetit2009-epnp, placht2014-rochade, harris1988-corner, chen2005-xcorner]
  notes: |
    Seven-parameter ideal continuous chessboard corner model
    C_s(u,v; μ, υ, α, β, λ, κ, σ) = λ·G_σ ⊛ [E(α)·E(β)] + κ
    fit by Gauss–Newton over a (2r+1)² ROI, r ≈ 14–15 px (§3.1–3.2,
    Eq. 3–7). Gaussian erf inside the convolution is replaced by
    tanh(ρx) with ρ ≈ 1.1 (§3.2, Fig. 3); residual Δ(u,v) from the
    integration-by-parts surrogate is compensated explicitly (Eq. 8–9).
    Sub-pixel output c_s = c_p − [μ, υ]ᵀ (Eq. 10). Self-check (§3.3,
    Eq. 11–12): per-corner RMSE Ẽ_{m,n} compared against the modified
    boxplot interval [2.5Q₁ − 1.5Q₃, 2.5Q₃ − 1.5Q₁]; failing corners
    receive PnP weight w_{m,n} = 0 (Eq. 15, Rodrigues recommended).
---

# Goal

Refine pixel-level chessboard corner positions to sub-pixel accuracy by fitting a seven-parameter continuous model of an ideal chessboard corner directly to a raw image patch, without prior filtering. Input: a grayscale image $I : \Omega \to [0, 255]$ and a set of pixel-level corner positions $c_p = [u_p, v_p]^T$ supplied by any coarse detector. Output: sub-pixel corner locations $c_s = c_p - d$ where $d = [\mu, \upsilon]^T$ is the displacement from the pixel-level estimate to the fitted corner centre, together with a per-corner fit-quality weight $w_{m,n} \in \{0, 1\}$ for use in downstream pose estimation. The model encodes Gaussian optical blur and a linear photometric transform, and the fit residual serves as a built-in quality metric for outlier rejection.

# Algorithm

Let $I : \Omega \to [0, 255]$ denote the grayscale image.
Let $(u, v)$ denote coordinates within the $(2r+1) \times (2r+1)$ ROI centred on $c_p$, with $r \approx 14$–$15$ px.
Let $\mu, \upsilon$ denote the sub-pixel offset of the true corner from the pixel-level estimate, along $u$ and $v$ respectively.
Let $\alpha$ denote the rotation angle of the first edge crossing the corner.
Let $\beta$ denote the rotation-plus-shear angle of the second edge.
Let $\lambda$ denote the intensity gain mapping the binary model to the observed grayscale range.
Let $\kappa$ denote the intensity offset.
Let $\sigma$ denote the width of the Gaussian blur PSF.
Let $G_\sigma$ denote a 2-D isotropic Gaussian kernel with standard deviation $\sigma$.
Let $\rho$ denote the approximation constant for the $\tanh$-based surrogate of the Gaussian error function; $\rho \approx 1.1$ for 8-bit images.

:::definition[Ideal corner model]
A sign function along edge angle $\phi$ through the shifted corner:

$$
E(\phi, u, v) = \operatorname{sgn}\bigl((u - \mu)\cos\phi + (v - \upsilon)\sin\phi\bigr).
$$

The ideal corner model is the product of two such sign functions along edges at angles $\alpha$ (rotation) and $\beta$ (rotation plus shear):

$$
C_i(u, v) = E(\alpha, u, v) \cdot E(\beta, u, v),
$$

which takes values $\pm 1$ in the four quadrants of the ROI defined by the two crossing edges.
:::

:::definition[Blurred and scaled model]
The blurred model is the convolution of the ideal model with the Gaussian PSF:

$$
C_f(u, v) = (G_\sigma \ast C_i)(u, v).
$$

The scaled model maps $C_f$ to the observed intensity range via gain $\lambda$ and offset $\kappa$:

$$
C_s(u, v) = \lambda \, C_f(u, v) + \kappa.
$$
:::

:::definition[Closed-form surrogate]
Introduce the composite angles

$$
\theta_1 = \frac{\beta - \alpha}{2}, \qquad \theta_2 = \frac{\beta + \alpha}{2}.
$$

The Gaussian convolution integral is separated by integration by parts; the cross-term remainder $\Delta(u, v)$ is estimated explicitly from $\theta_1, \theta_2$ and added back. The Gaussian error function appearing in the separated integrals is replaced by

$$
\operatorname{erf}(x) \approx \tanh(\rho\, x), \qquad \rho \approx 1.1,
$$

yielding a tractable closed-form expression for $C_f$.
:::

:::definition[Nonlinear least-squares objective]
Given observed intensity values $I_{i,j}$ at ROI pixels $(u_i, v_j)$, the residuals are

$$
\varepsilon_{i,j} = I_{i,j} - C_s(u_i, v_j;\; \mu, \upsilon, \alpha, \beta, \lambda, \kappa, \sigma).
$$

The objective is the sum of squared residuals over the seven parameters:

$$
\min_{\mu,\upsilon,\alpha,\beta,\lambda,\kappa,\sigma} \;\; \sum_{i,j} \varepsilon_{i,j}^2.
$$
:::

:::definition[Sub-pixel corner and self-check]
The refined corner position is

$$
c_s = c_p - d, \qquad d = [\mu,\; \upsilon]^T.
$$

Per-corner RMSE over the $(2r+1)^2$ residuals:

$$
\tilde{E}_{m,n} = \sqrt{\frac{1}{(2r+1)^2} \sum_{i,j} \varepsilon_{i,j}^2}.
$$

Across the full $M \times N$ board, compute quartiles $Q_1, Q_3$ of $\{\tilde{E}_{m,n}\}$ and assign the reliability weight

$$
w_{m,n} = \begin{cases} 1 & \tilde{E}_{m,n} \in \bigl[2.5Q_1 - 1.5Q_3,\; 2.5Q_3 - 1.5Q_1\bigr], \\ 0 & \text{otherwise.} \end{cases}
$$

The interval is the adjusted boxplot fence of Hubert and Vandervieren — wider than the standard $1.5 \cdot \mathrm{IQR}$ fence — to accommodate skewed residual distributions. The downstream PnP cost is weighted by $w_{m,n}$, so corners failing the self-check do not influence pose estimation.
:::

## Procedure

:::algorithm[Yang sub-pixel corner fit]
::input[Grayscale image $I$; pixel-level corner positions $\{c_p^{(m,n)}\}$ on an $M \times N$ board; ROI radius $r$; initial edge angles $\alpha_0, \beta_0$ from edge extraction.]
::output[Sub-pixel corner positions $\{c_s^{(m,n)}\}$; per-corner weights $\{w_{m,n}\}$.]

1. Extract the $(2r+1) \times (2r+1)$ ROI patch around each $c_p$.
2. Initialise parameters: $\mu = \upsilon = 0$, $\sigma = 1$; set $\alpha, \beta$ from the upstream edge-extraction result; set $\kappa$ and $\lambda$ from the mean gray levels of the local black and white patch regions.
3. Evaluate $C_s(u, v)$ using the closed-form $\tanh$-based surrogate for $C_f$, with remainder $\Delta(u, v)$ compensated via $\theta_1, \theta_2$.
4. Compute residuals $\varepsilon_{i,j} = I_{i,j} - C_s(u_i, v_j)$ over all ROI pixels.
5. Form the Gauss–Newton normal system on the seven parameters and apply the update; repeat until convergence.
6. Recover the refined corner: $c_s = c_p - [\mu, \upsilon]^T$.
7. Compute $\tilde{E}_{m,n}$ for every corner on the board.
8. Compute the adjusted boxplot interval from $Q_1, Q_3$ of the board-level RMSE distribution and assign $w_{m,n}$.
9. Pass $(c_s^{(m,n)}, w_{m,n})$ to the downstream PnP or planar-calibration solver as weighted correspondences.
:::

# Implementation

The closed-form surrogate model evaluator and per-pixel residual — the inner kernel called by every Gauss–Newton iteration — in Rust:

```rust
/// Evaluate the scaled blurred-corner model C_s(u,v) at one pixel.
/// Inputs: ROI-centred coordinates (u, v), seven model parameters.
/// Returns the predicted intensity, using tanh(ρ·) as the erf surrogate.
fn model_intensity(
    u: f32, v: f32,
    mu: f32, nu: f32,
    alpha: f32, beta: f32,
    lambda: f32, kappa: f32, sigma: f32,
) -> f32 {
    const RHO: f32 = 1.1;
    let theta1 = 0.5 * (beta - alpha);
    let theta2 = 0.5 * (beta + alpha);
    let s = sigma * core::f32::consts::SQRT_2;
    let x1 = ((u - mu) * theta1.cos() + (v - nu) * theta1.sin()) / s;
    let x2 = ((u - mu) * theta2.cos() + (v - nu) * theta2.sin()) / s;
    let cf = (RHO * x1).tanh() * (RHO * x2).tanh();
    lambda * cf + kappa
}

/// Sum of squared residuals over the (2r+1)^2 ROI patch — the LSQ cost
/// minimised over (μ, υ, α, β, λ, κ, σ).
fn sse(roi: &[f32], r: usize, p: &[f32; 7]) -> f32 {
    let side = 2 * r + 1;
    let mut acc = 0.0;
    for row in 0..side {
        for col in 0..side {
            let u = col as f32 - r as f32;
            let v = row as f32 - r as f32;
            let pred = model_intensity(u, v, p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
            let res = roi[row * side + col] - pred;
            acc += res * res;
        }
    }
    acc
}

/// Per-corner RMSE feeding the boxplot self-check (Eq. 11).
fn corner_rmse(roi: &[f32], r: usize, p: &[f32; 7]) -> f32 {
    let n = ((2 * r + 1) * (2 * r + 1)) as f32;
    (sse(roi, r, p) / n).sqrt()
}
```

A standard Gauss–Newton or Levenberg–Marquardt loop wraps these primitives, using either an analytic Jacobian derived from `model_intensity` or finite differences. The fit's only paper-specific element is the surrogate evaluator above; the rest of the pipeline reuses generic LSQ machinery. The board-level boxplot weight $w_{m,n}$ is computed once after all corners are fit by quantile estimation on $\{\tilde{E}_{m,n}\}$.

# Remarks

- Per-corner cost is $O((2r+1)^2 \cdot N_{\text{iter}})$ for a fixed seven-parameter system; each Gauss–Newton step solves a $7 \times 7$ normal system, independent of $r$. Total cost scales linearly with the number of detected corners on the board.
- ROI radius $r \approx 14$–$15$ px is the practical sweet spot: smaller radii reduce the available fitting support; larger radii capture lens-distortion curvature that violates the locally-straight-edge assumption built into the model.
- The $\tanh(\rho x)$ approximation introduces a closed-form error that is small for $\rho \approx 1.1$ on 8-bit images; the explicit remainder $\Delta(u, v)$ via $\theta_1, \theta_2$ tightens the surrogate further. The constant $\rho$ requires re-tuning for inputs with dynamic range other than 8 bits.
- The method operates on raw image patches without pre-filtering, eliminating the noise floor introduced by preprocessing steps such as cone or Gaussian filtering used by polynomial-saddle approaches.
- The boxplot self-check uses the Hubert–Vandervieren adjusted fence, which is wider than the standard $1.5 \cdot \mathrm{IQR}$ fence; this accommodates skewed residual distributions arising under non-uniform illumination without rejecting valid corners unnecessarily.
- The method is a refinement step, not a standalone detector: it requires pixel-level corner positions $c_p$ from an upstream coarse detector and produces no result when $c_p$ is missing or lies outside the ROI of the true corner.
- Convergence assumes the upstream initialisation of $\alpha, \beta$ from edge extraction is accurate enough that the seven-parameter Gauss–Newton system is in the basin of the true minimum; quality of the angle initialisation directly affects the final fit.

# References

1. T. Yang, Q. Zhao, X. Wang, Q. Zhou. *Sub-Pixel Chessboard Corner Localization for Camera Calibration and Pose Estimation.* Applied Sciences, 8(11):2118, 2018. DOI: [10.3390/app8112118](https://doi.org/10.3390/app8112118). [PDF](https://www.mdpi.com/2076-3417/8/11/2118/pdf)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 22(11):1330–1334, 2000. [PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr98-71.pdf)
3. V. Lepetit, F. Moreno-Noguer, P. Fua. *EPnP: An Accurate O(n) Solution to the PnP Problem.* International Journal of Computer Vision, 81(2):155–166, 2009. [PDF](http://hdl.handle.net/2117/10327)
4. S. Placht, P. Fürsattel, E. A. Mengue, H. Hofmann, C. Schaller, M. Balda, E. Angelopoulou. *ROCHADE: Robust Checkerboard Advanced Detection for Camera Calibration.* ECCV, 2014.
5. C. Harris, M. J. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. [PDF](https://bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf)
