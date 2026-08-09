---
paper_id: lin2025-depth-anything-3
title: "Depth Anything 3: Recovering the Visual Space from Any Views"
authors: [Haotong Lin, Sili Chen, Junhao Liew, Donny Y. Chen, Zhenyu Li, Guang Shi, Jiashi Feng, Bingyi Kang]
year: 2025
url: https://arxiv.org/abs/2511.10647
created: 2026-06-27
relevant_atlas_pages: [vit, mae, pose-estimation, epipolar-geometry, bundle-adjustment, pinhole-camera-model]
---

# Setting

**Problem class:** Recovering spatially consistent 3D geometry (depth + camera pose) from an arbitrary number of input images, without requiring known camera parameters. Secondary settings: pose-conditioned inference when cameras are known; monocular depth (N=1); metric depth; feed-forward novel view synthesis via 3D Gaussian splatting.

**Inputs:** N ≥ 1 RGB images I_i ∈ R^(H×W×3), optionally paired with camera parameters (K_i, R_i, t_i). No minimum or maximum view count enforced at inference; tested up to 4000+ images on a single GPU (Table 8, §7.2.3). No calibration target required.

**Outputs per image:**
- Depth map D_i ∈ R^(H×W) (scale-consistent across views)
- Ray map M_i ∈ R^(H×W×6) — per-pixel ray origin (3 channels) and direction (3 channels) in a common world frame
- Optional: 9-DoF camera pose ĉ_i = (t_i, q_i, f_i) from a lightweight camera head

Outputs can be combined to form globally consistent point clouds: P(u,v) = t + D(u,v) · d.

# Core idea

Two central claims drive the design: (1) a single plain transformer (vanilla DINOv2 encoder, no architectural modifications) suffices as the backbone; (2) a **depth-ray** prediction target — depth map + per-pixel ray map — is a minimal sufficient representation for recovering both scene geometry and camera pose, obviating complex multi-task designs with point maps, explicit pose heads, or separate depth and pose networks.

The depth-ray representation encodes camera pose implicitly. For each pixel p, the ray r ∈ R^6 is defined as r = (t, d), where t ∈ R^3 is the per-pixel ray origin (constant across pixels within one view, equal to the camera center) and d ∈ R^3 is the direction obtained by backprojecting p and rotating to world frame: d = R K^{-1} p. The dense ray map M ∈ R^(H×W×6) stores these parameters for all pixels. A 3D point is then simply recovered as P = t + D(u,v) · d — a pixel-level element-wise operation between the depth and ray maps.

Camera intrinsics and extrinsics are recoverable from the predicted ray map at inference. The camera center t_c is estimated by averaging per-pixel ray origin vectors. Focal length and rotation are recovered by fitting a DLT-based homography between the predicted ray directions M(:,:,3:) and canonical rays from an identity-intrinsics camera K_I = I (where d_I = K_I^{-1} p = p), then QR-decomposing the result to extract K and R (§3.1, derivation in body text). This recovery is computationally nontrivial, motivating the optional lightweight camera head D_C that directly regresses the 9-DoF pose c = (t, q, f).

Cross-view reasoning is achieved without modifying the DINOv2 architecture. The L transformer blocks are partitioned into two groups of sizes L_s and L_g (ratio L_s:L_g = 2:1). The first L_s blocks apply standard within-view self-attention. The subsequent L_g blocks alternate between cross-view and within-view attention by rearranging the token tensor across the view batch dimension at alternating layers — no new attention kernel is introduced. With N=1 the model reduces to monocular depth without extra cost.

# Assumptions

1. **Static scenes.** The depth-ray representation assumes a single consistent world frame; dynamic objects violate cross-view depth-ray consistency. (Stated as future work direction, §8.)
2. **Photometric calibration is not required.** No assumption on lens distortion or sensor response; DA3 handles in-the-wild images.
3. **No pose input required** (soft). The model operates pose-free; known poses are an optional condition, injected via a camera token. When unavailable, a shared learnable token cl is used, providing a consistent placeholder but no geometric prior.
4. **View ordering is irrelevant** (soft). Cross-view attention rearranges tokens globally; no sequential ordering is assumed. Ablation (Table 7) shows this is effective.
5. **Scene scale is estimated implicitly** from training data distribution; outputs are metrically consistent within a scene but not absolutely metric unless the metric-depth variant (§4.4) is used.
6. **Teacher pseudo-labels are more reliable than real-world sensor depth** (§4, Fig. 4). The paradigm fails gracefully — supervision transitions from GT to teacher labels only after 120k steps, and teacher labels are RANSAC-aligned to available sparse metric measurements.

