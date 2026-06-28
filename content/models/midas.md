---
title: "MiDaS"
date: 2026-06-27
summary: "A monocular depth network trained for zero-shot cross-dataset transfer by mixing incompatible depth datasets under a scale-and-shift-invariant loss, predicting relative inverse depth up to an unknown global scale and shift."
tags: ["deep-learning", "dense-prediction"]
domain: depth
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: cnn
prerequisites: [monocular-depth-estimation, pinhole-camera-model]
sources:
  primary: ranftl2019-midas
relations:
  - type: feeds_into
    target: depth-anything
    confidence: high
implementations:
  - role: official
    repo: https://github.com/isl-org/MiDaS
    commit: 454597711a62eabcbf7d1e89f3fb9f569051ac9b
    framework: pytorch
    license: MIT
    weights_license: MIT
---

# Motivation

Takes a single RGB image of arbitrary scene type — indoor or outdoor, static or dynamic, with no camera calibration — and produces a dense **inverse-depth (disparity) map** in relative units: depth up to an unknown global scale and shift. Metric depth is not recovered. The defining property is **zero-shot cross-dataset transfer**: rather than training on one depth dataset and overfitting to its sensor characteristics and scene bias, MiDaS trains simultaneously on five complementary datasets — each with a different ground-truth representation (metric depth, depth up to unknown scale, or disparity with unknown scale and shift) — under a loss that handles all three annotation types in a unified disparity-space training loop. A Pareto-optimal multi-objective mixing strategy replaces naive equal-parts blending, yielding a single model that generalises to held-out datasets without any fine-tuning.

# Architecture

**Family & shape.** Encoder–decoder CNN. Input: a single RGB image resized so its longer axis equals 384 px, with the shorter axis rounded to the nearest multiple of 32. Output: a dense disparity map at the same spatial resolution. The encoder is ResNeXt-101 pretrained first on approximately 900 million weakly-supervised Instagram images (WSL) and then fine-tuned on ImageNet; the paper finds that ImageNet classification accuracy of an encoder is a strong predictor of monocular depth accuracy (§6, Fig. 4), and that random initialisation degrades average performance by approximately 35 % relative to the WSL-pretrained baseline. The decoder is the multi-scale encoder–decoder design of Xian et al., producing a dense disparity map from multi-scale encoder features.

**Blocks.** The network body (encoder–decoder) is the standard baseline from Xian et al. The architectural contribution of MiDaS is entirely in the training objective and data mixing, not in the network blocks. Images are resized at inference time so the longer side equals 384 px; for wide-aspect-ratio inputs (e.g. KITTI) the shorter axis is set to 384 to avoid excessively small images.

**Training.** Five datasets are mixed — ReDWeb (3 600 curated stereo images), MegaDepth (130 K SfM depth maps), 3D Movies (75 074 frames from 19 Blu-ray stereo films), WSVD (1.5 M web stereo video frames), and DIML Indoor (220 K RGB-D frames). The six evaluation datasets (DIW, ETH3D, Sintel, KITTI, NYU, TUM) are held out completely; no fine-tuning is performed.

The training objective has three components.

:::definition[Scale-and-shift-invariant loss]
Prediction $d$ and ground truth $d^*$ are aligned per-image by finding a scale $s$ and shift $t$ that minimise the mean squared alignment error; after alignment, a trimmed MAE loss removes the 20 % largest residuals to exclude annotation outliers from back-propagation.

The robust median-based alignment (Eqs. 5–6):

$$
t(d) = \operatorname{median}(d), \qquad
s(d) = \frac{1}{M} \sum_{i=1}^{M} \bigl|d_i - t(d)\bigr|,
$$

$$
\hat{d} = \frac{d - t(d)}{s(d)}, \qquad \hat{d}^* = \frac{d^* - t(d^*)}{s(d^*)}.
$$

The trimmed MAE loss (Eq. 7), where residuals are sorted ascending and only the lowest $U_m = 0.8M$ are retained:

$$
\mathcal{L}_{\mathrm{ssi}}(\hat{d}, \hat{d}^*) = \frac{1}{2M} \sum_{j=1}^{U_m} |\hat{d}_j - \hat{d}^*_j|.
$$

The trimming fraction $U_m/M = 0.8$ was set empirically on ReDWeb.
:::

A **multi-scale gradient-matching regularizer** $\mathcal{L}_{\mathrm{reg}}$ (Eq. 11) biases depth discontinuities to align with those in the ground truth, computed at $K = 4$ halved-resolution pyramid levels:

$$
\mathcal{L}_{\mathrm{reg}}(\hat{d}, \hat{d}^*) = \frac{1}{M} \sum_{k=1}^{4} \sum_{i=1}^{M}
\bigl(|\nabla_x R_i^k| + |\nabla_y R_i^k|\bigr),
$$

where $R_i = \hat{d}_i - \hat{d}^*_i$ is the residual disparity map at pyramid level $k$.

The **per-dataset loss** (Eq. 12) combines both terms with $\alpha = 0.5$:

$$
\mathcal{L}_l = \frac{1}{N_l} \sum_{n=1}^{N_l}
\bigl[\mathcal{L}_{\mathrm{ssi}}(\hat{d}_n, \hat{d}^*_n) + 0.5 \cdot \mathcal{L}_{\mathrm{reg}}(\hat{d}_n, \hat{d}^*_n)\bigr].
$$

