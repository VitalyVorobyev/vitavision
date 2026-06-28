---
title: "Feed-Forward 3D Reconstruction"
date: 2026-06-27
summary: "Recovering 3D geometry — point maps, depth, and camera poses — directly from images in a single network pass, replacing the detect-match-triangulate-bundle-adjust pipeline of classical structure-from-motion with learned pointmap regression."
tags: ["deep-learning", "two-view-geometry", "survey"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [epipolar-geometry, bundle-adjustment, pose-estimation, pinhole-camera-model]
sources:
  primary: wang2023-dust3r
  references:
    - leroy2024-mast3r
    - wang2025-vggt
    - lin2025-depth-anything-3
---

# Definition

The classical pipeline for recovering 3D structure from images has four stages: detect and match feature points across views, estimate the fundamental or essential matrix and triangulate the matches, then refine all cameras and points jointly by minimising 2D reprojection error in bundle adjustment. Every stage requires sufficient views and correspondences, and camera intrinsics must either be known in advance or bootstrapped alongside reconstruction.

Feed-forward 3D reconstruction replaces this pipeline with a single neural network forward pass. Given one or more uncalibrated, unposed images as input, the network outputs dense 3D geometry — depth maps, camera poses, and point clouds — without computing any explicit feature descriptors, fundamental matrices, or iterative optimisation. The representational choice that makes this possible is the **pointmap**.

:::definition[Pointmap]
A pointmap $\mathbf{X} \in \mathbb{R}^{W \times H \times 3}$ is a dense 2D array of 3D scene points forming a one-to-one pixel-to-point mapping $I_{i,j} \leftrightarrow \mathbf{X}_{i,j}$ for all $(i, j)$. Each pixel carries its 3D coordinate directly; depth, camera projection, and scene correspondence are all encoded in the array structure (DUSt3R §3, p. 3).
:::

Where classical SfM outputs a sparse point cloud after seconds or minutes of computation, a feed-forward network regresses a dense pointmap in a single pass with no calibration input.

## Decision table

| Method | Views handled | Needs known poses? | Post-hoc optimisation | Primary outputs |
|---|---|---|---|---|
| Classical SfM (COLMAP) | N (≥ 2) | No — estimated | Triangulation + bundle adjustment | Sparse point cloud, camera poses |
| DUSt3R | Pair (+ graph for N) | No | Global 3D alignment (optional) | Dense pointmaps, depth, relative pose |
| MASt3R | Pair (primary) | No | Global 3D alignment (optional) | Pointmaps, dense descriptors, pixel matches |
| VGGT | 1 – hundreds | No | None required (BA optional) | Pointmaps, depth, cameras, point tracks |
| Depth Anything 3 | 1 – thousands | No (optional) | None required | Depth maps, ray maps, camera poses |

# Mathematical Description

## Pointmap regression

DUSt3R introduced the first complete formulation. A siamese ViT encoder with cross-attention decoders processes an image pair $(I^1, I^2)$ and outputs two pointmaps $\mathbf{X}^{1,1}$ and $\mathbf{X}^{2,1}$, both expressed in the coordinate frame of camera 1. This shared-frame convention is the key insight: by regressing both pointmaps into the *same* reference frame, the network simultaneously encodes correspondences (pixel $(i,j)$ in $\mathbf{X}^{1,1}$ and $(i,j)$ in $\mathbf{X}^{2,1}$ refer to the same world point), relative depth, and relative pose — without ever computing an essential matrix or known intrinsics.

The ground-truth pointmap from camera $n$ expressed in frame $m$ is:

$$\mathbf{X}^{n,m} = P_m P_n^{-1} h(\mathbf{X}^n) \tag{1}$$

where $P_m, P_n \in \mathbb{R}^{3 \times 4}$ are world-to-camera poses and $h$ is the homogeneous embedding (DUSt3R Eq. 1). Predictions are valid up to an unknown scale. The regression target normalises both prediction and ground truth by the mean point-to-origin distance across both views:

$$z = \mathrm{norm}(\mathbf{X}^1, \mathbf{X}^2) = \frac{1}{|D^1|+|D^2|} \sum_{v \in \{1,2\}} \sum_{i \in D^v} \|\mathbf{X}_i^v\| \tag{2}$$

(DUSt3R Eq. 3). The per-pixel regression term is $\ell_{\mathrm{regr}}(v,i) = \|(1/z)\mathbf{X}_i^{v,1} - (1/\bar{z})\bar{\mathbf{X}}_i^{v,1}\|$ (DUSt3R Eq. 2). The network jointly predicts per-pixel confidence maps $C^{v,1}$ and is trained with a confidence-weighted objective:

$$\mathcal{L}_{\mathrm{conf}} = \sum_{v \in \{1,2\}} \sum_{i \in D^v} \left[ C_i^{v,1} \cdot \ell_{\mathrm{regr}}(v,i) - \alpha \log C_i^{v,1} \right] \tag{3}$$

(DUSt3R Eq. 4). The $-\alpha \log C$ term prevents the network from trivially zeroing all confidences; $C_i^{v,1} = 1 + \exp(\hat{C}_i^{v,1}) > 1$ is enforced strictly positive. This loss jointly trains correspondence, relative pose, and depth from image supervision alone, with no geometric constraints enforced at inference.

## From pairwise to many views

For $N > 2$ images DUSt3R applies the pairwise network to every connected pair in a coverage graph, then fuses results via **global 3D alignment**: an optimisation that minimises confidence-weighted 3D distances between overlapping pointmaps, recovering per-image poses and scale factors. This is explicitly not bundle adjustment — it minimises 3D projection errors rather than 2D reprojection errors, requires no known intrinsics, and converges in seconds with standard gradient descent (DUSt3R §3.4, p. 6).

VGGT replaces multi-pass plus global alignment with a single forward pass over all $N$ views. Its **alternating-attention** backbone applies 24 transformer blocks, each alternating a frame-wise self-attention layer (tokens within one image only) with a global self-attention layer (tokens across all images simultaneously). This alternation is the sole architectural inductive bias for 3D reasoning: per-image normalisation is preserved by the frame-wise sublayer, while cross-view geometric fusion happens in the global sublayer. One network call jointly outputs rotation quaternion $q_i$, translation $t_i$, field of view $f_i$, depth map $D_i$, point map $P_i$, and dense tracking features $T_i$ for all $N$ images — at approximately 0.2 s for 10 views on an H100 (VGGT §3.2, Table 1). The multi-task training objective is $\mathcal{L} = \mathcal{L}_{\mathrm{camera}} + \mathcal{L}_{\mathrm{depth}} + \mathcal{L}_{\mathrm{pmap}} + 0.05\,\mathcal{L}_{\mathrm{track}}$ (VGGT Eq. 2); ablations show removing any head degrades point-map quality by 0.08–0.12 Chamfer distance on ETH3D (VGGT Table 6).

Depth Anything 3 proposes a complementary minimal representation. Rather than regressing a pointmap $\mathbf{X} \in \mathbb{R}^{W \times H \times 3}$ per view, it jointly predicts a depth map $D_i \in \mathbb{R}^{H \times W}$ and a **ray map** $M_i \in \mathbb{R}^{H \times W \times 6}$. Each pixel's ray is defined as $r = (\mathbf{t}, \mathbf{d})$ where $\mathbf{t} \in \mathbb{R}^3$ is the camera centre and $\mathbf{d} = R K^{-1} \mathbf{p}$ is the back-projected direction rotated to world frame (DA3 §3.1). A 3D point is recovered by the element-wise product:

$$\mathbf{P}(u, v) = \mathbf{t} + D(u, v) \cdot \mathbf{d} \tag{4}$$

Camera intrinsics and extrinsics are recoverable from the ray map alone via DLT + QR decomposition, encoding pose implicitly in ray geometry rather than as an explicit regression target. Cross-view reasoning is achieved by partitioning the transformer layers into within-view ($L_s$) and cross-view ($L_g$) groups at ratio $L_s : L_g = 2:1$ with no architectural changes to the DINOv2 backbone (DA3 §3.2).

## 3D-grounded matching

MASt3R augments DUSt3R with a dense descriptor head. Alongside the pointmap head that outputs $\mathbf{X}^{v,1}$ and $C^v$, a second two-layer GELU MLP head predicts L2-normalised local features $D^v \in \mathbb{R}^{H \times W \times 24}$ (MASt3R Eqs. 8–9; $d = 24$). These descriptors are trained with an InfoNCE contrastive matching loss at temperature $\tau = 0.07$ (MASt3R Eq. 10). The full objective is:

$$\mathcal{L}_{\mathrm{total}} = \mathcal{L}_{\mathrm{conf}} + \beta\,\mathcal{L}_{\mathrm{match}} \tag{5}$$

with $\beta = 1$ (MASt3R Eq. 12). The critical ablation result: training with $\mathcal{L}_{\mathrm{match}}$ alone, removing the 3D grounding from $\mathcal{L}_{\mathrm{conf}}$, degrades median rotation accuracy from 3.0° to 10.8° (MASt3R Table 1). Dense 2D descriptor matching without pointmap supervision is insufficient for extreme-viewpoint correspondence; the 3D regression signal is the load-bearing component.

# Numerical Concerns

**Scale ambiguity.** Every feed-forward method predicts geometry up to an unknown scale per scene. DUSt3R normalises by the mean point-to-origin distance (Eq. 2); this fixes a canonical scale within one inference session but not across sessions or to metric units. Absolute metric scale requires an external reference: a known baseline, a metric depth cue from training data, or IMU integration. Depth Anything 3 addresses this with a separate metric-depth variant that applies canonical focal-length rescaling to constrain the scale.

**Coordinate frame ambiguity.** DUSt3R and VGGT anchor the world coordinate frame to the first camera (first image's extrinsics fixed to identity). Input ordering affects the world frame; independently reconstructed subsets can produce inconsistent combined clouds if merged naively. DA3 mitigates this by treating cross-view attention as permutation-invariant over all views processed simultaneously.

**Memory growth with many views.** VGGT's global self-attention is quadratic in the total token count across all frames. At 200 frames and 336×518 resolution the model requires approximately 40.6 GB of GPU memory on an H100 (VGGT Table 9). Depth Anything 3 scales more favorably: its 2:1 partition of within-view and cross-view layers reduces cross-view compute, and the Small model variant handles over 4000 images on a single GPU by offloading intermediate tokens to CPU (DA3 §7.2.3).

**Drift in pairwise global alignment.** Even without an explicit optimisation loop, pairwise DUSt3R runs accumulate inconsistencies when chained through a large coverage graph. The global alignment step corrects scale drift by jointly optimising scale factors and poses across all pairs, but it is a post-hoc step rather than an end-to-end constraint. VGGT and DA3 avoid this by fusing all views in one pass.

**When bundle adjustment remains beneficial.** Feed-forward methods are competitive with classical SfM without any optimisation. Where sub-pixel accuracy is required and camera parameters are known, classical bundle adjustment still provides a substantial accuracy gain. On DTU, DUSt3R without GT poses achieves 1.74 mm overall error versus 0.295 mm for the best method with GT cameras (DUSt3R Table 4). VGGT with an optional subsequent BA pass lifts AUC@10° from 71.26% to 84.91% on IMC (VGGT Table 10), demonstrating that feed-forward initialisation and iterative refinement are complementary rather than mutually exclusive.

# Where it appears

The following model pages on this atlas implement the feed-forward 3D reconstruction paradigm:

**DUSt3R** — the method that established pairwise pointmap regression; the first published demonstration that a single network pass jointly solves correspondence, depth, and relative pose without calibration. On CO3D v2 (10 frames) it achieves mAA@30 = 76.7, substantially outperforming prior regression-based multi-view pose methods (DUSt3R Table 2).

**MASt3R** — extends DUSt3R with a dense descriptor head trained by InfoNCE, achieving pixel-accurate correspondences alongside geometric grounding. State-of-the-art on map-free relocalization (93.3% VCRE AUC versus 63.4% for LoFTR+KBR) and zero-shot DTU reconstruction (0.374 mm Chamfer distance) (MASt3R Tables 2–3).

**VGGT** — a 1.2 B-parameter alternating-attention transformer that processes 1 to hundreds of views in a single 0.2 s forward pass, predicting cameras, depth maps, point maps, and tracking features jointly; CVPR 2025 Best Paper. Feed-forward VGGT achieves AUC@30 of 85.3% on RealEstate10K and 88.2% on CO3D v2, surpassing all prior methods that do not use bundle adjustment (VGGT Table 1).

**Depth Anything 3** — a DINOv2-backbone model using the depth-ray minimal representation. Using the Giant variant (1.13 B parameters), it surpasses VGGT by an average of 35.7% in camera pose accuracy (AUC@3°) and 25.1% in geometric reconstruction accuracy (F1) on the five-dataset any-view visual geometry benchmark (DA3 §7.1, Tables 2–3). The depth-ray formulation also collapses cleanly to monocular depth estimation when $N = 1$.

These methods stand as learned alternatives to the [bundle-adjustment](/atlas/bundle-adjustment) pipeline: where bundle adjustment minimises 2D reprojection error with sparse Jacobians over known correspondences, feed-forward methods predict geometry directly from pixels without correspondences as an intermediate representation.

# References

1. S. Wang, V. Leroy, Y. Cabon, B. Chidlovskii, J. Revaud. *DUSt3R: Geometric 3D Vision Made Easy.* arXiv:2312.14132, 2023.
2. V. Leroy, Y. Cabon, J. Revaud. *Grounding Image Matching in 3D with MASt3R.* arXiv:2406.09756, 2024.
3. J. Wang, M. Chen, N. Karaev, A. Vedaldi, C. Rupprecht, D. Novotný. *VGGT: Visual Geometry Grounded Transformer.* arXiv:2503.11651, 2025. CVPR 2025 Best Paper.
4. H. Lin, S. Chen, J. Liew, D. Y. Chen, Z. Li, G. Shi, J. Feng, B. Kang. *Depth Anything 3: Recovering the Visual Space from Any Views.* arXiv:2511.10647, 2025.