# Failure regime

- **Computationally costly at very large N on small GPUs.** DA3-Giant handles ~900–1000 images on 80 GB A100; DA3-Small scales to ~4000 images (Table 8). Intermediate tokens can be offloaded to CPU memory for larger scenes.
- **Recovery of camera from ray map is expensive at inference.** The DLT + QR decomposition step is identified as computationally costly (§3.1, body text). Addressed by the auxiliary camera head D_C which adds ~0.1% FLOPs and is included in the final model.
- **Performance degrades on very low-resolution images with severe motion blur.** 7Scenes (low-res, heavy blur) is the weakest dataset for all models including DA3-Giant; AUC3 28.5 vs VGGT 23.9 — the smallest margin (Table 2). Pose conditioning gains are also smaller there (Table 7, items f-g).
- **Teacher supervision slightly hurts metric accuracy on clean benchmarks (NYU, KITTI).** Removing teacher supervision improves NYUv2 δ1 (0.969 vs 0.966) and KITTI δ1 (0.965 vs 0.947) for the metric model, while improving sharpness visually (§7.4, Table 11, Fig. 10). This reflects a precision/detail tradeoff in pseudo-label quality.
- **No stated failure mode for textureless or reflective surfaces** — these are a known adversary for depth estimation but are not ablated in the paper. ?
- **Dynamic scenes not supported.** Acknowledged as future work (§8).

# Numerical sensitivity

- **Scale normalization before loss computation** (§3.3): All ground-truth signals are normalized by a common scale factor defined as the mean ℓ2 norm of valid reprojected point maps P. This step ensures consistent magnitude across modalities and stabilizes training.
- **RANSAC alignment for teacher→student depth transfer** (Eq. 8): The scale s and shift t are estimated by RANSAC least-squares with inlier threshold equal to the mean absolute deviation from the residual median. This is robust to the large outlier fraction typical of COLMAP and LiDAR-sparse real-world depth.
- **Exponential depth** in teacher model (§4.1): Unlike DA2 (scale-shift-invariant disparity), DA3's teacher predicts exponential depth (rather than linear depth) to improve discrimination at small distances where disparity is insensitive.
- **Base resolution 504×504** (§3.4): Chosen because 504 is divisible by 2, 3, 4, 6, 9, and 14, making it compatible with common photo aspect ratios (2:3, 3:4, 9:16) and with DINOv2's patch size of 14.
- **View count sampling [2, 18] during training** at 504×504; batch size dynamically adjusted to keep token count per step approximately constant (§3.4).
- **Peak learning rate 2×10^{-4}**, 8k-step warm-up, 200k total steps on 128 H100s (§3.4).
- **Dual-DPT head is critical**: removing it (Table 7, row d) drops HiRoom AUC3 from 39.2 to 5.59 and F1 from 47.0 to 11.5 — an 86% collapse in pose accuracy — confirming that the shared reassembly stage is essential for depth-ray alignment.

# Applicability

- **Use when:** generalizing across scenes without calibration; any-view depth + pose from in-the-wild video frames or unordered multi-view image sets; feed-forward 3D reconstruction without bundle adjustment.
- **Don't use when:** metric absolute depth is required without additional calibration (use DA3-Metric variant); real-time per-frame monocular inference is sufficient and multi-view consistency is not needed (standard DA2 student is faster); dynamic scenes with moving objects dominate (no mechanism to handle deformable geometry).
- **Compared against:** VGGT [wang2025-vggt], DUSt3R [wang2024-dust3r], MASt3R [leroy2024-mast3r], Fast3R, Pi3, MapAnything (§7.1). For monocular depth: DA2 [yang2024-depth-anything-v2], MiDaS [ranftl2020-midas].

# Connections

