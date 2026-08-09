---
title: "Depth Anything 3"
date: 2026-06-27
summary: "A single plain-transformer model that predicts spatially consistent geometry — depth plus camera rays — from one to many images, with or without known poses, distilled from Depth Anything 2 via a unified depth-ray target."
tags: ["deep-learning", "dense-prediction", "pose-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "Plain DINO ViT backbone; Giant variant ~1.13B"
prerequisites: [monocular-depth-estimation, feed-forward-3d-reconstruction, pose-estimation, epipolar-geometry, pinhole-camera-model]
sources:
  primary: lin2025-depth-anything-3
  references:
    - yang2024-depth-anything-v2
    - oquab2023-dinov2
    - wang2025-vggt
    - wang2023-dust3r
implementations:
  - role: official
    repo: https://github.com/ByteDance-Seed/Depth-Anything-3
    commit: 41736238f5bced4debf3f2a12375d2466874866d
    framework: pytorch
    license: Apache-2.0
    weights_license: Apache-2.0
---

# Motivation

Takes $N \geq 1$ RGB images — with camera parameters $(K_i, R_i, t_i)$ optionally supplied per view — and produces per-image depth maps $D_i \in \mathbb{R}^{H \times W}$ and ray maps $M_i \in \mathbb{R}^{H \times W \times 6}$ in a common world frame; from these a lightweight camera head recovers a 9-DoF pose $\hat{c}_i = (t_i, q_i, f_i)$ per view, and globally consistent point clouds follow from the pixel-level combination $P(u,v) = t + D(u,v) \cdot d$. The defining property is minimal modeling: a single **plain DINOv2 ViT encoder** — architecturally identical to the standard backbone, unmodified — handles any view count from monocular to 4000+ images through an input-adaptive attention rearrangement; and a single **depth-ray prediction target** (depth map plus per-pixel ray map) replaces the separate point-map, pose-head, and depth-head designs of prior unified models, encoding camera geometry implicitly without multi-task loss engineering.

# Architecture

**Family & shape.** Plain transformer encoder. Input: $N$ RGB images of shape $(H, W, 3)$. Output: $N$ depth maps $(H, W)$ and $N$ ray maps $(H, W, 6)$, with optional 9-DoF camera poses. Backbone: vanilla DINOv2 ViT at patch size 14 and base resolution 504×504. Four model sizes: Giant (1.130 B backbone params), Large (0.300 B), Base (0.086 B), Small (0.022 B). (§3.2, Table 8.)

**Blocks.**

*Depth-ray representation.* For each pixel $p$, the ray $r \in \mathbb{R}^6$ is defined as $r = (t, d)$, where $t \in \mathbb{R}^3$ is the camera center (constant across pixels within one view) and $d = R K^{-1} p$ is the pixel direction rotated into the world frame. The dense ray map $M \in \mathbb{R}^{H \times W \times 6}$ stores these per-pixel parameters. A 3D point is recovered as

$$
P(u,v) = t + D(u,v) \cdot d,
$$

a pixel-level element-wise combination of the depth and ray maps. Camera intrinsics and extrinsics are in principle recoverable from the predicted ray map via DLT + QR decomposition; in practice a lightweight camera head $D_C$ (~0.1 % of total FLOPs) directly regresses the 9-DoF pose $\hat{c} = (t, q, f)$ to avoid that computational cost. (§3.1.)

*Cross-view attention.* The $L$ transformer blocks are partitioned $L_s{:}L_g = 2{:}1$. The first $L_s$ blocks apply standard within-view self-attention. The subsequent $L_g$ blocks alternate between cross-view and within-view attention by rearranging the token tensor across the view-batch dimension at alternating layers — no new attention kernel is introduced. With $N = 1$ the model collapses to standard monocular ViT inference at no extra cost. (§3.2.)

*Camera conditioning.* A per-view token $c_i = E_c(f_i, q_i, t_i)$ is produced by an MLP when poses are available; when they are not, a single shared learnable token $c_l$ is used instead. The token is prepended to the patch sequence and participates in all attention operations. Pose conditioning is applied with probability 0.2 during training. (§3.2, §3.4.)

*Dual-DPT head.* Shared DPT reassembly modules feed into two separate sets of fusion layers, one branch predicting depth $\hat{D}$ and the other predicting ray map $\hat{M}$. The shared low-level reassembly is essential: ablation shows removing the dual-DPT head collapses HiRoom AUC3 from 39.2 to 5.59, an 86 % drop in pose accuracy (Table 7, row d, §3.2).

**Training.** A teacher-student distillation pipeline. The teacher is a DA2-architecture monocular depth model trained exclusively on synthetic data; it predicts exponential scale-shift-invariant depth rather than the disparity used by DA2, improving discrimination at small distances. The student (DA3) is supervised on real-world multi-view data using teacher pseudo-labels RANSAC-aligned to sparse metric measurements via

$$
(\hat{s},\,\hat{t}) = \operatorname*{argmin}_{s>0,\,t}\ \sum_p m_p\bigl(s\tilde{D}_p + t - D_p\bigr)^2.
$$

All ground-truth signals are normalized by the mean $\ell_2$ norm of valid reprojected point maps before loss computation. The full student objective is

$$
\mathcal{L} = \mathcal{L}_D + \mathcal{L}_M + \mathcal{L}_P + \beta\mathcal{L}_C + \alpha\mathcal{L}_{\mathrm{grad}},\quad \alpha = \beta = 1.
$$

Supervision transitions from ground-truth labels to teacher pseudo-labels at step 120 k of 200 k total. Training infrastructure: 128 H100 GPUs, 200 k steps, peak learning rate $2 \times 10^{-4}$, 8 k warm-up steps, base resolution 504×504, view count sampled from $[2, 18]$. (§3.3–3.4, §4.1–4.2.)

**Complexity.** Giant variant: backbone 1.130 B params, dual-DPT head 0.050 B, camera head 0.018 B; 37.6 FPS at 504×336 on A100. Large variant: backbone 0.300 B; 78.4 FPS. (Table 8.)

# Implementations

Official PyTorch release from ByteDance Seed under Apache-2.0 code and weights licenses.

# Assessment

**Novelty.**

- **Vanilla-backbone sufficiency** relative to VGGT and DUSt3R: those models use bespoke multi-transformer stacks trained from scratch; DA3 shows that a pretrained DINOv2 ViT with only an input-adaptive token rearrangement surpasses both on the any-view geometry benchmark at comparable or smaller parameter counts.
- **Singular depth-ray target** replacing multi-task heads: prior feed-forward geometry models (DUSt3R, VGGT) regress explicit point maps or maintain separate depth and pose outputs; DA3's unified depth-ray target encodes camera geometry implicitly in the ray map, eliminating the separate pose-head design.
- **Distillation transferring and improving DA2 detail**: the teacher-student recipe carries DA2's monocular quality into the multi-view student; the DA3 monocular student surpasses DA2 student across all five standard depth benchmarks (DA3 average rank 2.20 vs DA2 rank 2.60, Table 4).

**Strengths.**

- On the visual geometry benchmark, DA3-Giant (1.10 B params) surpasses VGGT (1.19 B) by an average 44.3 % in camera pose accuracy (AUC3 per setting, Table 2: HiRoom 80.3 vs 49.1, ETH3D 48.4 vs 26.3, DTU 94.1 vs 79.2, 7Scenes 28.5 vs 23.9, ScanNet++ 85.0 vs 62.6) and by 25.1 % in geometric accuracy (F1 pose-free, Table 3, §7.1). (Provenance: Table 2–3.)
- Pose-optional operation from a single set of weights: known poses inject a camera token; unknown poses fall back to the shared learnable token $c_l$, with no architectural change or model swap required.
- As a 3DGS backbone for feed-forward novel view synthesis, DA3 improves VGGT on DL3DV PSNR (21.33 vs 20.96) and LPIPS (0.241 vs 0.253), and on out-of-domain MegaDepth PSNR (17.89 vs 16.45) (Table 5).

**Limitations.**

- Textureless and reflective surfaces are a known adversary for depth estimation but are not ablated; behavior on those scene types is unreported.
- Training the Giant variant requires 128 H100 GPUs for approximately 10 days, out of reach for most academic compute budgets.
- Teacher supervision introduces a precision-vs-sharpness tradeoff: for the metric model, removing teacher pseudo-labels improves NYUv2 $\delta_1$ (0.969 vs 0.966) and KITTI $\delta_1$ (0.965 vs 0.947) while also increasing visual sharpness (§7.4, Table 11).
- Dynamic scenes violate the single-world-frame depth-ray consistency assumption; this is acknowledged as future work (§8).

# References

1. H. Lin et al. *Depth Anything 3: Recovering the Visual Space from Any Views.* arXiv 2511.10647, 2025. [arXiv](https://arxiv.org/abs/2511.10647)
2. L. Yang et al. *Depth Anything V2.* NeurIPS, 2024. [arXiv](https://arxiv.org/abs/2406.09414)
3. M. Oquab et al. *DINOv2: Learning Robust Visual Features without Supervision.* TMLR, 2024. [arXiv](https://arxiv.org/abs/2304.07193)
4. S. Wang et al. *VGGT: Visual Geometry Grounded Deep Structure From Motion.* CVPR, 2025. [arXiv](https://arxiv.org/abs/2503.11651)
5. S. Wang et al. *DUSt3R: Geometric 3D Vision Made Easy.* CVPR, 2024. [arXiv](https://arxiv.org/abs/2312.14132)