**Multi-dataset mixing** (Eq. 13): rather than blending datasets in fixed proportions, the authors treat each training dataset as a separate task and seek a Pareto-optimal solution using the multi-task learning algorithm of Sener & Koltun (NIPS 2018):

$$
\min_\theta \; \bigl(\mathcal{L}_1(\theta), \ldots, \mathcal{L}_L(\theta)\bigr).
$$

Pareto mixing consistently outperforms naive equal-parts mixing in ablation (Tables 6–9, §6).

**Zero-shot evaluation protocol.** On six held-out datasets (DIW, ETH3D, Sintel, KITTI, NYU, TUM), MiDaS MIX 5 achieves an average rank of 2.0 versus 5.7 for the next best published zero-shot model (Tables 10–11, §6). Evaluation metrics are aligned to each dataset's annotation type: for metric-space datasets depth values are capped at dataset-specific maxima (ETH3D 72 m; KITTI 80 m; NYU/TUM 10 m); ordinal accuracy metrics (WKDR, percentage of correctly ordered pairs) are used for scale-only ground truth.

**Complexity.** The paper does not report a parameter count; the ResNeXt-101 WSL encoder alone has approximately 89 M parameters. Input is fixed at 384 × 384 (longer axis) with shorter axis rounded to a multiple of 32.

# Implementations

Official PyTorch release under MIT license, with MIT-licensed pretrained weights.

# Assessment

**Novelty.**

- Introduces the **affine-invariant disparity-space loss** ($\mathcal{L}_{\mathrm{ssi}}$) — the first loss function that absorbs per-image scale and shift at every training step, enabling datasets with fundamentally incompatible depth representations (metric, scale-only, scale-and-shift) to be trained in a single loop. Eigen et al.'s scale-invariant log-depth loss addresses scale but not shift; MiDaS extends to full affine ambiguity in disparity space.
- Establishes **principled multi-dataset mixing via Pareto optimality** as the recipe for robust monocular depth. Subsequent large-scale monocular depth foundation models (Depth Anything, Depth Anything V2, Depth Anything 3) directly inherit this training design.
- Introduces **3D Movies** as a novel large-scale training source: 75 074 training frames from 19 commercially-released Blu-ray stereo films, providing disparity ground truth with unknown baseline and post-production horizontal shifts — exactly the hardest annotation type for which $\mathcal{L}_{\mathrm{ssi}}$ was designed.

**Strengths.**

- Zero-shot cross-dataset transfer: MIX 5 ranks first or second on four of six held-out evaluation datasets and achieves average rank 2.0, outperforming all contemporaneous zero-shot models (Tables 10–11, §6).
- The loss family is annotation-agnostic — a single training loop handles LiDAR metric depth, SfM scale-only depth, and stereo disparity with unknown baseline and shift. This removes the need to harmonise or convert ground-truth representations across datasets.
- MIT license on both code and weights; commercially deployable.

**Limitations.**

- **Relative depth only.** The affine-invariant loss is designed to discard global scale and shift; metric depth cannot be recovered from model output without a separate scale calibration step. Tasks requiring absolute distance measurement (autonomous navigation, structural metrology) must use sensor fusion or metric-depth fine-tuning.
- **Rotation and gravity bias.** Training data has a consistent sky-up orientation; the network fails on 90°-rotated inputs and misorders foreground objects at the bottom of the frame as closer (§6, Fig. 9).
- **Resolution ceiling and thin structures.** The 384 × 384 input resolution limits boundary sharpness for thin structures and blurs distant background depth; a known artefact attributed to limited training resolution (§6).
- **Reflective surfaces and framed pictures.** Mirrors and framed artwork produce depth maps that follow the depicted scene rather than the physical reflector plane, because training data does not include reflectance supervision (§6, Fig. 9).
- **Bounded by 2019-era CNN backbone and dataset scale.** The WSL-pretrained ResNeXt-101 encoder was the best available in 2019; subsequent work (Depth Anything, using DINOv2 ViT backbones trained on billions of images) showed that scaling the encoder and the unlabelled data pool dramatically extends zero-shot performance beyond what MiDaS achieves.

# References

1. R. Ranftl, K. Lasinger, D. Hafner, K. Schindler, V. Koltun. *Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-shot Cross-dataset Transfer.* TPAMI, 2022 (arXiv 2019). [arXiv 1907.01341](https://arxiv.org/abs/1907.01341)
2. L. Yang, B. Kang, Z. Huang, Z. Zhao, X. Xu, J. Feng, H. Zhao. *Depth Anything: Unleashing the Power of Large-Scale Unlabeled Data.* CVPR, 2024. [arXiv 2401.10891](https://arxiv.org/abs/2401.10891)
3. O. Sener, V. Koltun. *Multi-Task Learning as Multi-Objective Optimization.* NeurIPS, 2018. [arXiv 1810.04650](https://arxiv.org/abs/1810.04650)
4. K. Xian, C. Shen, Z. Cao, H. Lu, Y. Xiao, R. Jones, S. Feng. *Monocular Relative Depth Perception with Web Stereo Data Supervision.* CVPR, 2018.
