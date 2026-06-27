---
paper_id: wang2025-vggt
title: "VGGT: Visual Geometry Grounded Transformer"
authors: [Jianyuan Wang, Minghao Chen, Nikita Karaev, Andrea Vedaldi, Christian Rupprecht, David Novotný]
year: 2025
url: https://arxiv.org/abs/2503.11651
created: 2026-06-27
relevant_atlas_pages: [epipolar-geometry, pose-estimation, bundle-adjustment, pinhole-camera-model]
---

# Setting

**Problem class:** Multi-view 3D reconstruction from unconstrained in-the-wild image sets.

**Inputs:** A sequence (I_i)^N_{i=1} of N RGB images I_i ∈ R^{3×H×W} observing the same 3D scene. N can range from 1 to hundreds. No known camera parameters required at inference. Principal point is assumed at image center (§3.1).

**Outputs (per frame, in a single forward pass):**

- Camera parameters g_i ∈ R^9: rotation quaternion q_i ∈ R^4, translation vector t_i ∈ R^3, field-of-view f_i ∈ R^2 (§3.1 parameterization from VGGSfM [125]).
- Depth map D_i ∈ R^{H×W}: per-pixel depth in the coordinate frame of camera g_i.
- Point map P_i ∈ R^{3×H×W}: per-pixel 3D scene point in the *first camera's world coordinate frame* (viewpoint-invariant, as in DUSt3R [129]).
- Tracking features T_i ∈ R^{C×H×W}: dense feature grid consumed by a CoTracker2-style tracking head to produce 2D point tracks across frames.
- Aleatoric uncertainty maps Σ^D_i ∈ R^{H×W}_{+} and Σ^P_i ∈ R^{H×W}_{+} for depth and point predictions respectively (§3.3).

**Key guarantee over prior work:** No test-time optimization, no global alignment, no bundle adjustment required for competitive results. DUSt3R and MASt3R require pairwise forward passes + expensive global alignment; VGGT processes all N views in a single forward pass.

# Core idea

VGGT is a large Vision Transformer trained to jointly regress all 3D quantities directly from pixels. The network function (Eq. 1) is:

```
f( (I_i)^N_{i=1} ) = (g_i, D_i, P_i, T_i)^N_{i=1}
```

