---
title: "MASt3R"
date: 2026-06-27
summary: "A 3D-grounded image matcher that adds a dense local-descriptor head and an InfoNCE matching loss on top of DUSt3R's pointmap regression, with a fast reciprocal matching scheme, yielding correspondences robust to extreme viewpoint change."
tags: ["deep-learning", "two-view-geometry", "local-descriptors"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
tasks: [local-feature-matching]
params: "DUSt3R backbone (ViT-L enc + ViT-B dec) + descriptor head"
prerequisites: [feature-matching, feature-descriptors, epipolar-geometry, pose-estimation, feed-forward-3d-reconstruction]
sources:
  primary: leroy2024-mast3r
  references:
    - wang2023-dust3r
relations:
  - type: compared_with
    target: loftr
    confidence: medium
    caution: "MASt3R grounds matching in 3D and wins under extreme viewpoint change; LoFTR is a 2D detector-free matcher."
  - type: compared_with
    target: lightglue
    confidence: medium
    caution: "MASt3R is 3D-grounded and pose-robust; LightGlue is a fast sparse 2D matcher."
implementations:
  - role: official
    repo: https://github.com/naver/mast3r
    commit: f5209afc300cec36239a7ac992263f36847bbba0
    framework: pytorch
    license: CC-BY-NC-SA-4.0
    weights_license: CC-BY-NC-SA-4.0
---

# Motivation

Produce dense pixel correspondences between an image pair under unknown camera intrinsics and extrinsics, handling viewpoint differences up to 180°. Input: two RGB images $I^1$, $I^2$ of the same scene, largest dimension capped at 512 px internally. Output: a set of pairwise pixel correspondences $\mathcal{M} \subseteq I^1 \times I^2$, per-pixel 3D pointmaps $X^{v,1} \in \mathbb{R}^{H \times W \times 3}$ expressed in camera $C^1$'s frame, per-pixel confidence maps $C^v$, and dense local feature maps $D^v \in \mathbb{R}^{H \times W \times d}$. From these outputs, focal length, relative pose, metric depth, and 3D reconstruction are all derivable in a single forward pass. The defining property is that correspondences are **grounded in 3D**: pixels correspond when they observe the same physical 3D point, so the shared pointmap representation provides geometric supervision that 2D descriptor matching inherently lacks. This grounding is what allows MASt3R to succeed where 2D-only methods (SIFT, SuperGlue, LoFTR) break down under large viewpoint changes.

# Architecture

**Family & shape.** Transformer encoder–decoder with two prediction heads per image. The backbone is the DUSt3R architecture: a Siamese shared-weight ViT-Large encoder processes each image independently into token sequences $H^1$, $H^2$ (Eqs. 1–2), and two ViT-Base cross-attention decoders fuse information across the pair into context-enriched representations $H'^1$, $H'^2$ (Eq. 3). Each per-view representation feeds two heads in parallel: the inherited `Head3D` for pointmap regression and the newly added `Headdesc` for dense local features.

**Blocks.** Four components executed per inference call:

1. **Siamese ViT-Large encoder.** Each image is independently patchified and encoded. Weights are shared across views. Outputs token sequences $H^1$ and $H^2$.

2. **Cross-attention ViT-Base decoder.** A pair of decoders interleave self-attention within each view with cross-attention across views, producing $H'^1$ and $H'^2$ that carry geometric context from both images. This cross-view fusion is what makes both downstream heads aware of the scene's 3D structure.

3. **`Head3D` — pointmap and confidence.** Two instances (one per view) take the concatenated $[H^v, H'^v]$ tokens and regress per-pixel 3D pointmaps $X^{v,1} \in \mathbb{R}^{H \times W \times 3}$ — both expressed in camera $C^1$'s frame — alongside per-pixel confidence maps $C^v$ (Eqs. 4–5). This head is inherited unchanged from DUSt3R.

4. **`Headdesc` — dense local features.** Two instances with the same input structure as `Head3D`, but implemented as a 2-layer MLP with GELU activations (Eqs. 8–9). Outputs are L2-normalised to unit norm; feature dimension $d = 24$. The low dimensionality is efficient for brute-force nearest-neighbour search via FAISS while avoiding K-d tree pathologies in high dimensions.

The pipeline from image pair to heads:

```mermaid
flowchart LR
    Pair["Image pair"] --> Enc["Siamese ViT-L encoder"]
    Enc --> Dec["Cross-attention ViT-B decoder"]
    Dec --> Out["Head3D + Headdesc"]
```

**Training.** MASt3R is initialised from the public DUSt3R checkpoint and fine-tuned jointly on 14 diverse datasets, sampling 650k image pairs per epoch over 35 epochs with AdamW ($\text{lr} = 10^{-4}$, weight decay 0.05, cosine decay, 7 warmup epochs). The training objective combines two losses (Eq. 12):

$$
\mathcal{L}_\text{total} = \mathcal{L}_\text{conf} + \beta\,\mathcal{L}_\text{match}, \quad \beta = 1.
$$

$\mathcal{L}_\text{conf}$ is DUSt3R's confidence-weighted pointmap regression loss (Eq. 7), with regularisation weight $\alpha = 0.2$. $\mathcal{L}_\text{match}$ is an InfoNCE contrastive matching loss (Eq. 10) with temperature $\tau = 0.07$, applied to the L2-normalised descriptor maps $D^1$, $D^2$; ground-truth correspondences are sampled from GT pointmaps (4096 pairs per image pair, padded with random negatives). For metric-scale datasets, the scale normalisation factors are set equal ($z := \hat{z}$), preserving absolute metric information in the regression target. The ablation (Table 1) shows that removing $\mathcal{L}_\text{conf}$ and training with $\mathcal{L}_\text{match}$ alone degrades median rotation error from 3.0° to 10.8°, confirming that 3D grounding is essential and the descriptor head alone does not replace the pointmap signal.

**Fast Reciprocal Matching (FRM).** Naive dense reciprocal nearest-neighbour matching over $D^1 \in \mathbb{R}^{H \times W \times d}$ and $D^2 \in \mathbb{R}^{H \times W \times d}$ has complexity $O(W^2H^2)$ — prohibitive at 512 px. MASt3R's FRM algorithm (§3.3) starts from $k \ll WH$ seed pixels sampled on a regular grid in $I^1$, then iteratively alternates NN$_2$ (nearest neighbour in $I^2$) and NN$_1$ (nearest neighbour back in $I^1$), collecting reciprocal matches and filtering converged seeds after each step (Eq. 15). Convergence to true reciprocal matches is guaranteed regardless of starting point (Corollary B.3). Complexity $O(kWH)$, which is $WH/k \gg 1$ times faster than the naive approach. At $k = 3000$ this yields a **64× speedup** over full matching while *improving* VCRE AUC on the Map-free benchmark (§4.2, Figure 3). The accuracy gain arises from basin-biased sampling: seeds in large convergence basins — positions with clear nearest-neighbour structure — are more likely to survive, producing spatially uniform match distributions that benefit RANSAC pose estimation (Appendix B.2).

**Coarse-to-fine for high-resolution inputs.** The ViT backbone's quadratic attention limits direct inference to 512-px inputs. For higher-resolution images (§3.4): (1) run coarse matching on a downscaled version to obtain $\mathcal{M}^{k_0}$; (2) tile each image into 512-px windows with 50% overlap; (3) greedily select window pairs covering 90% of coarse correspondences; (4) run MASt3R on each tile pair independently; (5) map tile-level matches back to full-resolution coordinates. Disabling this step increases Chamfer distance on DTU by roughly 4.7× and degrades Aachen Day-Night top-1 localization by up to 15% (Table 5, Appendix C).

# Implementations

Official PyTorch release from NAVER LABS Europe; both code and pretrained weights are released under CC-BY-NC-SA-4.0, which **prohibits commercial use**.

# Assessment

**Novelty.**

- Adds a dense local-feature prediction head (`Headdesc`, 2-layer GELU MLP, $d = 24$, L2-normalised) and an InfoNCE matching loss ($\tau = 0.07$) on top of DUSt3R's pointmap regression, making DUSt3R's 3D-grounded representations directly matchable at pixel accuracy.
- Introduces Fast Reciprocal Matching (FRM), an iterative seed-expansion algorithm that reduces the $O(W^2H^2)$ dense reciprocal matching problem to $O(kWH)$ while simultaneously improving RANSAC quality through basin-biased spatial coverage.

**Strengths.**

- State-of-the-art on Map-free relocalization (Table 2): 93.3% VCRE AUC versus 63.4% for LoFTR+KBR — a +30 percentage point absolute improvement — with a median translation error of 36 cm.
- Multi-view pose estimation (CO3Dv2 mAA(30) = 81.8 vs. DUSt3R pairwise 77.2; RealEstate10K mAA(30) = 76.4 vs. DUSt3R 61.2, a +15.2 point gain).
- Zero-shot MVS on DTU: Chamfer distance 0.374 mm versus DUSt3R's 1.741 mm — a 4.7× improvement from the same ViT backbone by adding pixel-accurate descriptors.
- Handles viewpoint differences up to 180° without any scene-specific fine-tuning, a regime where 2D-only matchers lose most matches.

## When to choose MASt3R over a 2D matcher

Choose MASt3R when: (a) viewpoint change between images is large (beyond ≈60°), (b) camera intrinsics are unknown and cannot be reliably estimated, (c) you need metric depth and correspondences simultaneously from a single pass, or (d) the scene is compact and calibration-free relocalization is the goal (Map-free setting). The +30% VCRE AUC advantage over LoFTR+KBR and the Aachen/InLoc competitive performance (Table 4) confirm its strength in these regimes.

Choose LoFTR or LightGlue instead when: latency is a hard constraint (MASt3R's ViT-Large backbone is substantially heavier), the application is commercial (CC-BY-NC-SA-4.0 prohibits it), or standard indoor/outdoor pose estimation with frontal viewpoints is sufficient (where 2D matchers are faster at comparable accuracy).

**Limitations.**

- Heavier compute than lightweight 2D matchers: the ViT-Large encoder plus coarse-to-fine tiling makes MASt3R unsuitable for real-time or on-device applications without significant engineering.
- Non-commercial CC-BY-NC-SA-4.0 license on both code and weights limits production deployment.
- Performance at scale degrades when only one retrieved database image is available (Table 4, Aachen InLoc top-1 at large scene scale), unlike compact Map-free scenes where top-1 retrieval is sufficient.
- Textureless and low-contrast regions remain a challenge: the InfoNCE loss rewards exact-pixel discrimination but has no signal where the scene is genuinely featureless, so matches may be absent or imprecise in those areas.

# References

1. V. Leroy, Y. Cabon, J. Revaud. *Grounding Image Matching in 3D with MASt3R.* ECCV, 2024. [arXiv 2406.09756](https://arxiv.org/abs/2406.09756)
2. S. Wang, V. Leroy, Y. Cabon, B. Chidlovskii, J. Revaud. *DUSt3R: Geometric 3D Vision Made Easy.* CVPR, 2024. [arXiv 2312.14132](https://arxiv.org/abs/2312.14132)
3. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* CVPR, 2021. [arXiv 2104.00680](https://arxiv.org/abs/2104.00680)
