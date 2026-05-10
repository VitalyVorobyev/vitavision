---
paper_id: yang2018-sub-pixel
title: "Sub-Pixel Chessboard Corner Localization for Camera Calibration and Pose Estimation"
authors: ["T. Yang", "Q. Zhao", "X. Wang", "Q. Zhou"]
year: 2018
url: https://www.mdpi.com/2076-3417/8/11/2118/pdf
created: 2026-05-10
relevant_atlas_pages: [chess-corners, chessboard-x-corner-detection, rochade, geiger-chessboard-detector, pyramidal-blur-aware-xcorner, duda-radon-corners, puzzleboard, ocpad, gp-checkerboard-enhancement, laureano-topological-chessboard, hessian-saddle-response, zhang-planar-calibration, epnp]
---

# Setting

**Problem class:** Sub-pixel refinement of chessboard X-corner locations for Zhang-style planar camera calibration and perspective-n-point (PnP) pose estimation.

**Inputs:** A grayscale image containing a chessboard pattern; pixel-level corner positions $c_p = [u_p, v_p]$ pre-computed by any coarse detector (Harris, KLT, or similar). A square ROI of $(2r+1)^2$ pixels is extracted around each candidate corner. (§3, §4: experiments use $r = 15$, ROI 31×31.)

**Output:** Sub-pixel corner locations $c_s = c_p - d$ (Eq. 10), where $d = [\mu, \upsilon]^T$ is the displacement from the pixel-level estimate to the fitted ideal corner centre. Optionally, a per-corner reliability weight $w_{m,n} \in \{0, 1\}$ for downstream PnP filtering (Eq. 12).

**Key downstream consumers:** Zhang planar calibration (intrinsic estimation from bundle adjustment) and EPnP pose estimation; both are explicitly named as motivating use cases (§1, §3.3).

# Core idea

The paper constructs an **ideal continuous chessboard corner model** $C_i(u,v)$ as the product of two Heaviside-like edges defined by angles $\alpha$ and $\beta$ (rotation and shear angles of the two crossing edges) (Eq. 3). Gaussian blur is applied analytically by convolving $C_i$ with a 2-D Gaussian of width $\sigma$ (Eq. 4), giving a blurred model $C_f(u,v)$. A linear intensity transform maps to the observed grayscale range via gain $\lambda$ and offset $\kappa$ (Eq. 5), yielding the full parametric model $C_s(u,v; \mu, \upsilon, \alpha, \beta, \lambda, \kappa, \sigma)$.

The closed form of $C_f$ requires evaluating a Gaussian error function inside a 2-D convolution integral. The paper derives a tractable **surrogate** by separating the Gaussian kernel and applying integration by parts (Eq. 8), with an explicit remainder term $\Delta(u,v)$ (Eq. 9) estimated from the shear and rotation angles $\theta_1 = (\beta-\alpha)/2$, $\theta_2 = (\beta+\alpha)/2$. The Gaussian error function itself is further approximated by $\tanh(\rho x)$ with empirically chosen $\rho$ (Fig. 3; values $\rho \in \{1.0, 1.1, 1.2\}$ are shown; $\rho = 1.1$ is implicit as the best trade-off).

The seven free parameters $(\mu, \upsilon, \alpha, \beta, \lambda, \kappa, \sigma)$ are found by minimizing the sum of squared residuals between the model and the observed ROI patch — a **nonlinear LSQ fit** solved by Gauss–Newton iteration (Eq. 7). Initialization: $\mu = \upsilon = 0$; $\sigma = 1$; $\alpha, \beta$ from an edge extraction step (ref. [28]); $\kappa, \lambda$ from mean gray levels in the black and white areas near $c_p$ (§3.2).

A **self-check** (§3.3) uses the RMSE of fit residuals $\tilde{E}_{m,n}$ (Eq. 11) as a per-corner quality metric. Corners are accepted ($w_{m,n}=1$) only when their $\tilde{E}_{m,n}$ falls inside the modified boxplot interval $[2.5Q_1 - 1.5Q_3,\ 2.5Q_3 - 1.5Q_1]$ computed across all detected corners in the board (Eq. 12). Outlier corners (e.g. from light pollution) are down-weighted to zero in the subsequent PnP estimator (Eq. 15, Rodrigues parameterisation recommended).

# Assumptions

