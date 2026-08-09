---
title: "Depth Anything V2"
date: 2026-06-27
summary: "A monocular depth foundation model that trains its teacher purely on synthetic images for label precision, then distills to a student over 62M pseudo-labeled real images, sharpening detail over V1 while staying far faster than diffusion-based depth."
tags: ["deep-learning", "dense-prediction"]
domain: depth
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "ViT-S 25M / ViT-L 335M / ViT-G 1.3B (teacher)"
prerequisites: [monocular-depth-estimation, vit]
sources:
  primary: yang2024-depth-anything-v2
  references:
    - yang2024-depth-anything
    - ranftl2019-midas
    - oquab2023-dinov2
relations:
  - type: generalized_by
    target: depth-anything-3
    confidence: high
    caution: "DA3 generalizes DA2 to any-view geometry and surpasses it on monocular depth; DA2 is also DA3's distillation teacher."
implementations:
  - role: official
    repo: https://github.com/DepthAnything/Depth-Anything-V2
    commit: a561b849ebae10a6f5ef49e26c83cbbcd36c71bf
    framework: pytorch
    license: Apache-2.0
    weights_license: "CC-BY-NC-4.0 (ViT-B/L/G); Apache-2.0 (ViT-S)"
---

# Motivation

Takes a single RGB image and produces a dense affine-invariant inverse depth map (disparity space). A separately released metric-depth variant — fine-tuned on Hypersim for indoor scenes and VKITTI2 for outdoor — adds absolute scale; the base model guarantees only relative ordinal correctness per image. The defining property is a **synthetic-only teacher with large-scale pseudo-labeling**: V1 trained on approximately 1.5M labeled real images whose sensor, stereo, and SfM annotations carry systematic noise on transparent objects, repetitive textures, and dynamic regions, producing over-smoothed and imprecise predictions. V2 eliminates this root cause by training the teacher exclusively on 595K synthetic images where every thin structure, reflective mirror, and transparent vase is annotated precisely from the graphics renderer, then running that teacher over 62M unlabeled real images to produce pseudo-labels that are simultaneously more diverse and more accurate than any real-world annotation.

# Architecture

