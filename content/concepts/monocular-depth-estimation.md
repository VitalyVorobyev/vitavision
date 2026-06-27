---
title: "Monocular Depth Estimation"
date: 2026-06-27
summary: "Predicting per-pixel scene depth from a single image — the scale ambiguity that forces relative (affine-invariant) versus metric formulations, the scale-and-shift-invariant training that lets incompatible datasets be mixed, and the foundation-model recipe that scaled it to zero-shot generalization."
tags: ["deep-learning", "dense-prediction", "survey"]
domain: depth
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [pinhole-camera-model]
sources:
  primary: ranftl2019-midas
  references:
    - yang2024-depth-anything
    - yang2024-depth-anything-v2
    - lin2025-depth-anything-3
---

# Definition

Monocular depth estimation recovers a dense per-pixel depth map from a single RGB image, with no stereo pair, no calibration target, and no known camera intrinsics. The task is fundamentally ill-posed: a single image fixes scene geometry only up to unknown degrees of freedom that cannot be resolved from photometry alone.

**Scale ambiguity.** For any single image, infinitely many world-scale configurations produce identical pixel values. If the true depth at pixel $i$ is $z_i$, then the scene scaled by any factor $\lambda > 0$ — placing all objects at depth $\lambda z_i$ — projects to the same image under a correspondingly scaled camera. This underdetermination means that a monocular depth estimator cannot recover absolute metric depth without (a) known camera intrinsics and a physical scale reference in the scene, or (b) metric supervision during fine-tuning.

**Relative vs metric depth.** Practical monocular systems operate in one of two regimes:

- **Relative (affine-invariant) depth** — the output is defined up to an unknown per-image scale $s > 0$ and shift $t \in \mathbb{R}$, typically expressed in disparity space $d = 1/z$ to linearise the relationship with stereo annotations. Predictions are meaningful for scene understanding, surface-distance ranking, and novel-view synthesis, but cannot serve metric measurement without post-hoc calibration.
- **Metric depth** — the output carries absolute scale in metres. This requires either camera conditioning (injecting known intrinsics into the model) or supervised fine-tuning on metric ground truth (LiDAR, structured light) with a known camera.

MiDaS, Depth Anything, and Depth Anything V2 produce relative depth by design. Depth Anything 3 extends the framework to jointly predict depth and per-pixel ray maps, enabling metrically consistent reconstruction from any number of views.

**Decision table.** The four models surveyed here chart the lineage from MiDaS through the Depth Anything family:

| Model | Output | Training signal | When to reach for it |
|---|---|---|---|
| MiDaS | Relative affine-invariant disparity | Pareto-mixed datasets (stereo, SfM, LiDAR, RGB-D) | General-purpose relative depth; heterogeneous GT formats; no metric requirement |
| Depth Anything | Relative affine-invariant disparity | 1.5 M labeled + 62 M pseudo-labeled unlabeled images | Zero-shot generalization across domains; ViT encoder drop-in for metric pipelines |
| Depth Anything V2 | Relative affine-invariant disparity (metric variant available) | Synthetic-only DINOv2-G teacher → pseudo-labels on 62 M real images | Best open-world relative depth, especially on transparent/reflective surfaces; >10× faster than diffusion-based alternatives |
| Depth Anything 3 | Affine-invariant depth + per-pixel ray map (metric-consistent geometry) | Distillation from DA3-based teacher + real multi-view data | Any-view depth + camera pose; feed-forward 3D reconstruction; unified monocular and multi-view geometry |

# Mathematical Description

## Scale-and-shift-invariant loss

Training a single depth network on data from multiple sources — metric LiDAR depth, disparity from unknown-baseline stereo, SfM depth up to an unknown scale — requires a loss that is indifferent to incompatible absolute scales and shifts between annotations. MiDaS (Ranftl et al., 2019) formalises this by working in **disparity space** $d = 1/z$ and aligning each prediction $d$ to its ground truth $d^*$ per image before evaluating any loss.

**Least-squares alignment.** Find scale $s$ and shift $t$ minimising the mean-squared alignment error:

