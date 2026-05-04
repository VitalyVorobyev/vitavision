---
title: "CCS"
date: 2026-05-03
summary: "Three-stage learning-based camera calibration pipeline: a CNN regresses radial-distortion-correction parameters, a UNet predicts per-corner Gaussian heatmaps refined by surface-fit subpixel localisation, and an image-level RANSAC accepts inlier views before Zhang-style intrinsic estimation."
tags: ["calibration", "corner-detection", "distortion-correction", "cnn"]
domain: calibration
tasks: [camera-calibration, chessboard-detection]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
prerequisites: [chessboard-x-corner-detection, camera-distortion-models, ransac]
failureModes: []
relations:
  - type: compared_with
    target: ccdn-checkerboard-detector
    confidence: high
    caution: "Peer at the corner-detection level only; CCS adds distortion correction and RANSAC parameter estimation on top."
  - type: learned_alternative_of
    target: chess-corners
    confidence: high
  - type: feeds_into
    target: zhang-planar-calibration
    confidence: high
sources:
  primary: zhang2022-learning-based
  references:
    - zhang2000-flexible
    - donne2016-mate
    - chen2023-ccdn
    - geiger2012-automatic
    - tsai1987-versatile
  notes: |
    Three-stage pipeline (paper Fig. 1). Stage 1 — CNN distortion correction:
    8-layer encoder + 3 regression layers; correction model
    $r_c = r_d(k_0' + k_1' r_d + k_2' r_d^2 + \ldots)$, 5 output parameters
    (§III-A); grid-sampling L1 loss Eq. 1. Stage 2 — UNet heatmap detection
    [ref 30]: per-corner ground-truth = 2D Gaussian; MSE training loss Eq. 2;
    Gaussian surface fit Eq. 3 reduced to a linear system Eq. 5 solved by SVD
    (§III-B); distribution-aware outlier rejection by σ; collineation
    line-fit + intersect post-processing. Stage 3 — image-level RANSAC over
    Zhang's planar method (§III-C). Training intrinsics 100 ≤ fx, fy ≤ 300 px;
    120 ≤ px, py ≤ 360 px; 1 ≤ s ≤ 5 (§IV-A); image size 480 × 480; noise
    σ=1.5 with 3×3 kernel (§IV-B); distortion level 1: k₀=1,
    −0.2 ≤ k₁ ≤ −0.35; distortion level 2: 0.8 ≤ k₀ ≤ 1.2,
    −0.35 ≤ k₁ ≤ −0.5 (§IV-B). Real-data camera HIKROBOT MV-CA016-10GM
    1440×1080, 12×8 chessboard. Headline numbers: corner detection L2
    error 0.78 / 0.51 / 0.71 px under noise / bad lighting / distortion
    (Table III) vs Chen et al. 0.93 / 1.21 / 0.94 px; real-data RPE 0.37 px
    (STD 0.02) vs Matlab 0.45 px (STD 0.10) and Chen et al. 0.47 px
    (STD 0.24) (Table II); E_IP rises from 0.60 px at distortion level 1
    to 1.12 px at distortion level 2 (Table I). Acknowledged limitation:
    distortion correction introduces image-interpolation noise (§IV-D
    quote, Table IV).
implementations:
  - role: official
    repo: https://github.com/Easonyesheng/CCS
    commit: c3e7abf62281906c295ad1dff0de9f5d6d2c2350
    framework: pytorch
    license: MIT
---
# Motivation

A chessboard image captured under radial lens distortion, environmental noise, or uneven illumination presents two compounding problems for planar camera calibration: the checkerboard's corner detector assumes a locally undistorted image, and simultaneous nonlinear optimisation of distortion and intrinsic parameters is numerically unstable under strong distortion. CCS addresses both by staging the problem — a CNN encoder first regresses a radial correction model and warps the image to remove distortion, a UNet then detects inner corners as 2D Gaussian heatmaps and fits sub-pixel coordinates via a linear SVD system, and image-level RANSAC over Zhang's planar calibration discards outlier views before parameter estimation. The result is per-corner sub-pixel coordinates accompanied by a Gaussian confidence variance, and the intrinsic parameters of the camera (focal length, principal point, skew) with reported real-data reprojection error of 0.37 px (STD 0.02) [Table II].

# Architecture

**Family & shape.** Hybrid: a CNN encoder with 3 regression layers handles distortion, a UNet handles corner detection, and a classical RANSAC loop feeds Zhang's planar calibration for parameter estimation (§III-A–C). Training resolution is 480×480; the inference pipeline accepts arbitrary resolution. The distortion stage outputs 5 corrected-model parameters; the detection stage outputs a per-pixel 2D heatmap; the calibration stage outputs intrinsic parameters and per-corner sub-pixel coordinates with Gaussian confidence.

**Blocks.**

*Distortion CNN (§III-A).* An 8-layer encoder followed by 3 regression layers regresses the parameters of a radial correction model. The forward distortion model (image → distorted) is:

$$
r_d = r_c(k_0 + k_1 r_c^2 + \cdots)
$$

The correction model (distorted image → corrected), which the CNN regresses, is:

$$
\begin{aligned}
r_c = r_d(k_0' + k_1' r_d + k_2' r_d^2 + \cdots)
\end{aligned}
$$

with 5 output parameters in practice (§III-A). Once the parameters are regressed, a sampling grid warps the input image before corner detection. The distortion stage must precede corner detection because the collineation post-processing in Stage 2 requires undistorted straight-line features (§III-B, last paragraph).

:::definition[Sampling-grid L1 loss]
L1 distance between each pixel's destination under the estimated correction grid and its destination under the ground-truth correction grid, summed over $N$ pixels.

$$
L_\text{grid} = \frac{1}{N}\sum_{i=1}^{N} \bigl\| p^i_\text{dst} - p^i_\text{cor} \bigr\|_1
$$
:::

*UNet heatmap corner detection + sub-pixel refinement (§III-B).* A UNet [ref 30] is trained to output a per-pixel 2D heatmap whose ground-truth target is a 2D Gaussian distribution $G$ centred at each labeled sub-pixel corner coordinate.

:::definition[Heatmap MSE loss]
Mean-squared error between the predicted heatmap $\hat{Y}$ and the 2D Gaussian ground-truth map $Y$ over all pixel locations.

$$
L_\text{detect} = \iint \bigl\| \hat{Y}(x, y) - Y(x, y) \bigr\|^2 \, dx \, dy
$$
:::

Sub-pixel refinement extracts the mean $\mu = (\mu_x, \mu_y)$ and variance $\sigma$ from each predicted Gaussian distribution by solving the constrained least-squares problem:

$$
\arg\min_{\mu,\sigma} \bigl\| G(\mu,\sigma) - \hat{G} \bigr\|_2^2
$$

which reduces to a linear system (Eq. 3):

$$
a_i = b_i \cdot c_i^T
$$

solved via the SVD decomposition $A = BC^T$ (Eq. 5–6), where $C^T$ encodes $\mu$ and $\sigma$. Corners whose recovered $\sigma$ deviates from the training-data distribution are rejected as lost or fake corners (§III-B, Fig. 2). The collineation post-processing then fits lines through sorted inlier corners, intersects them to recover any lost corners, and refines final sub-pixel coordinates (§III-B, steps 1–3).

*Parameter estimation (§III-C).* Image-level RANSAC: randomly select a subset of views, estimate intrinsics via [Zhang's planar calibration](/atlas/zhang-planar-calibration), compute reprojection error on all views, retain views below the inlier threshold, repeat until inlier count is sufficient. Operating at the image level is possible because corner-level outliers are already removed by the $\sigma$ threshold upstream.

**Training.** Synthetic chessboard images generated at 480×480 pixels (§IV-A). Training intrinsic ranges: $100 \leq f_x, f_y \leq 300$ px, $120 \leq p_x, p_y \leq 360$ px, $1 \leq s \leq 5$ (§IV-A). Augmentation includes 3×3 Gaussian blur ($\sigma = 1.5$), a specular bad-lighting model, two distortion levels, and fake backgrounds from the TUM dataset (§IV-B). Distortion level 1: $k_0 = 1$, $-0.35 \leq k_1 \leq -0.2$, $-0.1 \leq k_3 \leq 0$; distortion level 2: $0.8 \leq k_0 \leq 1.2$, $-0.5 \leq k_1 \leq -0.35$, $-0.3 \leq k_3 \leq -0.1$ (§IV-B). Headline benchmarks: on synthetic data, mean corner-detection error (Table III) is 0.78 / 0.51 / 0.71 px under noise / bad lighting / distortion, versus 0.93 / 1.21 / 0.94 for the CCDN-era baseline. Intrinsic parameter error $E_{IP}$ (Table I) is 0.60 px at distortion level 1 and 1.12 px at distortion level 2. On real camera data (Table II), mean reprojection error is 0.37 px (STD 0.02) versus MATLAB's 0.45 px (STD 0.10) and the CCDN-era baseline's 0.47 px (STD 0.24); the STD is five times smaller than MATLAB's, attributed to image-level RANSAC.

**Complexity.** Parameter count and FLOPs not reported by the paper.

# Implementations

Official PyTorch release accompanying the paper, MIT-licensed; detection weights are distributed in-tree trained on the basic dataset without distortion or bad-lighting augmentation per the repo README.

# Assessment

**Novelty.**

- Decouples distortion correction from intrinsic estimation by inserting a CNN correction stage as an explicit preprocessing step, in contrast to the simultaneous nonlinear optimisation of distortion and intrinsics in [Zhang's planar calibration](/atlas/zhang-planar-calibration) which is numerically unstable under strong distortion (§I; Table I).
- Replaces pixel-level CNN regression heads used by MATE and CCDN-era detectors with a UNet 2D-Gaussian heatmap formulation fitted by SVD-based Gaussian surface fitting for sub-pixel corner localisation, recovering $\mu$ and $\sigma$ per corner from the predicted distribution (§III-B).
- Adds image-level RANSAC over candidate views before parameter estimation, made possible by $\sigma$-based distribution-aware corner outlier rejection upstream, enabling view selection without corner-level RANSAC (§III-C).

**Strengths.**

- Table III: corner-detection mean L2 errors under three synthetic perturbations are 0.78 / 0.51 / 0.71 px (noise / bad lighting / distortion), beating the CCDN-era baseline at 0.93 / 1.21 / 0.94 px across all three conditions.
- Table II: real-data reprojection error (0.37 px mean, 0.02 STD) shows both lower mean error than MATLAB (0.45 px, STD 0.10) and a five-fold reduction in run-to-run standard deviation, indicating the RANSAC image selection substantially improves calibration stability.
- Distribution-aware outlier rejection on the heatmap $\sigma$ catches lost and fake corners before they enter the Zhang fit: corners with abnormal variance distributions are flagged as outliers without a secondary corner-level verification pass (§III-B, Fig. 2).

**Limitations.**

- CNN distortion correction introduces image-interpolation noise as a side effect of the sampling-grid warp; combining MATLAB corner detection with the proposed distortion correction shows limited improvement because "the distortion correction brings into noise caused by image interpolation" (§IV-D, Table IV).
- Severe distortion beyond the training range degrades the CNN correction stage: $E_{IP}$ rises from 0.60 px at distortion level 1 to 1.12 px at level 2 (Table I), and performance outside the training distribution is uncharacterised.
- Restricted to planar chessboard targets; the UNet is trained exclusively on chessboard patterns and the collineation post-processing assumes colinear corners arranged in a regular grid (§Assumptions 1–2).
- Real-data deployment requires synthetic training data that covers the camera's actual distortion and intrinsic parameter ranges; the training ranges ($f_x, f_y \in [100, 300]$ px, $p_x, p_y \in [120, 360]$ px) were validated on one HIKROBOT sensor at 1440×1080 and generalisation to cameras with significantly different intrinsics is uncharacterised (§IV-A).

## When to choose CCS over CCDN

CCS and CCDN address related but distinct problems. CCDN is a standalone per-pixel corner detector: it takes a grayscale image and produces a corner response map, post-processed with adaptive thresholding + NMS + k-means++ to yield a sparse corner set. CCS is a complete calibration pipeline: it takes a chessboard image, applies CNN distortion correction, runs a UNet heatmap detector with SVD-based Gaussian surface fitting for sub-pixel refinement, and feeds the result directly into a RANSAC-stabilised Zhang calibration. The comparison is relevant when choosing a foundation for a new calibration system rather than a drop-in detector.

| Axis | CCS | CCDN |
|---|---|---|
| Scope | Full calibration pipeline (detection + correction + estimation) | Standalone corner detector only |
| Detection output | Sub-pixel $(x, y)$ coordinates + confidence variance $\sigma$ | Per-pixel response map; integer-grid accuracy without external refinement |
| Sub-pixel refinement | SVD-based 2D Gaussian surface fit (§III-B) | None built in; requires separate saddle-point or gradient step |
| Distortion correction | CNN stage corrects radial distortion before detection | None; detector handles distorted inputs via training augmentation |
| Parameter estimation | Built-in RANSAC + Zhang calibration | Not included |
| Framework / license | PyTorch / MIT | TensorFlow / unlicensed; no trained weights distributed |
| Published detection accuracy (Table III synthetic) | 0.78 / 0.51 / 0.71 px (noise / lighting / distortion) | CCDN-era baseline: 0.93 / 1.21 / 0.94 px |
| Published $E_{IP}$ (Table I distortion level 1 / 2) | 0.60 px / 1.12 px | Not reported on the same benchmark |

Choose CCS when the goal is end-to-end intrinsic calibration with sub-pixel accuracy — particularly when the lens has significant radial distortion that would otherwise degrade corner localisation and the training distribution of the distortion CNN can be matched to the target camera. CCS's published numbers show it edges the CCDN-era baseline on both Table III detection accuracy and Table I $E_{IP}$ under distortion. Choose CCDN when only a corner detector is needed — for example, as the detection front-end in a calibration system that provides its own parameter estimation — or when pattern-agnostic detection (no chessboard assumption) is required, or when an explicit three-stage post-processing pipeline (adaptive threshold + NMS + k-means++) with tunable thresholds is preferred over the Gaussian heatmap formulation.

# Remarks

- Compared with MATE: see [When to choose MATE over CCS](/atlas/mate-checkerboard-detector#when-to-choose-mate-over-ccs) on the [MATE](/atlas/mate-checkerboard-detector) page, which hosts the comparison per the older-paper-hosts rule (MATE 2016 < CCS 2022). CCS's UNet 2D-Gaussian heatmap with SVD-based Gaussian surface fitting delivers sub-pixel coordinates with confidence variance $\sigma$, where MATE's three-convolutional-layer CNN produces only a per-pixel response map at integer-grid accuracy without built-in refinement.

# References

1. Y. Zhang, X. Zhao, D. Qian. *Learning-Based Distortion Correction and Feature Detection for High Precision and Robust Camera Calibration.* IEEE Robotics and Automation Letters 7(4):10470–10477, 2022. [arXiv](https://arxiv.org/pdf/2202.00158)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE Trans. Pattern Anal. Mach. Intell. 22(11):1330–1334, 2000.
3. S. Donné, J. De Vylder, B. Goossens, W. Philips. *MATE: Machine Learning for Adaptive Calibration Template Detection.* MDPI Sensors 16(11):1858, 2016.
4. B. Chen, C. Xiong, Q. Zhang. *CCDN: Checkerboard Corner Detection Network for Robust Camera Calibration.* arXiv:2302.05097, 2023. [arXiv](https://arxiv.org/pdf/2302.05097)
5. A. Geiger, F. Moosmann, Ö. Car, B. Schuster. *Automatic Camera and Range Sensor Calibration using a Single Shot.* ICRA 2012.