- **Builds on:** `yang2024-depth-anything-v2` (teacher model architecture, pseudo-label training paradigm, monocular student recipe); `oquab2023-dinov2` (backbone, no modification); `wang2024-dust3r` (founded the feed-forward pose+depth paradigm, point-map regression predecessor); `leroy2024-mast3r` (same direction, matching-enhanced); `wang2025-vggt` (direct SOTA baseline — DA3 surpasses it at smaller scale); `ranftl2020-midas` (generalist monocular depth lineage).
- **Enables:** feed-forward 3DGS / novel view synthesis (demonstrated as §5 application); future dynamic scene geometry models (§8).
- **Refutes / supersedes:** VGGT as SOTA on the proposed visual geometry benchmark (pose + geometry + rendering); DA2 as SOTA on standard monocular depth benchmarks (DA3-monocular student surpasses DA2 student, Table 10).

# Atlas update plan

## NEW: depth-anything-3

**Type:** model

**Category:** `domain: features` (nearest analog — DINOv2 ViT foundation model family). Gap: no `depth-estimation` or `reconstruction` domain exists in the atlas yet. At page-authoring time, consider creating a `reconstruction` or `depth-geometry` domain to cover DA3, VGGT, DUSt3R, and future visual geometry models.

**Primary source:** this paper (lin2025-depth-anything-3)

**Motivation:**
- Specialized 3D vision models (SfM, MVS, monocular depth, SLAM) share conceptual overlap but were built separately. DA3 asks: can one plain transformer cover all cases?
- Prior unified models (DUSt3R, VGGT) use bespoke multi-transformer stacks trained from scratch, foregoing pretrained ViT features. DA3 shows pretrained DINOv2 + minimal cross-view adaptation beats task-specific architectures at smaller parameter count.
- Key design choice: depth-ray as a minimal sufficient prediction target eliminates multi-task loss engineering over point maps, pose heads, and depth heads simultaneously.

**Architecture:**
- **Backbone:** Vanilla DINOv2 ViT, no architectural modifications. Four model sizes: Giant (1.130B params), Large (0.300B), Base (0.086B), Small (0.022B). All run at base resolution 504×504 with patch size 14 (DINOv2-standard). Input supports multiple aspect ratios via random sampling at training time.
- **Cross-view attention:** L transformer blocks partitioned L_s:L_g = 2:1. First L_s blocks: within-view self-attention. Next L_g blocks: alternate cross-view/within-view by rearranging tokens. Input-adaptive: with N=1 collapses to standard monocular ViT.
- **Camera conditioning:** per-view token c_i = Ec(f_i, q_i, t_i) via MLP when pose known; shared learnable token c_l otherwise. Prepended to patch tokens and participates in all attention operations.
- **Dual-DPT head:** shared reassembly modules → two branch sets of fusion layers → two output layers (depth, ray). One branch predicts D̂, the other M̂, sharing the low-level features but diverging in the final fusion stage. The design forces feature sharing between depth and ray branches (critical: Tab. 7 row d shows 86% AUC3 drop without dual-DPT).
- **Optional camera head D_C:** lightweight transformer on camera tokens only, ~0.1% FLOPs, predicts 9-DoF pose ĉ = (t, q, f) for inference convenience.