$$
(s, t) = \arg\min_{s,t} \sum_{i=1}^{M} \bigl(s\,d_i + t - d_i^*\bigr)^2,
$$

solved in closed form by stacking $\tilde{d}_i = (d_i, 1)^\top$ and computing $h_\text{opt} = \bigl(\sum_i \tilde{d}_i \tilde{d}_i^\top\bigr)^{-1} \bigl(\sum_i \tilde{d}_i d_i^*\bigr)$ (MiDaS Eq. 4).

**Robust alignment.** Because ground-truth annotations contain outliers from sensor failures, stereo mismatches, and SfM instability around dynamic objects, MiDaS also provides a median-based alignment:

$$
t(d) = \operatorname{median}(d), \qquad s(d) = \frac{1}{M} \sum_{i=1}^{M} \bigl|d_i - t(d)\bigr|. \qquad \text{(MiDaS Eq. 5)}
$$

After aligning $\hat{d} = (d - t(d))/s(d)$ and $\hat{d}^* = (d^* - t(d^*))/s(d^*)$, the loss applies a **trimmed MAE** that hard-excludes the 20 % largest residuals before back-propagation. Large residuals are excluded entirely — not down-weighted — because they arise from annotation errors, not from model errors:

:::definition[Scale-and-shift-invariant trimmed loss]
$$
\mathcal{L}_\text{ssitrim}(\hat{d},\,\hat{d}^*) = \frac{1}{2M} \sum_{j=1}^{U_m} \rho_\text{mae}\!\bigl(\hat{d}_j - \hat{d}_j^*\bigr), \qquad U_m = \lfloor 0.8\,M \rfloor,
$$

where residuals are sorted ascending before summation and $\rho_\text{mae}(x) = |x|$. The 20 % trim fraction was set empirically on the ReDWeb dataset. (MiDaS Eq. 7)
:::

A **multi-scale gradient matching** regulariser biases predicted depth discontinuities to coincide with those in the ground truth, computed across $K = 4$ pyramid levels:

$$
\mathcal{L}_\text{reg}(\hat{d}, \hat{d}^*) = \frac{1}{M} \sum_{k=1}^{4} \sum_{i=1}^{M} \bigl(|\nabla_x R_i^k| + |\nabla_y R_i^k|\bigr), \quad R_i = \hat{d}_i - \hat{d}_i^*, \qquad \text{(MiDaS Eq. 11)}
$$

where superscript $k$ indexes the halved-resolution pyramid. The per-dataset training loss combines both terms with weight $\alpha = 0.5$ (MiDaS Eq. 12). Multiple datasets with incompatible ground-truth formats are mixed via a Pareto-optimal multi-objective criterion over per-dataset losses (MiDaS Eq. 13), which consistently outperforms naïve equal-parts mixing in cross-dataset evaluation.

Depth Anything inherits this affine-invariant formulation unchanged, normalising predictions by the same median shift $t(d) = \operatorname{median}(d)$ and MAD-like scale $s(d) = (1/HW)\sum_i|d_i - t(d)|$ (DA Eq. 3). Depth Anything V2 retains both losses with a modified weight ratio: $\mathcal{L}_\text{ssi} : \mathcal{L}_\text{gm} = 1:2$, because the gradient-matching term is found to be critical for edge sharpness specifically when training on synthetic data — a property not observed with noisy real-image labels (yang2024-depth-anything-v2, §B.7).

## Relative vs metric depth

The per-image scale-and-shift alignment discards absolute scale by design. Converting affine-invariant output to metric depth requires camera intrinsics and a physical scale anchor, or supervised fine-tuning on metric data. Depth Anything achieves KITTI $\delta_1 = 0.982$ and NYUv2 $\delta_1 = 0.984$ after domain-specific metric fine-tuning, while producing only relative depth from its base model (yang2024-depth-anything, Tables 3–4). Depth Anything V2 releases separate metric variants fine-tuned on Hypersim (indoor) and VKITTI2 (outdoor); these inherit the base-model's synthetic teacher lineage but add metric supervision.

