---
title: "VGGT (Visual Geometry Grounded Transformer)"
date: 2026-06-27
summary: "A large feed-forward transformer that predicts cameras, depth maps, point maps and 3D point tracks for one to hundreds of views in a single pass, removing the optimization and global-alignment post-processing that pairwise pointmap methods require."
tags: ["deep-learning", "two-view-geometry", "pose-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "~1.2B"
prerequisites: [epipolar-geometry, pose-estimation, bundle-adjustment, vit, attention-mechanism, feed-forward-3d-reconstruction]
sources:
  primary: wang2025-vggt
  references:
    - wang2023-dust3r
    - leroy2024-mast3r
    - oquab2023-dinov2
relations:
  - type: generalized_by
    target: depth-anything-3
    confidence: medium
    caution: "DA3 surpasses VGGT on the any-view benchmark (+44% pose, +25% geometry) and adds pose-conditioned input; VGGT remains a strong, widely-used feed-forward baseline."
implementations:
  - role: official
    repo: https://github.com/facebookresearch/vggt
    commit: a288dd0f14786c93483e45524328726ab7b1b4ce
    framework: pytorch
    license: "VGGT License v1 (non-commercial research)"
    weights_license: "VGGT License v1 (non-commercial research)"
---

# Motivation

Takes a sequence of $N$ RGB images $(I_i)_{i=1}^N$, where $N$ ranges from one to hundreds, observing the same scene with no known camera parameters, and in a single forward pass produces, for every frame: camera parameters $g_i = (q_i, t_i, f_i) \in \mathbb{R}^9$ (rotation quaternion, translation, field-of-view), a per-pixel depth map $D_i$, a per-pixel 3D point map $P_i$ expressed in the first camera's world frame, and dense tracking features $T_i$ consumed by a point-track head. The defining property is the elimination of any test-time optimization, global alignment, or bundle adjustment: DUSt3R and MASt3R require a separate pairwise forward pass for every image pair followed by an expensive global alignment step to lift the result to a shared coordinate frame, whereas VGGT processes all $N$ views jointly and returns a globally consistent output in a single network evaluation.

# Architecture

**Family & shape.** Pure transformer at ViT-L scale. Input: $N$ RGB images, each isotropically resized so the longest dimension does not exceed 518 px (arbitrary aspect ratios supported). Outputs per frame: $g_i \in \mathbb{R}^9$, $D_i \in \mathbb{R}^{H \times W}$, $P_i \in \mathbb{R}^{3 \times H \times W}$, $T_i \in \mathbb{R}^{C' \times H \times W}$, plus aleatoric uncertainty maps $\Sigma^D_i$ and $\Sigma^P_i$.

**Blocks.** The backbone is an Alternating-Attention (AA) transformer of $L = 24$ blocks (§3.2). Each block consists of one frame-wise self-attention layer — attending only within each frame's own token set — followed by one global self-attention layer that attends across all frames simultaneously. No cross-attention is used; the alternating pattern is the sole 3D inductive bias and scales sub-quadratically with frame count compared to full all-pairs cross-attention.

```mermaid
flowchart LR
    Tok["DINOv2 patch tokens\n+ camera + register"] --> FW["Frame-wise\nself-attention"]
    FW --> GL["Global\nself-attention"]
    GL --> Heads["Camera / Dense\n/ Track heads"]
```

Each image $I_i$ is patchified by a frozen DINOv2 ViT-L encoder (hidden dim 1024, 16 heads) into $K$ patch tokens. Per frame, one learnable camera token $t^g_i \in \mathbb{R}^{1 \times C}$ and four register tokens $t^R_i \in \mathbb{R}^{4 \times C}$ are appended (§3.3). The first frame uses distinct learnable tokens ($t^{g,1}$ and $t^{R,1}$) to anchor the world coordinate frame; the first frame's extrinsics are fixed to identity at inference.

Three prediction heads read the backbone outputs:

- *Camera head.* Output camera tokens $\hat{t}^g_i$ pass through 4 additional self-attention layers and a linear projection to produce $g_i = (q_i, t_i, f_i)$ — rotation quaternion, translation, and two-axis field-of-view — parameterised following VGGSfM (§3.1).
- *Dense head.* Output image tokens $\hat{t}^I_i$ are decoded by a DPT upsampler (fed intermediate tokens from DINOv2 blocks 4, 11, 17, and 23) followed by a $3 \times 3$ convolution, yielding $D_i$, $P_i$, $T_i$, $\Sigma^D_i$, and $\Sigma^P_i$.
- *Tracking head.* A CoTracker2 architecture consumes $T_i$ features, producing 2D point tracks and visibility logits across frames.

An important over-parameterization result (§4.3, Table 3): $P_i$, $D_i$, and $g_i$ are mathematically redundant — point maps can be derived from depth plus cameras via unprojection, and cameras are recoverable from point maps via PnP. Yet training all heads jointly improves each one. At inference, composing the depth head with the camera head yields lower ETH3D Chamfer error (0.677 Overall) than the dedicated point map head alone (0.709 Overall), confirming that decomposing into simpler subproblems outperforms the unified head for dense geometry.

**Training.** The multi-task loss is (Eq. 2, §3.4):

:::definition[VGGT multi-task loss]
Four losses are summed with a fixed tracking weight $\lambda = 0.05$:

$$
\mathcal{L} = \mathcal{L}_\text{camera} + \mathcal{L}_\text{depth} + \mathcal{L}_\text{pmap} + 0.05\,\mathcal{L}_\text{track}.
$$

$\mathcal{L}_\text{camera}$ is a Huber loss on camera parameters. $\mathcal{L}_\text{depth}$ and $\mathcal{L}_\text{pmap}$ are aleatoric uncertainty-weighted losses with an image-gradient term. $\mathcal{L}_\text{track}$ combines an $\ell_2$ loss on 2D correspondences with a BCE loss on visibility logits.
:::

Ground truth is normalized to the first-camera frame and scaled by the mean Euclidean distance of 3D points; this normalization is applied to training targets only — enforcing it on network outputs "introduces additional instability" (§5). Training stability is further supported by QKNorm per attention layer and LayerScale initialized at 0.01 (Appendix B). The multi-task ablation (Table 6, §4.5) shows that removing any single loss degrades point-map quality by 0.08–0.12 ETH3D Chamfer units.

Training runs for 160 K iterations with AdamW (peak LR $2 \times 10^{-4}$, cosine schedule, 8 K warmup steps), bfloat16 mixed precision, gradient norm clipping at 1.0, and 48 frames per batch drawn from 2–24 frames per scene. Hardware: 64 A100 GPUs over 9 days. The training corpus spans 15+ datasets including Co3Dv2, MegaDepth, ScanNet, DL3DV, Kubric, PointOdyssey, Virtual KITTI, Aria Synthetic Environments, and Objaverse-like synthetics.

**Complexity.** Approximately 1.2 B parameters (§3.4). Input capped at 518 px per dimension. DPT dense head adds approximately 0.03 s and 0.2 GB GPU memory per frame. At 200 frames on an H100 with flash attention v3 at 336×518 resolution: 8.75 s and 40.6 GB GPU memory (Table 9).

# Implementations

Official PyTorch release from Facebook Research; all code and weights are distributed under the VGGT License v1 for non-commercial research use only.

# Assessment

**Novelty.**

- Replaces the DUSt3R/MASt3R pairwise-pointmap-plus-global-alignment pipeline with a single feed-forward network that processes 1–hundreds of views at once, producing globally consistent camera poses and geometry without any post-processing optimization step.
- The Alternating-Attention design — interleaved frame-wise and global self-attention — provides the necessary inter-frame information fusion while scaling more favourably than full all-pairs cross-attention as frame count grows (AA vs cross-attention: ETH3D 0.709 vs 1.061, Table 5 §4.5).
- Joint multi-task training of camera, depth, point-map, and track heads yields a self-consistent geometric representation; the over-parameterization (depth+camera and point maps are both predicted) provably reduces dense geometry error relative to predicting point maps alone.

**Strengths.**

- Camera-pose accuracy (feed-forward, H100, ~0.2 s): Re10K AUC@30 85.3%, CO3Dv2 AUC@30 88.2% — versus DUSt3R 67.7%/76.7% and MASt3R 76.4%/81.8% (Table 1, §4.1). Dense geometry: DTU Overall 0.382 versus DUSt3R 1.741 (Table 2, §4.2); ETH3D Overall 0.677 (Table 3, §4.3).
- Seconds-scale runtime for many views: 50 frames in 1.04 s, 100 frames in 3.12 s, 200 frames in 8.75 s on a single H100 (Table 9) — far faster than DUSt3R (~7 s) or MASt3R (~9 s) which still require global alignment after pairwise passes.
- Adding an optional fast BA pass (VGGT+BA, total 1.8 s) achieves IMC AUC@10° 84.91% versus VGGSfMv2 76.82% — SOTA at the time of publication (Appendix C, Table 10).
- Effective on challenging inputs: non-overlapping frames, textureless surfaces (oil paintings, deserts), and unordered image sets where temporal ordering is absent.

**Limitations.**

- Memory scales with frame count: 200-frame inference requires ~40.6 GB on an H100 (Table 9); deployments with hundreds of views need careful batching of the DPT head (inter-frame reasoning is completed in the backbone, so the dense head can be run per-frame).
- Pinhole-only assumption with principal point fixed at image center (§3.1, §5 Limitations); fisheye and panoramic cameras are not supported.
- Performance degrades under extreme viewpoint changes or large non-rigid deformations; the model was trained on standard perspective images with bounded baseline angles.
- The non-commercial VGGT License v1 prohibits commercial deployment, restricting practical adoption in product contexts.
- Subsequently surpassed on the any-view 3D geometry benchmark by Depth Anything 3 (approximately +44% pose improvement and +25% geometry improvement per post-publication benchmarking); VGGT was the prior SOTA at CVPR 2025 publication.

# References

1. J. Wang, M. Chen, N. Karaev, A. Vedaldi, C. Rupprecht, D. Novotný. *VGGT: Visual Geometry Grounded Transformer.* CVPR, 2025. [arXiv:2503.11651](https://arxiv.org/abs/2503.11651)
2. S. Wang, V. Leroy, Y. Cabon, B. Chidlovskii, J. Revaud. *DUSt3R: Geometric 3D Vision Made Easy.* CVPR, 2024.
3. V. Leroy, Y. Cabon, J. Revaud. *MASt3R: Grounding Image Matching in 3D with MASt3R.* 2024.
4. M. Oquab et al. *DINOv2: Learning Robust Visual Features without Supervision.* TMLR, 2024.
