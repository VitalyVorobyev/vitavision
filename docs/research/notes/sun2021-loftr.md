---
paper_id: sun2021-loftr
title: "LoFTR: Detector-Free Local Feature Matching with Transformers"
authors: ["J. Sun", "Z. Shen", "Y. Wang", "H. Bao", "X. Zhou"]
year: 2021
url: https://arxiv.org/pdf/2104.00680
created: 2026-05-09
relevant_atlas_pages: [superpoint, sift, orb, xfeat, superglue, ransac, fischler-bolles-ransac, barath-magsac]
---

# Setting

Local image feature matching: given two grayscale images $I^A$ and $I^B$, produce a set of pixel-level correspondences $\mathcal{M}_f = \{(p^A_k, p^B_k)\}$ where $p^A_k$ and $p^B_k$ are sub-pixel positions in the respective images. Output correspondences may then be consumed by pose estimators (essential/homography matrix solvers via RANSAC), structure-from-motion pipelines, or visual localization engines.

Preconditions: overlapping viewpoints with shared scene content; images may differ substantially in illumination, viewpoint angle, and scale. No detector-required input: the method does not expect pre-computed keypoints or descriptors. Operates on image pairs; no batch-level scene consistency is assumed. Does not require calibrated cameras during inference.

Output: a sparse set of 2D-to-2D correspondences with sub-pixel accuracy, produced without any keypoint detector.

# Core idea

LoFTR replaces the conventional detect-describe-match pipeline with a coarse-to-fine, detector-free scheme. Both images are passed through a shared CNN backbone with FPN structure that produces coarse feature maps $\tilde{F}^A$, $\tilde{F}^B$ at $\nicefrac{1}{8}$ resolution and fine feature maps $\hat{F}^A$, $\hat{F}^B$ at $\nicefrac{1}{2}$ resolution. The coarse maps are flattened and fed into the LoFTR module — a stack of $N_c$ interleaved self-attention and cross-attention layers using the Linear Transformer approximation — which transforms them into context- and position-dependent representations $\tilde{F}^A_{tr}$, $\tilde{F}^B_{tr}$. A differentiable matching layer (either optimal-transport or dual-softmax) then produces a confidence matrix $\mathcal{P}_c$ from the score matrix

$$\mathcal{S}(i,j) = \frac{1}{\tau} \cdot \langle \tilde{F}^A_{tr}(i),\, \tilde{F}^B_{tr}(j) \rangle$$

where $\tau$ is a temperature parameter. Coarse matches $\mathcal{M}_c$ are selected from $\mathcal{P}_c$ by a confidence threshold plus mutual-nearest-neighbor (MNN) criterion. Each selected coarse match is then refined by cropping a local $w \times w$ window from the fine feature maps and computing an expected sub-pixel location via a correlation-based correlation volume — the final output $\mathcal{M}_f$ has sub-pixel precision.

The key insight is that the global receptive field of the Transformer, combined with 2D sinusoidal positional encoding added once at the backbone output, allows the representations to encode relative spatial position even over texture-less, homogeneous regions where CNN-based detectors find no repeatable interest points.

# Assumptions

1. The two images share a scene region large enough that dense correspondences can be established at $\nicefrac{1}{8}$ resolution. (Hard: images with no overlap produce garbage matches with arbitrary confidence.)
2. The scene is approximately Lambertian or the illumination change is within the training distribution (ScanNet indoors or MegaDepth outdoors). (Soft: performance degrades gracefully under moderate domain shift.)
3. No pure rotation around the optical axis with scale change approaching the limit of the $\nicefrac{1}{8}$-resolution coarse stage. (Soft: fine refinement partly compensates, but coarse matching needs to succeed first.)
4. Input images fit in GPU memory after resizing to the expected resolution (640×480 or 840 long-side for training; 1200 long-side for MegaDepth evaluation). (Hard resource constraint, not a validity constraint.)
5. Depth maps and camera poses are available during training for generating ground-truth coarse matches (supervised approach — not needed at inference time).

# Failure regime

- **Completely textureless scenes with no geometric context** (e.g., blank walls with no nearby edges): the positional encoding embeds absolute grid coordinates, so the transformer can still distinguish positions, but if the scene is truly featureless the transformer must rely entirely on position rather than appearance — this produces geometrically spaced but appearance-ambiguous matches that may be inlier-poor after RANSAC.
- **Large scale change exceeding the training range**: the $\nicefrac{1}{8}$ coarse level must find the correct coarse match; a scale ratio that makes the matching pixel cover a large area in the other image will degrade coarse precision and the fine module cannot recover.
- **Repetitive textures at the coarse scale** (e.g., regular tile grids with pitch $\leq 8$ pixels at coarse resolution): dual-softmax or OT will distribute probability mass across ambiguous repetitions, causing multi-modal $\mathcal{P}_c$ and MNN failures.
- **Inference-time domain mismatch**: models trained on ScanNet (indoor) show degraded outdoor performance and vice versa. Two separate model weights (indoor and outdoor) are required for robust cross-domain use.
- **Runtime on high-resolution images**: the LoFTR module operates on $(H/8 \times W/8)^2$ feature sequences. A 640×480 image pair runs at 116 ms (dual-softmax) or 130 ms (OT, 3 Sinkhorn iterations) on RTX 2080Ti. Images significantly larger than 640×480 at inference time will be substantially slower.