Depth Anything 3 introduces explicit camera conditioning. A per-view camera token $c_i = E_c(f_i, q_i, t_i)$ encoding focal length, rotation quaternion, and translation is prepended to patch tokens and participates in all attention layers. When camera parameters are unavailable, a shared learnable token provides a consistent but geometry-free placeholder. The 3-D point at pixel $(u, v)$ is recovered element-wise as

$$
P(u,v) = t + D(u,v) \cdot d,
$$

where $t \in \mathbb{R}^3$ is the ray origin (camera centre) and $d \in \mathbb{R}^3$ is the backprojected ray direction $d = R K^{-1} p$ stored in the per-pixel ray map $M \in \mathbb{R}^{H \times W \times 6}$ (lin2025-depth-anything-3, §3.1). This depth-ray representation encodes camera pose implicitly: intrinsics and extrinsics can be recovered from $M$ via DLT fitting followed by QR decomposition, though an auxiliary lightweight camera head adds only ~0.1 % of total FLOPs and is used in practice.

## Scaling with pseudo-labels

Both Depth Anything generations use a **teacher-student data engine** to leverage unlabeled imagery at scale without the expense of sensor-collected ground truth.

Depth Anything V1 trains a teacher on 1.5 M labeled images (six complementary datasets spanning indoor RGB-D, outdoor SfM, and large-scale video) and applies it to 62 M unlabeled images drawn from eight public corpora (SA-1B, Open Images V7, ImageNet-21K, BDD100K, LSUN, Objects365, Places365, Google Landmarks) to generate pseudo-labels. Two refinements prevent the student from collapsing to teacher imitation: (a) **strong perturbations** — CutMix at 50 % probability, color jitter, and Gaussian blur — are applied to unlabeled inputs before feeding them to the student, while the teacher labels from clean images; (b) a **DINOv2 feature alignment** loss