**Family & shape.** DINOv2-pretrained ViT encoders — ViT-S (25M params), ViT-B, ViT-L (335M), and ViT-G (1.3B, teacher only) — coupled to a DPT depth decoder inherited from V1. Input: single RGB image, shorter side resized to 518 during training (518 = 37 × 14 patches, matching DINOv2's patch size); aspect-ratio preserved and random-cropped to 518×518. Output: dense disparity map $d = 1/t$, normalised per image by scale and shift to remove absolute depth ambiguity — the same affine-invariant formulation as MiDaS and V1.

**Blocks.** The encoder is a standard DINOv2 ViT with 14-pixel patch embeddings and no architectural modification. The DPT decoder fuses multi-scale encoder features into a dense prediction head. Architecture is identical to V1; all improvement over V1 comes from the data recipe.

**Training.** Three stages define the V2 recipe:

1. **Synthetic-only teacher.** DINOv2-G is trained exclusively on 595K precise synthetic images (BlendedMVS 115K, Hypersim 60K, IRS 103K, TartanAir 306K, VKITTI2 20K). Real labeled data is explicitly excluded; even mixing in 5% of a real dataset (HRWSI) visibly degrades sharpness (§B.9). Loss: scale-and-shift-invariant $L_\text{ssi}$ plus gradient-matching $L_\text{gm}$, both inherited from MiDaS, at weight ratio $1{:}2$. $L_\text{gm}$ is critical for sharpness specifically on synthetic data; it was found ineffective on real labels whose coarseness removes fine-grained gradient signal. Teacher training: batch size 64, 160K iterations, Adam optimizer (encoder LR 5e-6, decoder LR 5e-5).

2. **Pseudo-labeling at scale.** The DINOv2-G teacher inference runs over 62M unlabeled real images from eight public datasets (BDD100K 8.2M, Google Landmarks 4.1M, ImageNet-21K 13.1M, LSUN 9.8M, Objects365 1.7M, Open Images V7 7.8M, Places365 6.5M, SA-1B 11.1M). The teacher's predictions serve as pseudo-labels, bridging the synthetic-to-real domain gap while preserving annotation precision. A per-sample top-10% highest-loss pixel mask is ignored to suppress the noisiest pseudo-label regions.

3. **Student distillation.** Student models (ViT-S/B/L/G) train **purely on the pseudo-labeled real images**, omitting synthetic images at this stage — ablations confirm removing synthetic from the student stage improves ViT-S and ViT-B (Table 5). The $L_\text{ssi}$ + $L_\text{gm}$ loss is retained for labeled images; a DINOv2 feature-alignment loss from V1 is added on pseudo-labeled images to preserve semantic priors. Student training: batch size 192, 480K iterations, same Adam schedule.

```mermaid
flowchart LR
  Syn["595K synthetic images"] --> Teacher["DINOv2-G teacher"]
  Teacher --> PL["62M pseudo-labels"]
  PL --> Student["ViT-S/B/L students"]
```

**Evaluation — DA-2K benchmark.** V2 introduces DA-2K: 2K high-resolution images (~1500×2000), 2K sparse relative-depth pixel-pair annotations, eight scenario categories (Indoor, Outdoor, Non-real, Transparent/Reflective, Adverse style, Aerial, Underwater, Object). Annotation uses SAM to generate candidate pairs; four depth models vote; human annotators triple-check disagreed pairs. Existing benchmarks (NYU-D, KITTI) contain noisy annotations that penalise better models and do not reflect V2's fine-grained gains (Figure 8 shows incorrect mirror and thin-structure depths in NYU-D).

**Complexity.** ViT-S: 25M params, 60 ms per image on V100. ViT-L: 335M params, 213 ms. ViT-G (teacher): 1.3B params. Test-time 2× or 4× resolution upscaling further improves sharpness with no retraining (§B.8).

# Implementations

Official PyTorch release under Apache-2.0 code; note the weights-license split: ViT-S weights are Apache-2.0, while ViT-B, ViT-L, and ViT-G weights are CC-BY-NC-4.0, restricting commercial use (stated in the repository README, not in the paper — verify directly before use).

# Assessment

**Novelty.**

- Identifies **labeled real-image noise as the root cause** of V1's over-smoothed predictions, not the architecture or model scale — and resolves it structurally by substituting synthetic labels for all real labels in the teacher stage. Depth Anything V1 and MiDaS both train on real labeled images and inherit their systematic annotation failures.
- Demonstrates that **pseudo-labels from a synthetic-trained teacher outperform human-annotated real labels**: Table 6 shows pseudo-labels beat DIML manual annotations on every metric.
- Establishes that **DINOv2-G is uniquely capable of synthetic-to-real transfer** among tested backbone families (BEiT-L, SAM-L, SynCLR-L, DINOv2-S/B/L all fail when trained purely on synthetic depth data; only DINOv2-G achieves satisfying transfer — Table 13).

**Strengths.**

- V2 ViT-B achieves 97.0% DA-2K accuracy and ViT-L achieves 97.1%, versus Marigold 86.8%, DepthFM 85.8%, and Depth Anything V1 88.5% (Table 3, Figure 1).
- V2 ViT-S runs at 60 ms per image on V100 with 25M parameters; Marigold-LCM requires 5.2 s with 948M parameters — more than 10× faster per the paper abstract (§Abstract, Figure 1) with the ViT-S vs Marigold-LCM ratio approaching 86×.
- The ViT-L encoder transfers strongly to semantic segmentation: 85.6 mIoU on Cityscapes, the highest among all methods in Table 8.

**Limitations.**

- The base model outputs relative affine-invariant depth; absolute metric depth requires a separate fine-tuning step on domain-specific data (Hypersim / VKITTI2), inheriting synthetic biases.
- ViT-B, ViT-L, and ViT-G pretrained weights are licensed **CC-BY-NC-4.0**, prohibiting commercial deployment; only ViT-S carries an Apache-2.0 weights license. This split is stated in the GitHub repository README only, not in the paper — confirm before use (?).
- Sky and human-head depth remain occasional failure cases even after pseudo-labeling; these scene patterns are absent from the synthetic training distribution and not fully covered by the 62M real images (§D).
- Later generalised by Depth Anything 3, which uses DA2 as its distillation teacher and surpasses it on monocular depth benchmarks while extending to any-view geometry.

# References

1. L. Yang, B. Kang, Z. Huang, Z. Zhao, X. Xu, J. Feng, H. Zhao. *Depth Anything V2.* NeurIPS, 2024. [arXiv 2406.09414](https://arxiv.org/abs/2406.09414)
2. L. Yang, B. Kang, Z. Huang, X. Xu, J. Feng, H. Zhao. *Depth Anything: Unleashing the Power of Large-Scale Unlabeled Data.* CVPR, 2024. [arXiv 2401.10891](https://arxiv.org/abs/2401.10891)
3. R. Ranftl, K. Lasinger, D. Hafner, K. Schindler, V. Koltun. *Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-Shot Cross-Dataset Transfer.* TPAMI, 2020. [arXiv 1907.01341](https://arxiv.org/abs/1907.01341)
4. M. Oquab et al. *DINOv2: Learning Robust Visual Features without Supervision.* TMLR, 2024. [arXiv 2304.07193](https://arxiv.org/abs/2304.07193)