**Training (teacher-student):**
- *Teacher model:* monocular relative depth predictor built on DA2 architecture (DINOv2 + DPT), trained exclusively on synthetic data. Predicts exponential scale-shift-invariant depth (vs. DA2's disparity). Additional losses: gradient loss, global-local ROE alignment, distance-weighted surface normal loss (Eqs. 4–7). Teacher synthetic datasets span indoor/outdoor/object-centric (20+ datasets, §4.1).
- *Student (DA3):* supervised on real-world multi-view data using teacher pseudo-labels aligned to sparse metric depth via RANSAC LS (Eq. 8). Total loss: L = L_D + L_M + L_P + βL_C + αL_grad (α=β=1). Supervision transitions from GT to teacher labels at step 120k of 200k.
- *Monocular student:* follows DA2 student recipe but predicts depth (not disparity); teacher pseudo-labels used. Outperforms DA2 student on all five standard benchmarks (Table 10).
- *Metric model:* canonical focal-length rescaling (§4.4) + teacher labels. SOTA on ETH3D (δ1=0.917) and SUN-RGBD AbsRel (0.105); competitive on NYU and KITTI (Table 11).
- Training infrastructure: 128×H100 GPUs, 200k steps, ~10 days for Giant variant.

**Implementations:**
- Project page: https://depth-anything-3.github.io (named in abstract; no direct GitHub URL in the paper body). License: UNVERIFIED — to be checked at page-authoring time.

**Assessment:**
- *Strengths:* Minimal architecture — no bespoke cross-view transformer, no specialized multi-task loss — inherits full DINOv2 pretraining. Scalable model family (Small → Giant). Handles pose-free and pose-conditioned inference with the same weights. Outperforms prior SOTA VGGT (1.19B) using the 1.10B Giant across nearly all benchmark settings, and the 3× smaller 0.36B Large surpasses VGGT in 5/10 settings.
- *Pose benchmark delta vs. VGGT (AUC3, Table 2):* HiRoom 80.3 vs 49.1, ETH3D 48.4 vs 26.3, DTU 94.1 vs 79.2, 7Scenes 28.5 vs 23.9, ScanNet++ 85.0 vs 62.6. Abstract reports average 35.7% improvement in camera pose accuracy over VGGT.
- *Geometry benchmark delta vs. VGGT (F1 pose-free, Table 3):* HiRoom 85.1 vs 56.7, ETH3D 79.0 vs 57.2, ScanNet++ 77.0 vs 66.4; body (§7.1) reports average 25.1% improvement in geometric accuracy.
- *Monocular depth (δ1, Table 4):* DA3 ranks 2.20 across five datasets vs DA2's 2.60 — notably ETH3D 98.6 vs 86.5.
- *Feed-forward NVS (Table 5):* DA3 as 3DGS backbone: DL3DV PSNR 21.33, SSIM 0.711, LPIPS 0.241 (vs VGGT 20.96 / 0.697 / 0.253); out-of-domain MegaDepth PSNR 17.89 vs 16.45.
- *Limitations:* dynamic scenes not handled; teacher supervision introduces a precision-vs-sharpness tradeoff; pose recovery from ray map is non-trivial at inference without camera head; training is computationally heavy (~10 days on 128 H100s for Giant).

**References:**
- Primary: lin2025-depth-anything-3
- Background (not yet in atlas): yang2024-depth-anything-v2, oquab2023-dinov2, wang2024-dust3r, leroy2024-mast3r, wang2025-vggt, ranftl2020-midas

---

**Relations (DEFERRED)** — meaningful typed relations that cannot be authored yet because target pages do not exist on disk. Candidate edges for the human to confirm at page-authoring time:

- `{ type: generalized_by?, target: vggt (NOT YET ON DISK), confidence: ? }` — DA3 supersedes VGGT on the identical any-view benchmark; VGGT is the closest prior method and is positioned as direct predecessor.
- `{ type: generalized_by?, target: depth-anything-v2 (NOT YET ON DISK), confidence: ? }` — DA3 extends the DA2 paradigm from monocular to any-view, and the DA3 monocular student also outperforms DA2 student on five standard benchmarks; DA2 is preserved for monocular reference but is no longer SOTA.
- `{ type: feeds_into?, target: dinov2 (NOT YET ON DISK), confidence: ? }` — DA3's backbone is vanilla DINOv2 with no architectural changes; DINOv2 features are a named internal building-block.
- `{ type: feeds_into?, target: dust3r (NOT YET ON DISK), confidence: ? }` — DUSt3R founded the feed-forward point-map regression paradigm that DA3 builds on and supersedes; paper explicitly positions against DUSt3R (§2, §7.1).

Existing on-disk pages relate only as prerequisites/background: `vit` (plain-ViT backbone family), `pose-estimation`, `epipolar-geometry`, `bundle-adjustment` (feed-forward learned alternative to BA-based SfM/MVS), `pinhole-camera-model`. No typed frontmatter relation to an existing on-disk page is asserted; the meaningful lineage is to pages not yet authored.

# Provenance

- **Abstract:** §Abstract (HTML lines 94–97, TXT lines 17–27): defines the core claims; the "35.7% in camera pose accuracy and 23.6% in geometric accuracy" average figures appear in the abstract of the TXT cache (lines 25–26). Note: task description cites "44.3% (camera pose)" — this matches the per-setting AUC3 average computed from Table 2 numbers (HiRoom/ETH3D/DTU/7Scenes/ScanNet++ each relative gain vs VGGT, arithmetic mean ≈ 44.3%); the abstract's 35.7% is likely an average over both AUC3 and AUC30 thresholds. Both figures are correct under different averaging conventions.
- **Depth-ray formulation:** §3.1, TXT lines 289–336. Ray definition r = (t,d), d = RK^{-1}p, point P = t + D(u,v)·d.
- **Camera recovery from ray map:** §3.1, TXT lines 298–328. Camera center by averaging origins; K,R by DLT + QR decomposition.
- **Backbone partitioning L_s:L_g = 2:1:** §3.2, TXT lines 345–353. "In practice, we set Ls : Lg = 2:1 with L = Ls + Lg."
- **Camera conditioning (MLP and learnable token):** §3.2, TXT lines 354–358. c_i = Ec(f_i, q_i, t_i), or shared learnable token c_l.
- **Dual-DPT head description:** §3.2, TXT lines 359–379 (Fig. 3 caption).
- **Training loss:** §3.3, TXT lines 395–413. Full loss equation: L = L_D + L_M + L_P + βL_C + αL_grad (α=β=1). Gradient loss Eq. (3).
- **Training details:** §3.4, TXT lines 415–428. 504×504 base resolution, 128 H100s, 200k steps, LR 2e-4, 8k warm-up, teacher supervision from step 120k, pose conditioning prob 0.2.
- **Training datasets (Table 1):** TXT lines 448–481. 22+ datasets listed.
- **Teacher model:** §4.1, TXT lines 492–537. Exponential depth, extended synthetic corpus (20+ datasets), normal loss (Eqs. 4–6), teacher total loss Eq. (7) with α=0.5.
- **Teacher pseudo-label alignment:** §4.2, TXT lines 540–553. RANSAC LS Eq. (8): (ŝ, t̂) = argmin_s>0,t Σ m_p(sD̃_p + t - D_p)^2.
- **Monocular student:** §4.3, TXT lines 555–562. Predicts depth (not disparity); same loss as teacher.
- **Metric model:** §4.4, TXT lines 564–587. Canonical focal-length rescaling, 14 training datasets.
- **Visual geometry benchmark:** §6, TXT lines 641–728. 5 datasets (HiRoom, ETH3D, DTU, 7Scenes, ScanNet++), 89+ scenes. Metrics: AUC (RRA+RTA at 3° and 30°), F1 (Chamfer-based precision/recall at threshold d), CD for DTU.
- **Pose results (Table 2):** TXT lines 737–748. DA3-Giant 1.10B vs VGGT 1.19B.
- **Geometry results (Table 3):** TXT lines 782–793. DA3-Giant F1/CD vs VGGT. Average 25.1% improvement (TXT line 796).
- **Monocular depth (Table 4):** TXT lines 812–818. DA3 rank 2.20 vs DA2 2.60.
- **NVS results (Table 5):** TXT lines 865–878. DL3DV PSNR/SSIM/LPIPS for DA3 vs VGGT and others.
- **Ablation — depth-ray sufficiency (Table 6):** TXT lines 880–898. depth+ray outperforms depth+pcd+cam; camera head adds ~0.1% FLOPs.
- **Ablation — single transformer (Table 7):** TXT lines 900–933. VGGT-style drops to 79.8% performance; dual-DPT removal collapses AUC3 from 39.2 to 5.59.
- **Parameters and speed (Table 8):** TXT lines 940–947. Giant: backbone 1.130B, DualDPT 0.050B, CameraHead 0.018B, 37.6 FPS at 504×336 on A100; Large: 0.300B+0.047B+0.008B, 78.37 FPS.
- **Metric model results (Table 11):** TXT lines 1075–1084. ETH3D SOTA (δ1=0.917, AbsRel=0.104).
- **Conclusion:** §8, TXT lines 1113–1124. Future work: dynamic scenes, language integration, larger-scale pretraining.
- **Project page:** TXT line 30: "depth-anything-3.github.io". No GitHub repo URL in the paper.