$$
\mathcal{L}_\text{feat} = 1 - \frac{1}{HW} \sum_i \cos\!\bigl(f_i,\, f_i'\bigr) \qquad \text{(DA Eq. 9)}
$$

is applied on unlabeled data with a tolerance margin $\alpha = 0.85$ — pixels whose cosine similarity with the frozen DINOv2 teacher already exceeds the margin are excluded to avoid suppressing depth variation within a single object. Ablations confirm that naïve self-training without these two ingredients yields no improvement over the labeled-only baseline (yang2024-depth-anything, Table 9).

Depth Anything V2 identifies the root cause of V1's remaining limitations — over-smooth predictions and failures on transparent and reflective objects — as label noise in real-world depth annotations: sensors fail on transparent glass, stereo matching fails on repetitive textures, and SfM is unstable around dynamic objects. The fix replaces all labeled real images in the teacher stage with **595 K geometrically exact synthetic images** across five datasets (BlendedMVS 115 K, Hypersim 60 K, IRS 103 K, TartanAir 306 K, VKITTI2 20 K). Among tested backbone families — BEiT, SAM, SynCLR, DINOv2 in all sizes — only DINOv2-Giant (1.3 B parameters) achieves satisfying synthetic-to-real transfer when trained purely on synthetic depth data (yang2024-depth-anything-v2, §3, Table 13). Adding even 5 % real labeled images to synthetic teacher training visibly degrades edge sharpness (Fig. 12). The DINOv2-G teacher then pseudo-labels the same 62 M unlabeled real images as V1; student models (ViT-S through ViT-G) are trained **exclusively on pseudo-labeled real images**, omitting synthetic data at this stage. The resulting V2 ViT-L achieves 97.1 % on the DA-2K relative-depth benchmark, compared to 88.5 % for V1 and 86.8 % for diffusion-based Marigold, at more than ten times the inference speed (yang2024-depth-anything-v2, Table 3, Figure 1).

# Numerical Concerns

**Alignment before evaluation.** Affine-invariant models produce output that is undefined up to a per-image scale and shift. Standard depth metrics — AbsRel, $\delta_1$, RMSE — require aligning predicted and ground-truth maps by the same median-based scale-and-shift before computing any residuals. Evaluation without explicit alignment inflates all error figures and is not comparable between relative-depth and metric-depth models.

**Disparity compression at long range.** Working in disparity space $d = 1/z$ concentrates the dynamic range near the camera, where stereo training data is most dense, but compresses value differences for distant objects. Evaluation datasets impose per-dataset depth caps before computing metrics (ETH3D: 72 m, KITTI: 80 m, NYU and TUM: 10 m); results are not comparable across different cap choices.

**Edge sharpness versus metric accuracy.** Increasing the gradient-matching weight $\mathcal{L}_\text{gm}$ monotonically improves boundary sharpness in V2 (ablation weight range 0.5 to 4.0, optimal 2.0). However, the teacher pseudo-labels introduce a precision-vs-sharpness tradeoff: teacher supervision in DA3 slightly degrades metric accuracy on clean NYUv2 and KITTI benchmarks ($\delta_1$ 0.969 vs 0.966; 0.965 vs 0.947) while improving visual quality on thin structures (lin2025-depth-anything-3, §7.4, Table 11).

**Synthetic-to-real domain gap.** The DINOv2-G teacher in V2 still misassigns near depth to sky regions and produces inconsistent body-vs-head depth for humans in some configurations, because these patterns are underrepresented in the synthetic training corpus. The 62 M pseudo-labeled real images largely resolve these cases, but edge cases persist for domains absent from both synthetic data and the real unlabeled pool.

**No metric scale without calibration.** The base models of MiDaS, Depth Anything V1, and Depth Anything V2 cannot be used for metric measurement — AR placement, robotic path planning, or stereo triangulation requiring known baseline — without domain-specific metric fine-tuning or explicit camera conditioning.

# Where it appears

The following model pages in the Atlas cover the four methods surveyed above:

- [MiDaS](/atlas/midas) — the foundational affine-invariant monocular depth model; introduced the scale-and-shift-invariant loss family and Pareto multi-dataset mixing that all subsequent models inherit.
- [Depth Anything](/atlas/depth-anything) — extended MiDaS with 62 M pseudo-labeled unlabeled images and a DINOv2 ViT encoder, establishing the data-engine recipe for monocular depth at foundation-model scale.
- [Depth Anything V2](/atlas/depth-anything-v2) — replaced labeled real data with a synthetic-only teacher to eliminate annotation noise; the practical relative-depth foundation model as of mid-2024, with ViT-S/B/L variants spanning 25 M to 335 M parameters at 60–213 ms on V100.
- [Depth Anything 3](/atlas/depth-anything-3) — extends the framework to any number of views; jointly predicts depth and per-pixel ray maps to recover metrically consistent 3D geometry and camera pose without bundle adjustment, while also surpassing Depth Anything V2 in the single-image (monocular) setting, with an average rank of 2.20 versus 2.60 across five standard benchmarks.

DA3 is notable for dissolving the boundary between monocular depth estimation and multi-view reconstruction. The same plain DINOv2 transformer — partitioned into within-view and cross-view attention blocks at a 2:1 ratio — handles both the N = 1 monocular case and the any-view reconstruction case with identical weights, unifying what were previously separate model families under a single architecture.

# References

1. R. Ranftl, K. Lasinger, D. Hafner, K. Schindler, V. Koltun. "Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-shot Cross-dataset Transfer." arXiv 1907.01341, 2019.
2. L. Yang, B. Kang, Z. Huang, X. Xu, J. Feng, H. Zhao. "Depth Anything: Unleashing the Power of Large-Scale Unlabeled Data." arXiv 2401.10891, CVPR 2024.
3. L. Yang, B. Kang, Z. Huang, Z. Zhao, X. Xu, J. Feng, H. Zhao. "Depth Anything V2." arXiv 2406.09414, NeurIPS 2024.
4. H. Lin, S. Chen, J. Liew, D. Y. Chen, Z. Li, G. Shi, J. Feng, B. Kang. "Depth Anything 3: Recovering the Visual Space from Any Views." arXiv 2511.10647, 2025.