**Alternating-Attention (AA) backbone** (§3.2): 24 transformer blocks, each block containing one frame-wise self-attention layer (attends only within each frame's own tokens) followed by one global self-attention layer (attends across all frames jointly). No cross-attention. This alternation is the sole 3D inductive bias in the architecture — it enforces per-image normalization while allowing inter-frame information fusion, and it scales sub-quadratically with frame count compared to full cross-attention.

**Token design:** Each image I_i is patchified into K tokens t^I_i ∈ R^{K×C} via a frozen DINOv2 ViT-L encoder (§3.2; Appendix B confirms ViT-L hidden dim 1024, 16 heads, positional embedding added). Per frame, one learnable camera token t^g_i ∈ R^{1×C} and four register tokens t^R_i ∈ R^{4×C} are appended (§3.3; register tokens from [19]). The first frame uses *distinct* learnable tokens (t^{g,1} ≠ t^g, t^{R,1} ≠ t^R) to anchor the world coordinate frame.

**Prediction heads** (§3.3):
- *Camera head*: output camera tokens (t̂^g_i)^N_{i=1} pass through 4 additional self-attention layers + linear projection → (g_i, intrinsics, extrinsics). First frame's extrinsics fixed to identity (q_1=[0,0,0,1], t_1=[0,0,0]).
- *Dense head*: output image tokens t̂^I_i → DPT upsampling [87] (fed tokens from DINOv2 blocks 4, 11, 17, 23) → feature maps F_i ∈ R^{C'×H×W} → 3×3 conv → D_i, P_i, T_i, Σ^D_i, Σ^P_i.
- *Tracking head*: CoTracker2 architecture [57] takes T_i features; bilinear sampling at query point y_q, correlation maps over all frames, self-attention → 2D tracks and visibility logits.

**Over-complete prediction insight** (§3.1 and §4.3): P_i, D_i, and g_i are mathematically redundant (point maps can be derived from depth + camera via unprojection; cameras recoverable from point maps via PnP). Yet multi-task training with all heads improves each individually. Crucially, *at inference*, constructing point clouds from the depth head + camera head yields lower ETH3D Chamfer error (0.677 Overall) than using the dedicated point map head directly (0.709 Overall) — decomposing into simpler subproblems outperforms the unified head.

**Scale and compute:** ~1.2B parameters total (§3.4 implementation). Camera head is lightweight (~5% of backbone runtime). DPT head ~0.03s per frame and ~0.2 GB GPU memory per frame.

# Assumptions

1. (hard) Perspective projection with pinhole model; principal point at image center. Fisheye and panoramic images are not supported.
2. (soft) Static scene or minor non-rigid motion only. Large non-rigid deformations cause failures. Model scenes as surface S_i ⊂ R^3 that can vary per frame [151] (Appendix A), which handles mild dynamics.
3. (soft) Reasonable overlap or spatial proximity is beneficial for multi-view mode. The model succeeds on non-overlapping frames (Fig. 3 two-view example) but performance degrades with extreme viewpoint changes / rotations.
4. (hard) Input resolution bounded; images are isotropically resized so max dimension ≤ 518 px at training. Arbitrary aspect ratios supported (randomized 0.33–1.0 during training).
5. (soft) First image is used as the world reference frame; permutation equivariant for all other frames. Arbitrary ordering otherwise.
6. (soft) No explicit temporal ordering assumed; tracker does not require video sequences — any unordered image set is valid input.

# Failure regime

- **Fisheye / panoramic images:** Model was trained exclusively on standard perspective images; fisheye distortion violates the pinhole assumption (§5 Limitations).
- **Extreme rotations:** Reconstruction quality drops sharply under large viewpoint changes. Likely because training distributions have bounded baseline angles.
- **Large non-rigid deformation:** Model fails for scenes with substantial dynamic content (e.g., people walking, deforming objects). Minor non-rigid motion is tolerated.
- **Two-view only (as DUSt3R/MASt3R):** VGGT was explicitly designed to process many views simultaneously; forcing it to process pairs provides less context, though it still outperforms DUSt3R/MASt3R pairwise baselines at feed-forward inference.
- **Memory:** 200-frame batch requires ~40.6 GB GPU memory on H100 (Tab. 9). For memory-constrained deployments, DPT heads can be run frame-by-frame (inter-frame reasoning is all in the backbone).

# Numerical sensitivity

- **Coordinate normalization** (§3.4): Ground truth is normalized to first-camera frame then scaled by mean Euclidean distance of 3D points. Unlike DUSt3R, this normalization is *only* applied to targets — the network learns it, not enforced on predictions. Attempting to normalize network outputs directly "introduces additional instability" (§5).
- **Depth/point map loss α hyperparameter**: The uncertainty-weighted losses include `- α log Σ_i` regularization term; α value not reported explicitly in text. ? (not found in paper sections read)
- **bfloat16 training**: Used for memory/speed efficiency; gradient checkpointing and grad norm clipping (threshold 1.0) ensure stable bfloat16 training (§3.4).
- **QKNorm and LayerScale**: QKNorm [48] applied per attention layer to stabilize training (especially important for deep ViT-L scale models). LayerScale [115] initialized at 0.01 (Appendix B).
- **DINOv2 tokenizer vs raw conv**: Preliminary experiments showed 14×14 conv tokenizer was significantly less stable during early training; DINOv2 is "less sensitive to variations in hyperparameters such as learning rate or momentum" (§5 Discussion).

# Applicability

- **Use when:** Recovering camera poses + dense geometry from 1–hundreds of unconstrained images in a single forward pass. Especially well-suited for: in-the-wild scenes, non-overlapping or texture-less regions (oil paintings, deserts), scenarios where optimization post-processing is too slow (robotics, interactive applications, real-time previews).
- **Don't use when:** Fisheye/360° cameras; heavy non-rigid motion; very-high-resolution requirements beyond 518 px max dimension without fine-tuning; commercial applications (non-commercial license only).
- **Compared against:** DUSt3R (pairwise pointmap, global alignment required), MASt3R (matcher+reconstructor, global alignment required), VGGSfM v2 (end-to-end differentiable SfM with BA), COLMAP (classical incremental SfM). VGGT in feed-forward mode beats DUSt3R and MASt3R; competitive with VGGSfM v2 which uses BA. VGGT + optional BA further surpasses all.

**Key headline benchmark numbers** (provenance: §4, Tables 1–3, 10):

| Benchmark | VGGT ff | VGGT+BA | DUSt3R | MASt3R | VGGSfMv2 | Time (VGGT ff) |
|---|---|---|---|---|---|---|
| Re10K AUC@30 | 85.3 | 93.5 | 67.7 | 76.4 | 78.9 | 0.2s |
| CO3Dv2 AUC@30 | 88.2 | 91.8 | 76.7 | 81.8 | 83.4 | 0.2s |
| ETH3D Overall↓ | 0.677 | — | 1.005 | 0.826 | — | 0.2s |
| DTU Overall↓ | 0.382 | — | 1.741 | n/a¹ | — | 0.2s |
| IMC AUC@10° | 71.26 | 84.91 | 35.62 | 57.42 | 76.82 | 0.2s |

¹MASt3R on DTU uses known GT cameras for triangulation; shown in top section of Table 2.

**Runtime scaling** (Tab. 9, single H100, flash attention v3, 336×518 images):

| Frames | 1 | 2 | 4 | 10 | 50 | 100 | 200 |
|---|---|---|---|---|---|---|---|
| Time (s) | 0.04 | 0.05 | 0.07 | 0.14 | 1.04 | 3.12 | 8.75 |
| Mem (GB) | 1.88 | 2.07 | 2.45 | 3.63 | 11.41 | 21.15 | 40.63 |

**Post-VGGT note:** Depth Anything 3 (lin2025-depth-anything-3) later surpasses VGGT on the any-view geometry benchmark by approximately 44% pose improvement and 25% geometry improvement. VGGT was the prior SOTA when published.

# Connections

- **Builds on:**
  - `wang2023-dust3r` — pioneered feed-forward pointmap regression from image pairs; VGGT extends this to N views without pairwise + global alignment, and adds camera/depth/tracking heads.
  - `leroy2024-mast3r` — matcher+reconstructor on DUSt3R; VGGT outperforms its feed-forward output on all benchmarks; MASt3R's architecture influenced the training data recipe.
  - `oquab2023-dinov2` — DINOv2 ViT-L is the image tokenizer; frozen DINOv2 provides stable, semantically rich patch tokens that outperform raw convolutional patchification in both performance and training stability.
  - CoTracker2 [57] — tracking head architecture directly imported from CoTracker2.

- **Generalized by / surpassed by:**
  - `lin2025-depth-anything-3` — DA3 achieves substantially better performance on the any-view 3D geometry benchmark after VGGT was published.

- **Enables / downstream demonstrated in paper:**
  - Feed-forward novel view synthesis (NVS) fine-tuning (Tab. 7, §4.6): VGGT backbone fine-tuned with Plücker-ray target encoding achieves PSNR 30.41 on GSO, comparable to LVSM despite no input camera parameters and only 20% of training data.
  - Dynamic point tracking via feature transfer: CoTracker + VGGT pretrained backbone boosts TAP-Vid δ^vis_avg from 78.9 → 84.0 on RGB-S (Tab. 8).

# Atlas update plan

## NEW: vggt
Type: model
Domain: geometry
arch_family: vit
Primary source: this paper

**Goal:** One large feed-forward transformer that, given 1–hundreds of views, predicts all key 3D quantities (camera intrinsics+extrinsics, depth maps, point maps, 3D point tracks) in one forward pass in under a second — eliminating the optimization post-processing that DUSt3R/MASt3R/VGGSfM require.

**Architecture:**
- Alternating-Attention (AA) transformer: 24 blocks alternating frame-wise self-attention and global self-attention; ViT-L scale (1024-dim, 16 heads, ~1.2B params total).
- DINOv2 ViT-L tokenizer; tokens from blocks 4, 11, 17, 23 fed into DPT decoder for dense prediction.
- Per-frame camera token (1×C) + 4 register tokens; first frame uses distinct learnable tokens to anchor the world coordinate frame.
- Camera head: 4 additional self-attention layers + linear → quaternion/translation/FoV per frame.
- Dense head: DPT → 3×3 conv → depth, point maps, tracking features; plus aleatoric uncertainty maps Σ^D, Σ^P.
- Tracking head: CoTracker2 architecture on dense tracking features.
- Key ablation: AA beats global-only self-attention (ETH3D 0.709 vs 0.827) and cross-attention (0.709 vs 1.061).

**Training:**
- Multi-task loss: L = L_camera + L_depth + L_pmap + 0.05 × L_track (Eq. 2).
- L_camera: Huber loss on camera parameters. L_depth / L_pmap: aleatoric uncertainty-weighted loss with image-gradient term. L_track: L2 on 2D correspondence + BCE visibility.
- Multi-task learning is essential: removing any one head degrades point-map quality by 0.08–0.12 ETH3D Chamfer (Tab. 6).
- 160K iters, AdamW, cosine LR peak 0.0002, warmup 8K, 64 A100 GPUs × 9 days, bfloat16, grad clip 1.0.
- 15+ diverse datasets (Co3Dv2, MegaDepth, ScanNet, DL3DV, Kubric, PointOdyssey, Virtual KITTI, Aria Synthetic Environments, Objaverse-like synthetic, and others).

**Implementations:**
- Repo: https://github.com/facebookresearch/vggt
- License: VGGT License v1 — NON-COMMERCIAL research use only.

**Assessment:**
- CVPR 2025 Best Paper award.
- First model to process 1–hundreds of views in a single forward pass without optimization.
- Feed-forward VGGT at 0.2s beats DUSt3R (~7s) and MASt3R (~9s) on all benchmarks; competitive with VGGSfMv2 (~10s+BA).
- VGGT+BA (1.8s) achieves new SOTA on IMC at time of publication (AUC@10° 84.91% vs VGGSfMv2 76.82%).
- Non-commercial license restricts production deployment.
- Surpassed on any-view geometry benchmark by Depth Anything 3 (lin2025-depth-anything-3) after publication.

## UPDATE: bundle-adjustment
Section: Relations / context
Note that VGGT demonstrates competitive feed-forward performance *without* BA, and can serve as a strong initialization for a subsequent fast BA pass (eliminating triangulation). VGGT+BA reaches SOTA on IMC (AUC@10° 84.91%) in only 1.8s total, vs ~10s+ for traditional BA-reliant methods.

## UPDATE: pose-estimation
Section: Feed-forward regression approaches
VGGT (CVPR 2025) achieves AUC@30 of 85.3% (Re10K) / 88.2% (CO3Dv2) in 0.2s feed-forward, outperforming all prior methods including optimization-based ones. See `vggt` model page.

# Provenance

- §Abstract, Fig. 1: "predicts cameras, point maps, depth maps, and point tracks for all images at once in less than a second" — establishes single-pass claim and output modalities.
- §3.1, Eq. 1: f((I_i)^N) = (g_i, D_i, P_i, T_i)^N — official problem formulation. Camera parameterization g = [q, t, f] from VGGSfM [125].
- §3.2: "we employ L = 24 layers of global and frame-wise attention" — layer count. DINOv2 tokenization: "patchifying images into tokens by DINO" — §3.2 and §5 discussion on stability.
- §3.3: Camera token + 4 register tokens per frame; first-frame learnable tokens; DPT head; CoTracker2 tracking head; aleatoric uncertainty heads Σ^D_i, Σ^P_i.
- §3.4, Eq. 2: Multi-task loss L = L_camera + L_depth + L_pmap + λL_track, λ = 0.05.
- §3.4: Camera Huber loss; depth loss with gradient term and aleatoric weighting; pmap loss analogous; tracking L2 + BCE visibility. Training: AdamW, 160K iter, peak LR 0.0002, warmup 8K, 64 A100 × 9 days, bfloat16, grad clip 1.0.
- §3.4 Ground truth normalization: normalize to first-camera frame, scale by mean 3D point distance. Not applied to predictions (different from DUSt3R).
- §4.1, Tab. 1: Camera pose Re10K / CO3Dv2 AUC@30 numbers (VGGT ff: 85.3/88.2, +BA: 93.5/91.8, MASt3R: 76.4/81.8, DUSt3R: 67.7/76.7, VGGSfMv2: 78.9/83.4; timing on H100).
- §4.2, Tab. 2: DTU dense MVS — VGGT 0.382 Overall without GT camera vs DUSt3R 1.741.
- §4.3, Tab. 3: ETH3D point map — VGGT (Depth+Cam) 0.677 vs VGGT (Point) 0.709 vs DUSt3R 1.005.
- §4.5, Tab. 5: AA ablation (ETH3D): AA 0.709, global-only 0.827, cross-attention 1.061.
- §4.5, Tab. 6: Multi-task ablation showing all losses needed.
- §4.6, Tab. 7: NVS on GSO — VGGT-NVS PSNR 30.41/SSIM 0.949/LPIPS 0.033.
- §4.6, Tab. 8: Dynamic tracking TAP-Vid — CoTracker+VGGT δ^vis_avg 84.0 vs CoTracker alone 78.9 on RGB-S.
- Tab. 9: Runtime / memory table (H100, flash attention v3, 336×518).
- Appendix B: ViT-L architecture (1024-dim, 16 heads), QKNorm, LayerScale init 0.01, DINOv2 blocks {4,11,17,23} fed to DPT, 48 frames per batch, 2–24 frames per scene.
- Appendix C, Tab. 10: IMC benchmark — VGGT ff 71.26%, VGGT+BA 84.91% AUC@10°.
- §5 Limitations: no fisheye, fails under extreme rotations and large non-rigid deformations.
- Code/license: https://github.com/facebookresearch/vggt (stated in Abstract and §1).