1. **Linear photometric response.** The vision system responds linearly to light intensity within the operating range; $\kappa$ and $\lambda$ are sufficient to account for brightness variation (§3.1, Eq. 5). Hard failure when the sensor is strongly nonlinear.
2. **Locally straight edges.** Edge lines $E_1$ and $E_2$ are approximately straight within the ROI; the model degrades for very large ROI radii where lens distortion curves the edges noticeably (§3.1, note after Eq. 3). The authors state $r \approx 14\text{–}15$ pixels is a practical sweet spot (§3.2).
3. **Gaussian blur PSF.** The optics blur is modelled as a 2-D isotropic Gaussian (Eq. 4, citing [26]). A strongly anisotropic PSF (e.g. motion blur, astigmatism) would violate this assumption.
4. **Pixel-level initialisation provided.** The method is a refinement step; it requires a reasonably accurate $c_p$ (within the ROI) from an upstream detector. No built-in coarse detection.
5. **Adequate contrast.** Gain $\lambda > 0$; completely overexposed or underexposed corners cannot be refined reliably (mentioned implicitly by robustness experiments in §4.2 and Fig. 15).
6. **Sufficient iterations.** Gauss–Newton convergence is assumed; no global convergence guarantee is stated. The number of iterations is not fixed — the paper says "after sufficient iterations for the system convergence" (§3.2).

# Failure regime

