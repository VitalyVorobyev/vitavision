---
paper_id: wang2023-dust3r
title: "DUSt3R: Geometric 3D Vision Made Easy"
authors: [Shuzhe Wang, Vincent Leroy, Yohann Cabon, Boris Chidlovskii, Jérôme Revaud]
year: 2023
url: https://arxiv.org/abs/2312.14132
created: 2026-06-27
relevant_atlas_pages: [epipolar-geometry, pose-estimation, bundle-adjustment, pinhole-camera-model, feature-matching]
---

# Setting

**Problem class.** Dense unconstrained 3D reconstruction from arbitrary image collections with *no* prior knowledge of camera intrinsics or poses (calibration-free, pose-free, scale-free).

**Inputs.** An unordered pair of RGB images (I¹, I² ∈ ℝ^{W×H×3}) with unknown focal lengths, principal points, and extrinsic poses. For N > 2 images the pairwise network is applied to all connected pairs in a coverage graph, and a post-hoc global alignment fuses them.

**Outputs.** Two dense pointmaps X^{1,1}, X^{2,1} ∈ ℝ^{W×H×3} — both expressed in the first camera's coordinate frame — plus per-pixel confidence maps C^{1,1}, C^{2,1} ∈ ℝ^{W×H}. From these outputs, depth maps, relative pose, camera intrinsics, pixel correspondences, and full scene geometry are all recoverable with trivial post-processing. Predictions are valid up to an unknown scale factor.

**Preconditions.** Images must share overlapping scene content. Each camera ray is assumed to hit a single 3D point (no translucent surfaces). Principal point assumed approximately centred for focal estimation (§3.3).

# Core idea

**Pointmap.** A pointmap X ∈ ℝ^{W×H×3} is a dense 2D field of 3D scene points, forming a one-to-one pixel-to-point mapping I_{i,j} ↔ X_{i,j} for all (i,j) ∈ {1…W}×{1…H} (§3, p. 3). The pointmap from camera n expressed in camera m's frame is defined as

> X^{n,m} = P_m P_n^{-1} h(X^n)   … (Eq. 1)

where P_m, P_n ∈ ℝ^{3×4} are world-to-camera poses and h : (x,y,z) → (x,y,z,1) is the homogeneous embedding.

**Key insight.** By regressing *both* X^{1,1} and X^{2,1} in a *shared* coordinate frame (camera 1), the network simultaneously solves correspondence (same pixel index maps to the same 3D point in both outputs), relative depth, and relative pose — without ever explicitly computing essential matrices, triangulating points, or requiring known intrinsics. Recovering any classical SfM output becomes trivial lookup or lightweight post-processing on the pointmaps (§3.3).

**Scale ambiguity.** Predictions are up to an unknown scale. The regression loss normalises both prediction and ground truth by their average point-to-origin distance:

> norm(X¹, X²) = 1/(|D¹|+|D²|) · Σ_{v∈{1,2}} Σ_{i∈D^v} ‖X_i^v‖   … (Eq. 3)

**Confidence-weighted regression.** The network jointly predicts confidence maps C^{v,1}. The full training objective is (Eq. 4):

> L_conf = Σ_{v∈{1,2}} Σ_{i∈D^v} [ C_i^{v,1} · ℓ_regr(v,i) − α log C_i^{v,1} ]

where ℓ_regr(v,i) = ‖(1/z) X_i^{v,1} − (1/z̄) X̄_i^{v,1}‖ (Eq. 2), z = norm(X^{1,1}, X^{2,1}), z̄ = norm(X̄^{1,1}, X̄^{2,1}), and α is a regularisation hyperparameter (α chosen so C^{v,1} = 1 + exp(Ĉ^{v,1}) > 1 is strictly positive). The −α log C term prevents the network from setting all confidences to zero to trivially minimise the first term.

**Depth extraction.** Depth at pixel (i,j) in I¹ is simply the z-coordinate of the pointmap (Eq. 8, Appendix F.1):

> D¹_{i,j} = X^{1,1}_{i,j,2}

For monocular depth the same image is fed twice: F(I, I), yielding X^{1,1} whose z-slice is the depth map.

# Assumptions

1. (**Hard**) Overlapping visual content between the two images. The cross-attention decoder needs both views to agree on a shared 3D structure; disjoint scenes produce arbitrary outputs.
2. (**Hard**) Each pixel subtends a single scene surface (no transparent/reflective objects or motion blur that would alias the per-pixel 3D assignment).
3. (**Soft**) Principal point approximately centred and pixels square — required for the closed-form focal-length estimator (§3.3). Violated for strongly off-centre crops; the Weiszfeld solver degrades gracefully.
4. (**Soft**) Reasonable image resolution (tested up to 512px longest side); extreme downsampling degrades depth detail.
5. (**Soft, global alignment**) Pairwise coverage graph is connected. Isolated sub-graphs produce disconnected reconstructions.