# Numerical sensitivity

- **Temperature $\tau$**: controls the sharpness of the score matrix $\mathcal{S}(i,j) = \frac{1}{\tau}\langle \cdot, \cdot \rangle$. Too small concentrates mass and may prevent valid low-confidence matches from being selected; too large diffuses the distribution and makes MNN selection unreliable.
- **Linear Transformer kernel**: the ELU+1 kernel $\phi(\cdot) = \mathrm{elu}(\cdot)+1$ guarantees non-negative attention weights (required for the associativity trick to reduce complexity from $O(N^2)$ to $O(N)$). The kernel does not have the same sharpness as softmax — the transformed attention distribution is smoother, which can be a source of matching ambiguity in highly discriminative regions relative to the full-softmax baseline.
- **Sinkhorn iterations for OT**: 3 iterations are used, which is an approximation. More iterations would converge closer to the true OT solution but increase runtime.
- **Coarse-to-fine alignment**: the fine module receives a $w \times w$ window; if the coarse prediction error exceeds $w/2$ pixels (at $\nicefrac{1}{2}$ resolution), the true match falls outside the window and the fine module cannot recover it.
- **32-bit precision** is used throughout; the dot-product operation inside attention is numerically stable for the input scales typically encountered in computer vision feature maps.

# Applicability

- Use when: matching scenes with low-texture or repetitive patterns where SIFT/ORB-based detectors fail to find repeatable keypoints; indoor scenes (trained on ScanNet); outdoor landmark scenes (trained on MegaDepth); when maximizing the number of valid correspondences matters more than per-keypoint speed.
- Don't use when: real-time constraints preclude 116 ms per pair on modern GPUs; when detector-based methods already give sufficient correspondences; when training data distribution is far from both ScanNet and MegaDepth (e.g., medical or aerial imagery without fine-tuning).
- Compared against: SuperGlue (detector-based, uses detected SuperPoint keypoints as input), DRC-Net (detector-free with 4D cost volume), NCNet, SIFT+RANSAC, SuperPoint+RANSAC.

# Connections

- Builds on: SuperGlue (attention-based matching framework), Linear Transformer / Transformers are RNNs (efficient $O(N)$ attention), DETR (2D positional encoding), FPN (multi-scale CNN backbone), NCNet (detector-free dense matching motivation)
- Enables: visual localization pipelines requiring dense correspondences in challenging indoor/outdoor scenes

# Atlas update plan

## NEW: loftr

Type: model
Category: feature_matching
Primary source: sun2021-loftr

**Goal**
- Produce dense, sub-pixel image correspondences between pairs of images without relying on a keypoint detector.
- Addresses the fundamental failure mode of detector-based methods (SIFT, ORB, SuperPoint) in low-texture or repetitive-pattern scenes where repeatable interest points cannot be reliably detected.
- Target applications: relative pose estimation for SfM/SLAM, visual localization (Aachen Day-Night, InLoc).

**Architecture**
- Stage 1 — CNN backbone (ResNet-like with FPN): extracts coarse feature maps at $1/8$ resolution ($\tilde{F}^A$, $\tilde{F}^B$) and fine feature maps at $1/2$ resolution ($\hat{F}^A$, $\hat{F}^B$).
- Stage 2 — LoFTR module: coarse maps are flattened to 1D sequences; 2D sinusoidal positional encoding (DETR-style, added once at backbone output) is appended. $N_c$ interleaved self-attention and cross-attention layers with Linear Transformer approximation ($O(N)$ complexity, kernel $\phi(\cdot) = \mathrm{elu}(\cdot)+1$) transform features into context- and position-dependent representations $\tilde{F}^A_{tr}$, $\tilde{F}^B_{tr}$.
- Stage 3 — Differentiable matching layer: score matrix $\mathcal{S}(i,j) = \frac{1}{\tau}\langle \tilde{F}^A_{tr}(i), \tilde{F}^B_{tr}(j) \rangle$. Two options: (a) Sinkhorn optimal transport (LoFTR-OT), or (b) dual-softmax operator (LoFTR-DS). Coarse matches $\mathcal{M}_c$ selected by confidence threshold + MNN criterion.
- Stage 4 — Coarse-to-fine refinement: for each coarse match $(\tilde{i},\tilde{j})\in\mathcal{M}_c$, crop a $w \times w$ local window from the fine feature maps; compute a correlation volume; the expected sub-pixel displacement refines to the final match $\mathcal{M}_f$.

**Training**
- Indoor model trained on ScanNet; outdoor model on MegaDepth (same protocol as SuperGlue).
- Ground-truth coarse matches $\mathcal{M}_c^{gt}$ derived from camera poses and depth maps: mutual nearest neighbors of the $1/8$-resolution grids projected via known depth.
- Coarse loss: negative log-likelihood on $\mathcal{P}_c$ over $\mathcal{M}_c^{gt}$ (NLL for dual-softmax; same formulation as SuperGlue for OT).
- Fine loss: weighted negative log-likelihood on fine-level window predictions; uncertainty-weighted so low-confidence predictions contribute less.
- End-to-end training from random initialization; 64 GTX 1080Ti GPUs; convergence ~24 hours for indoor model.
- Images resized to 840 long-side for training (MegaDepth), 640×480 for ScanNet; validation at 1200 long-side for MegaDepth.