- **Light pollution / imbalanced illumination:** $\tilde{E}_{m,n}$ rises markedly; these corners are flagged by the boxplot self-check. The practical on-site test (§4.3) shows infrared-pollution-induced failures are caught effectively — the built-in algorithm's IQR was several times larger in the interfered period.
- **Large radial distortion:** For $|k_1| > 5$, edges are no longer locally straight; the polynomial approximation (§3.2) becomes inaccurate. The authors note that cameras with $k_1 > 5$ are rarely used in photogrammetry, so this is an edge case in practice (§4.1 distortion experiment, Fig. 9). At $|k_1| = 5$ the method's RMSE is still only 0.037 px vs 0.089/0.046/0.123 px for competitors (Fig. 9).
- **Heavy Gaussian blur ($\sigma_f \to 3$) combined with noise ($\sigma_n = 0.2$):** Worst-case error of 0.024 px for the proposed method vs 0.154/0.041/0.077 px for refs [16,20,24] respectively (§4.1, Fig. 6). Performance degrades but remains best-in-class.
- **Filtering preprocessing:** Methods that require a pre-filtered image (e.g. ROCHADE's cone-filter pretreatment [24]) add extra uncertainty on top of detector noise; Yang et al. operate directly on the raw image, avoiding this second noise source (§2.3, §4.1).
- **Computational cost vs. cornerSubPix:** The method is ~2.3× slower than OpenCV `cornerSubPix` (3051 ms vs 1296 ms per 100 images) but orders of magnitude faster than `findChessboardcorners` pixel detection (41,715 ms). The bottleneck is coarse detection, not sub-pixel refinement (§4.4, Table 4).

# Numerical sensitivity

- **ROI size $r$:** The authors recommend $r \approx 14\text{–}15$ (§3.2). Larger $r$ increases sensitivity to lens distortion; smaller $r$ reduces the usable information. No sensitivity curve is published.
- **$\tanh(\rho x)$ approximation of erf:** The paper shows the approximation error (Fig. 3b) is $<0.10$ in absolute terms for $\rho = 1.1$; the residual $\Delta(u,v)$ is also explicitly estimated and compensated (Eq. 9), making the surrogate tighter than prior polynomial-based approaches.
- **Boxplot self-check threshold:** The interval $[2.5Q_1 - 1.5Q_3,\ 2.5Q_3 - 1.5Q_1]$ in Eq. 12 is wider than the standard $[Q_1 - 1.5\cdot\text{IQR},\ Q_3 + 1.5\cdot\text{IQR}]$ boxplot fence; this asymmetric-distribution-adjusted form (citing Hubert & Vandervieren 2008 [29]) is intentional for skewed noise distributions arising in on-site conditions.
- **Initialization of $\alpha, \beta$:** Taken from edge extraction (citing Wang & Wu 2007 [28]); convergence quality depends on the quality of this initial angle estimate. No sensitivity analysis is provided.
- **Precision:** All experiments are on 8-bit images; the authors explicitly note that the $\tanh$ approximation is designed for the 256-level dynamic range (§3.2). 16-bit inputs would require $\rho$ re-tuning.

# Applicability

- **Use when:** Sub-pixel accuracy is essential for camera calibration or pose estimation; image conditions are variable (varying illumination, on-site noise); no preprocessing budget is available; corners are detected using any upstream coarse detector.
- **Don't use when:** The ROI around corners is so large that lens distortion materially curves the edges ($k_1 \gg 3$); when the upstream detector fails entirely (no coarse corners to refine); when computational latency dominates and gradient-based `cornerSubPix` is accurate enough.
- **Compared against:** Bok et al. 2016 [16] (gradient-based, Harris-style structure tensor patch refinement), Zhao et al. 2014 [20] (grayscale symmetry factor centroid), Placht et al. 2014 [24] (ROCHADE — cone-filtered quadratic saddle fit). The proposed method outperforms all three on synthetic and real datasets under varying blur, noise, and distortion.

# Connections

- **Builds on:** Zhang 2000 [2] (planar calibration downstream); Lucchese 2002 [21] (saddle-point polynomial fitting concept), Chen & Zhang 2005 [22] (Harris-like saddle model prior work), Mallon & Whelan 2007 [23] (edge-based nonlinear corner localizer), Placht et al. 2014 [24] (ROCHADE quadratic fit), Wang & Wu 2007 [28] (edge-extraction initialisation for $\alpha, \beta$).
- **Enables:** Zhang planar calibration bundle adjustment [2]; EPnP pose estimation [5]; visual measurement systems including wheel aligners (§4.3).
- **Refutes / supersedes:** Does not formally supersede any method but empirically outperforms [16,20,24] on both synthetic and real metrics, suggesting replacement in accuracy-critical scenarios.

# Atlas update plan

## NEW: yang-sub-pixel-corner-fit

```
Type: algorithm
Category: subpixel-refinement
Primary source: yang2018-sub-pixel
Relations:
  { type: compared_with, target: rochade, confidence: high }
  { type: compared_with, target: geiger-chessboard-detector, confidence: high }
  { type: compared_with, target: pyramidal-blur-aware-xcorner, confidence: medium, caution: "Pyramidal builds on ROCHADE; yang2018 fits a parametric saddle model — different mechanism" }
  { type: compared_with, target: duda-radon-corners, confidence: medium }
  { type: feeds_into, target: zhang-planar-calibration, confidence: medium, caution: "Yang2018 explicitly targets Zhang-style planar calibration as the downstream consumer" }
  { type: feeds_into, target: epnp, confidence: medium, caution: "Self-check is motivated by EPnP downstream use" }

Goal:
  - Refine pixel-level chessboard corner locations to sub-pixel accuracy by fitting a parametric
    continuous chessboard corner model directly to the raw image patch, without prior filtering.
  - Produce a fit-quality metric per corner enabling reliable outlier rejection for downstream PnP
    pose estimation under variable illumination conditions (on-site use case).
  - The downstream consumers are Zhang planar calibration and EPnP; reprojection error and
    CMM-verified displacement/attitude accuracy are the evaluation metrics.

Algorithm:
  - **Ideal model** $C_i(u,v) = E(\alpha,u,v)\cdot E(\beta,u,v)$ (Eq. 3): product of two Heaviside
    sign-functions along line angles $\alpha$ (rotation) and $\beta$ (shear + rotation), giving
    $\pm 1$ grayscale in four quadrants of the ROI centered at the corner.
  - **Blurred model** $C_f = G_\sigma \ast C_i$ (Eq. 4): Gaussian PSF with width $\sigma$; cannot
    be evaluated in closed form for the product of two edge functions.
  - **Closed-form surrogate** (Eq. 8–9): separating the Gaussian, applying integration by parts,
    and estimating the remainder $\Delta(u,v)$ via shear/rotation angles $\theta_1 = (\beta-\alpha)/2$,
    $\theta_2 = (\beta+\alpha)/2$. The Gaussian error function erf is further replaced by
    $\tanh(\rho x)$ with $\rho \approx 1.1$ for 8-bit images (Fig. 3).
  - **Scaled model** $C_s = \lambda C_f + \kappa$ (Eq. 5–6): gain $\lambda$ and offset $\kappa$
    map to the image's $[g_{\min}, g_{\max}]$ range.
  - **Nonlinear LSQ fit** (Eq. 7): minimise $\sum_{i,j} \varepsilon_{i,j}^2$ over
    $(\mu, \upsilon, \alpha, \beta, \lambda, \kappa, \sigma)$ by Gauss–Newton iterations.
    Initialisation: $\mu=\upsilon=0$, $\sigma=1$, $\alpha/\beta$ from edge extraction,
    $\kappa/\lambda$ from local black/white patch means. ROI radius $r \approx 14\text{–}15$ px.
  - **Sub-pixel output** $c_s = c_p - d$ where $d = [\mu, \upsilon]^T$ (Eq. 10).
  - **Self-check** (Eq. 11–12): per-corner RMSE $\tilde{E}_{m,n}$; boxplot analysis over the full
    board's $M \times N$ metrics assigns $w_{m,n} \in \{0,1\}$; outliers (light pollution, occlusion)
    receive weight 0 before PnP optimisation (Eq. 15, Rodrigues parameterisation).

Implementation:
  - Requires an upstream coarse detector providing $c_p$ to pixel accuracy; not a standalone detector.
  - Sub-pixel corners must be lens-distortion corrected before use in calibration/PnP (§3.3 note).
  - Reference C++ implementation provided by authors (Baidu Pan link in §4.4; availability may vary).
  - Competing reference: OpenCV `cornerSubPix` (gradient-based, ~2.3× faster but lower accuracy);
    processing times: 3051 ms vs 1296 ms vs 41,715 ms (`findChessboardcorners`) per 100 images
    on Intel Core i7-6700 (Table 4).

Remarks:
  - Outperforms Bok [16], Zhao [20], and ROCHADE/Placht [24] on synthetic (RMSE vs $\sigma_f$, $\sigma_n$,
    $k_1$) and real datasets (reprojection error, CMM-verified displacement/attitude RMS). At worst
    case ($\sigma_f=3, \sigma_n=0.2$): 0.024 px vs 0.154/0.041/0.077 px (Fig. 6, §4.1).
  - Key claimed advantage over polynomial-fitting predecessors: no pre-filtering required; filtering
    adds its own noise floor (the ROCHADE cone-filter is singled out as introducing extra uncertainty).
  - Self-check (boxplot outlier rejection) adds robustness beyond pure localization accuracy —
    particularly valuable in on-site visual measurement (wheel alignment demo, §4.3).
  - Limitation: computational cost ~2.3× `cornerSubPix`; authors note the bottleneck is pixel-level
    detection, not sub-pixel refinement (§4.4).
  - Not tested on non-planar targets, circular dots, or targets other than standard chessboards.

References:
  - yang2018-sub-pixel (primary)
  - zhang-planar-calibration page (Zhang 2000, [2] in paper)
  - epnp page (Lepetit et al. 2009, [5] in paper — EPnP)
  - rochade page (Placht et al. 2014, [24] in paper)
  - harris-corner-detector (Harris & Stephens 1988, [7] in paper)
  - Lucchese & Mitra 2002 [21] — saddle point polynomial fitting precursor (no atlas page yet)
  - Mallon & Whelan 2007 [23] — edge-based nonlinear localizer (no atlas page yet)
```

## UPDATE: chess-corners

Section: Remarks (sub-pixel refinement discussion, or end of Remarks if no dedicated sub-pixel section exists).

- Yang et al. 2018 (`yang2018-sub-pixel`) propose a peer sub-pixel refinement method for chessboard corners using a parametric saddle/corner model fitted directly to raw image patches; it outperforms ROCHADE's cone-filter-based polynomial saddle fit on synthetic and real data.
- Unlike gradient-based (`cornerSubPix`) or cone-filtered polynomial (ROCHADE) approaches, the parametric model includes an explicit blur parameter $\sigma$ and a boxplot-based outlier self-check for PnP robustness; see the `yang-sub-pixel-corner-fit` page for details.

## UPDATE: chessboard-x-corner-detection

Section: Method table or "surveyed methods" list (wherever individual sub-pixel refinement methods are enumerated).

- Add `yang2018-sub-pixel` as one entry: **Yang et al. 2018** — ideal continuous corner model + cheap erf→tanh surrogate + nonlinear Gauss–Newton fit + fit-quality boxplot self-check; no preprocessing required; targets Zhang calibration and EPnP downstream.

# Provenance

All claims are sourced from the paper (DOI 10.3390/app8112118, Applied Sciences 2018, 8, 2118).

| Citation | Content |
|---|---|
| §1, Abstract | Motivation: camera calibration + PnP pose estimation; chessboard advantages over circular dot targets |
| §2.1 | Gradient-based sub-pixel methods: Sroba [15], Bok [16] (structure tensor patch, Harris-based) |
| §2.2 | Grayscale symmetry methods: Chu [19], Zhao [20] (symmetric centroid) |
| §2.3 | Polynomial fitting methods: Lucchese [21], Chen [22], Mallon [23], Placht/ROCHADE [24] |
| §3.1, Eq. 1–3 | Ideal corner model $C_i$: edge lines $L$, sign function $E$, product model. Angles $\alpha, \beta$. |
| §3.1, Eq. 4 | Gaussian blur model $C_f = G_\sigma \ast C_i$; isotropic Gaussian PSF with $\sigma$ |
| §3.1, Eq. 5–6 | Linear intensity transform: $C_s = \lambda C_f + \kappa$; gain/offset from $g_{\max}, g_{\min}$ |
| §3.2, Eq. 7 | Nonlinear LSQ objective over $(\mu, \upsilon, \alpha, \beta, \lambda, \kappa, \sigma)$; residual $\varepsilon_{i,j}$ |
| §3.2, Eq. 8–9 | Closed-form surrogate via erf separation; remainder $\Delta(u,v)$; angles $\theta_1, \theta_2$; $\delta_1\delta_2$ cases |
| §3.2, Fig. 3 | $\tanh(\rho x)$ approximation of erf; $\rho \in \{1.0, 1.1, 1.2\}$ shown |
| §3.2 (text) | Initialisation: $\mu=\upsilon=0$, $\sigma=1$; $\alpha,\beta$ from edge extraction [28]; $r \approx 14$ px |
| §3.2, Eq. 10 | Sub-pixel corner output: $c_s = c_p - d$ |
| §3.3, Eq. 11 | RMSE metric $\tilde{E}_{m,n}$ (called $\overline{E}$ in paper, RMSE over ROI) |
| §3.3, Eq. 12 | Boxplot reliability weight: $w_{m,n} = 1$ iff $\tilde{E}_{m,n} \in [2.5Q_1 - 1.5Q_3,\ 2.5Q_3 - 1.5Q_1]$ |
| §3.3, Eq. 13–15 | PnP pin-hole model; optimal $s_{m,n}$; weighted PnP cost with $w_{m,n}$; Rodrigues recommendation |
| §4.1, Table 1 | Simulation parameter ranges: $g_{\max} \in [191,255]$, $g_{\min} \in [0,63]$, Euler yaw/pitch/roll $\in [-\pi/4,\pi/4]$, $t_z \in [950,1050]$ mm |
| §4.1, Fig. 6 | Worst-case RMSE at $\sigma_f=3, \sigma_n=0.2$: 0.154/0.041/0.077/0.024 px for [16,20,24]/proposed |
| §4.1, Fig. 7 | IQR (40,000 trials): ~0.18/0.13/0.32/0.04 px for [16,20,24]/proposed |
| §4.1, Fig. 9 | Radial distortion $k_1 \in [-5,5]$: max RMSE 0.089/0.046/0.123/0.037 px for [16,20,24]/proposed |
| §4.2, Table 2 | Calibration intrinsics from real CMM experiment: $[f_x,f_y]$, $[u_0,v_0]$, $[k_1,k_2]$ for all four methods |
| §4.2, Fig. 11 | Reprojection errors: proposed 0.22 px max / 0.11 px mean vs 0.32/0.15, 0.29/0.15, 0.39/0.18 px |
| §4.2, Table 3 | Ambient light robustness: RMSD 0.419/0.287/0.396/0.241 px for [16,20,24]/proposed |
| §4.2, Fig. 14 | CMM pose accuracy: proposed RMS $d = 0.014$ mm, $\theta = 0.006°$ (best of four) |
| §4.3 | On-site wheel aligner (3Excel T50): camera setup, synchronous capture, self-check vs light pollution |
| §4.3, Fig. 18 | Toe-in/toe-out IQR; median deviation proposed: 0.003°/0.002° vs built-in 0.009°/0.003° |
| §4.4, Table 4 | Processing time (100 images, Intel Core i7-6700): `findChessboardcorners` 41,715 ms; `cornerSubPix` 1296 ms; proposed 3051 ms |
| Ref [2] | Zhang Z. 2000 — flexible planar calibration |
| Ref [5] | Lepetit, Moreno-Noguer, Fua 2009 — EPnP |
| Ref [24] | Placht et al. 2014 — ROCHADE |
| Ref [29] | Hubert & Vandervieren 2008 — adjusted boxplot for skewed distributions |
| Ref [28] | Wang & Wu 2007 — edge extraction for $\alpha, \beta$ initialisation |