# Failure regime

- **DTU 3D accuracy** (no GT poses): DUSt3R 512 achieves 1.74 mm overall vs. 0.295 mm for the best per-domain learning method with GT poses and training data (Table 4). The regression paradigm is fundamentally less accurate than sub-pixel triangulation from explicit cameras when those cameras are known.
- **Visual localization with unknown intrinsics on Cambridge-Landmarks**: translation errors jump to 64–245 cm (vs. 6–38 cm with GT focals) because ground-truth database pointmaps are sparse, preventing reliable scale transfer (Appendix E, Table 6).
- **Wide-baseline, near-zero overlap** pairs: confidence maps collapse; global alignment may diverge or produce inconsistent scale chains.
- **Scene scale**: pointmaps are predicted up to an unknown scale per pair; absolute metric scale is not recovered without an external reference (GT pointmap, known baseline, or IMU).
- **Non-commercial license**: CC-BY-NC-SA-4.0 restricts commercial use of the released weights and code.

# Numerical sensitivity

- **Scale normalization**: the normalizing factor z (Eq. 3) is the mean Euclidean distance of all valid predicted points to the origin across both views. If predictions collapse near the origin (degenerate scene), z → 0 and the loss diverges; confidence suppression partially guards this.
- **Confidence regularisation**: the log term keeps C strictly > 1; α controls how aggressively the network hedges — too large α forces uniform confidence and suppresses the regression signal.
- **Training curriculum**: low-resolution (224×224) → high-resolution (512px, various aspect ratios) → DPT-head fine-tuning (Table 7). Skipping the low-res warm-up produces slower convergence.
- **Focal estimation precision**: assumes centred principal point (p_x ≈ W/2, p_y ≈ H/2) and square pixels; the single remaining unknown f₁* is recovered via a few Weiszfeld iterations. Significantly off-centre principal points introduce systematic error in extracted poses.
- **Global alignment**: optimised with standard gradient descent (~a few hundred steps, seconds on a GPU); avoids Jacobian sparsity issues of BA because the 3D loss is smoother than the 2D reprojection loss.

# Applicability

- **Use when**: uncalibrated image pairs or small unordered collections (≤ ~dozens of images for global alignment in reasonable time); when a complete SfM pipeline is unavailable; when you need dense depth + pose + correspondences from a single feed-forward pass.
- **Don't use when**: metric accuracy is paramount and camera parameters are already known (classical MVS will outperform by 5–6×); real-time on-device deployment (ViT-Large encoder is heavy); commercial products (non-commercial weights).
- **Compared against**: COLMAP+SuperPoint+SuperGlue (classical SfM); PoseDiffusion (regression-based multi-view pose); DeMoN, DeepV2D, MVSNet (learning-based MVS); PixSFM (featuremetric SfM); SlowTv, DPT (monocular depth).

**Key quantitative headline (Table 2 / Table 5, §4.2):**
- Multi-view relative pose, CO3Dv2 10 frames: RRA@15 = 96.2, RTA@15 = 86.8, mAA@30 = 76.7 (vs. PoseDiffusion 80.5 / 79.8 / 66.5).
- Multi-view relative pose, RealEstate10K 10 frames: mAA@30 = 67.7 (vs. PoseDiffusion 48.0).
- Zero-shot monocular depth (DUSt3R 512): AbsRel 6.50 on NYUv2, 10.74 on KITTI, on-par with supervised DPT-BEiT / NeWCRFs (Table 2).

# Connections

- **Builds on**: CroCo (croco-v2 pretraining — shared ViT encoder + cross-attention decoder; cross-view completion pretext task); ViT (Dosovitskiy et al. 2021, ref [27]); DPT (regression head architecture, ref [91]).
- **Enables / extended by**: MASt3R (`leroy2024-mast3r` — adds matching head + local features on top of DUSt3R); VGGT (`wang2025-vggt` — generalises to arbitrary token-level predictions); Depth-Anything-3 (`lin2025-depth-anything-3` — metric depth using DUSt3R point cloud supervision).
- **Contrasts with**: classical SfM (`bundle-adjustment` — iterative, reprojection-error minimisation, requires known intrinsics); COLMAP (incremental SfM pipeline); standard MVS (requires poses as input).

# Atlas update plan

## NEW: dust3r
Type: model
Domain: geometry
arch_family: vit
Primary source: this paper (wang2023-dust3r)

**Goal**: Collapse the classical SfM/MVS pipeline (keypoint detection → matching → essential matrix → triangulation → bundle adjustment → dense reconstruction) into a single feed-forward network that operates on uncalibrated, unposed images and directly outputs dense 3D geometry.