**Implementations**
- Official: `https://github.com/zju3dv/LoFTR` (license: ?)
  - Note: as of the paper release the repo was under active development; verify current license in the repo before citing for commercial use.

**Assessment**
- HPatches homography estimation (AUC): LoFTR-DS achieves state-of-the-art across @3px, @5px, and @10px corner error thresholds against SuperGlue and other detector-based/free methods.
- ScanNet indoor pose estimation (AUC of pose error): LoFTR improves the state-of-the-art by a large margin; outperforms DRC-Net by 61% at AUC@10° and SuperGlue by 13% at AUC@10°.
- MegaDepth outdoor pose estimation: LoFTR-DS outperforms LoFTR-OT on outdoor scenes; competitive against SuperGlue+SuperPoint.
- Aachen Day-Night v1.1 visual localization: LoFTR-OT performs on par with SuperPoint+SuperGlue on night queries; ranks first among published methods at the time of submission on two public visual localization benchmarks.
- Runtime: 116 ms per 640×480 pair (LoFTR-DS), 130 ms (LoFTR-OT, 3 Sinkhorn iterations) on RTX 2080Ti.

**Remarks**
- The detector-free paradigm unlocks matching in low-texture regions that have been a persistent blind spot of classical and learned detector-based methods since SIFT.
- XFeat (Potje et al., 2024) is a later, lighter alternative targeting real-time use on mobile hardware; LoFTR remains the reference heavyweight for the detector-free paradigm.
- SuperGlue is the primary peer comparison: both use Transformer-style attention for matching, but SuperGlue is detector-dependent (requires SuperPoint or SIFT keypoints), while LoFTR operates directly on dense feature maps.
- The linear attention approximation (ELU+1 kernel) trades some representational fidelity for $O(N)$ complexity; ablation (Table 6) confirms it is substantially better than replacing the LoFTR module with plain convolution of comparable parameter count.
- Two separate model weights exist (indoor / outdoor); there is no universal single model — practitioners must choose or fine-tune.

**References**
- sun2021-loftr (this paper)

Relations:
- { type: compared_with, target: superglue, confidence: high }
- { type: compared_with, target: xfeat, confidence: high, caution: XFeat is later and lighter; LoFTR is the heavyweight reference for the detector-free paradigm }

# Provenance

- Abstract (ar5iv HTML §Abstract): definition of the detector-free approach, claim of ranking first on two visual localization benchmarks, project page URL.
- §1 Introduction, paragraph 4 (HTML line 112): "Dense matches are first extracted between the two sets of transformed features at a low feature resolution (1/8 of the image dimension)."
- §3.1 Local Feature Extraction (HTML lines 217–218): coarse-level features at $1/8$ resolution, fine-level at $1/2$ resolution.
- §3.2 Linear Transformer (HTML lines 280–290): $O(N^2)$ vanilla attention complexity; Linear Transformer reduces to $O(N)$ via $\phi(\cdot)=\mathrm{elu}(\cdot)+1$ kernel; associativity argument for $D \ll N$.
- §3.2 Positional Encoding (HTML lines 293–296): 2D extension of sinusoidal positional encoding following DETR; added to backbone output once.
- §3.2 Self-attention and Cross-attention Layers (HTML line 306): $N_c$ interleaved self- and cross-attention layers.
- §3.3 Establishing Coarse-level Matches (HTML lines 315–320): score matrix formula $\mathcal{S}(i,j)=\frac{1}{\tau}\langle\tilde{F}^A_{tr}(i),\tilde{F}^B_{tr}(j)\rangle$; dual-softmax and OT options.
- §3.4 Coarse-to-Fine Module (HTML line 353): $w\times w$ local window from fine-level feature maps; sub-pixel refinement.
- §3.5 Supervision (HTML lines 369–375): NLL loss on confidence matrix; depth-map+pose derived ground-truth; training follows SuperGlue protocol.
- §3.6 Implementation Details (HTML lines 408–419): ScanNet indoor / MegaDepth outdoor; 64 GTX 1080Ti, ~24 h; 116 ms (DS), 130 ms (OT) on RTX 2080Ti; 3 Sinkhorn iterations.
- §4.1 Homography Estimation (HTML lines 433, 440, 443): HPatches dataset, RANSAC homography, AUC of corner error at @3px, @5px, @10px.
- §4.2 Relative Pose Estimation (HTML lines 713–820): ScanNet indoor AUC@5°/10°/20°, MegaDepth outdoor, 61% improvement over DRC-Net at AUC@10°, 13% over SuperGlue.
- §4.3 Visual Localization (HTML lines 830–966): Aachen Day-Night v1.1, InLoc; ranks first among published methods; on par with SuperPoint+SuperGlue on night queries.