**Architecture**:
- Siamese shared-weight ViT-Large encoder; each image patchified and encoded to token sequence F¹, F².
- Two ViT-Base transformer decoders with cross-attention: each decoder block receives tokens from both branches simultaneously, enabling inter-view information fusion.
- Two DPT-style regression heads: one per view, output pointmap X^{v,1} ∈ ℝ^{W×H×3} and confidence map C^{v,1} ∈ ℝ^{W×H}, both in frame 1.
- Initialized from CroCo v2 pretrained weights (cross-view completion pretraining).

**Training**:
- Confidence-weighted pointmap regression (Eq. 4); scale-normalised Euclidean loss (Eq. 2–3); no geometric constraints enforced at inference.
- 8.5M image pairs from 8 datasets (Habitat, ARKitScenes, MegaDepth, Static Scenes 3D, BlendedMVS, ScanNet++, CO3Dv2, Waymo).
- Three-stage curriculum: 224px linear head → 512px linear head → 512px DPT head.

**Global alignment (>2 views)**:
- Build connectivity graph G(V,E) from image pairs; predict pairwise pointmaps for each edge.
- Optimise world-space pointmaps χ, per-pair poses P_e and scales σ_e by minimising confidence-weighted 3D distance (Eq. 5); constraint Π_e σ_e = 1.
- Recovers camera poses {P_n}, intrinsics {K_n}, depthmaps {D_n} by substituting pinhole model into χ (§3.4).
- Fast gradient descent (~seconds); not reprojection-error minimisation — avoids sparse Jacobian complexity of classical BA.

**Implementations**: `naver-labs-europe/dust3r` (GitHub); license CC-BY-NC-SA-4.0 — non-commercial only.

**Assessment**:
- Founded the pose-free feed-forward 3D reconstruction paradigm; outperforms PoseDiffusion by wide margin on CO3Dv2 multi-view pose.
- 3D reconstruction accuracy (no GT poses) lags specialized methods with known cameras — regression is inherently less precise than triangulation.
- Global alignment is a post-hoc optimization step for N > 2 views; not yet fully end-to-end.
- Non-commercial license limits industrial adoption.

## UPDATE: bundle-adjustment
Section: Remarks
- DUSt3R proposes an alternative "global alignment" optimization that minimises 3D projection errors (not 2D reprojection errors), is faster (gradient descent, seconds vs. minutes), and does not require known camera intrinsics as input. See `dust3r` for the formulation (Eq. 5, §3.4).

## UPDATE: feature-matching
Section: Remarks
- DUSt3R performs implicit dense correspondence via nearest-neighbour search in the shared pointmap space (§3.3), bypassing explicit keypoint detection and descriptor matching entirely. Results on visual localization (Table 1) are competitive with HLoc on 7Scenes.

# Provenance

- Abstract, p. 1: "Dense and Unconstrained Stereo 3D Reconstruction … without prior information about camera calibration nor viewpoint poses."
- §3 p. 3: Pointmap definition X ∈ ℝ^{W×H×3}; pixel-point bijection I_{i,j} ↔ X_{i,j}.
- §3 Eq. 1: X^{n,m} = P_m P_n^{-1} h(X^n).
- §3.1 p. 4: Architecture description (Siamese ViT encoder, cross-attention decoders); Fig. 2 caption.
- §3.1 Decoder blocks: G^v_i = DecoderBlock^v_i(G^v_{i-1}, G^{other}_{i-1}).
- §3.2 Eq. 2: ℓ_regr(v,i) = ‖(1/z)X_i^{v,1} − (1/z̄)X̄_i^{v,1}‖.
- §3.2 Eq. 3: norm(X¹,X²) = mean distance to origin across both views.
- §3.2 Eq. 4: L_conf = Σ C_i ℓ_regr − α log C_i; confidence positivity enforced by C = 1 + exp(Ĉ).
- §3.3 p. 5: Focal estimation via Weiszfeld algorithm; Procrustes relative pose (named [64]).
- §3.4 Eq. 5: Global alignment objective; scale constraint Π_e σ_e = 1.
- §3.4 p. 6: "contrary to traditional bundle adjustment … not minimizing 2D reprojection errors … 3D projection errors."
- Appendix F.1 Eq. 8: D¹_{i,j} = X^{1,1}_{i,j,2}.
- Appendix F.1 Eqs. 6–7: Ground-truth pointmap construction from K, P, D.
- Table 2 (p. 8): Depth and multi-view pose benchmark results.
- Table 3 (p. 8): Multi-view depth results without GT poses.
- Table 4 (p. 9): DTU 3D reconstruction; DUSt3R 512 at 1.741 mm overall.
- Table 5 (Appendix D, p. 16): Multi-view pose with 3/5/10 frames.
- Table 7 (Appendix F.2, p. 17): Training hyperparameters (ViT-Large encoder, ViT-Base decoder, three-stage curriculum).
- Table 8 (Appendix F.1, p. 17): Dataset mixture (8.5M pairs).
