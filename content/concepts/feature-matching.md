---
title: "Feature Matching"
date: 2026-05-16
summary: "Establishing keypoint correspondences between two images by comparing descriptors and resolving them into a consistent partial assignment — from the ratio test to learned optimal-transport matchers."
tags: ["local-descriptors"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites:
  - feature-descriptors
  - attention-mechanism
sources:
  primary: lowe2004-sift
  references:
    - sarlin2020-superglue
    - lindenberger2023-lightglue
    - sun2021-loftr
    - detone2018-superpoint
---

# Definition

Feature matching establishes correspondences between keypoints or image regions across two images by comparing their local descriptors and resolving those comparisons into a consistent partial assignment. Given two images $A$ and $B$, let $\mathcal{F}^A = \{(p_i, d_i)\}_{i=1}^{M}$ and $\mathcal{F}^B = \{(p_j, d_j)\}_{j=1}^{N}$ be the sets of detected keypoints with positions $p$ and descriptor vectors $d$. The output is a correspondence set together with unmatched designations for points that have no reliable counterpart.

:::definition[Nearest-neighbour feature matching]
Given descriptor sets $\{d_i\}_{i=1}^{M}$ and $\{d_j\}_{j=1}^{N}$, the nearest-neighbour correspondence for keypoint $i \in A$ is

$$\hat{j}(i) = \underset{j \in \mathcal{B}}{\arg\min}\; \|d_i - d_j\|,$$

where $\|\cdot\|$ is an appropriate distance metric. The correspondence $(i, \hat{j}(i))$ is accepted into the match set $\mathcal{M}$ only when it satisfies an additional filtering criterion; otherwise keypoint $i$ is left unmatched. Input: two finite descriptor sets and a distance metric. Output: a partial injective map $\mathcal{M} \subseteq \mathcal{A} \times \mathcal{B}$ with $|\mathcal{M}| \leq \min(M, N)$.
:::

The partial-assignment constraint — each keypoint matched to at most one counterpart — distinguishes feature matching from dense correspondence, where every pixel participates. Three paradigms govern how the assignment is formed: hand-crafted filtering of nearest-neighbour distances; learned optimal-transport over context-enriched descriptors; and detector-free dense matching, in which keypoint positions are not fixed beforehand.

# Mathematical Description

## Nearest-neighbour matching and the ratio test

The simplest filter is the ratio test. For each keypoint $i \in A$, the two nearest neighbours in $B$ are retrieved — the closest $d_{j_1}$ and the second closest $d_{j_2}$ — and the match is accepted if

$$\frac{\|d_i - d_{j_1}\|}{\|d_i - d_{j_2}\|} < \rho,$$

with $\rho = 0.8$ on 128-dimensional $L_2$-normalised SIFT descriptors. At this threshold roughly 90% of false matches are eliminated with less than 5% loss of correct matches. The ratio test exploits the geometry of descriptor space: a distinctive match has a uniquely close neighbour and a well-separated runner-up; an ambiguous match has two similarly close candidates and a ratio near 1. An alternative, parameter-free filter is mutual (cross-check) consistency: $(i, j)$ is retained only when each is the other's nearest neighbour.

## Assignment as an optimal-transport problem

Nearest-neighbour matching treats each keypoint independently, ignoring the global structure of the assignment. SuperGlue reframes matching as a partial optimal-transport problem on an $(M+1) \times (N+1)$ cost matrix, whose extra row and column form a "dustbin" absorbing unmatched keypoints. Each descriptor is first enriched by an attentional graph neural network with $L = 9$ alternating self-attention (intra-image) and cross-attention (inter-image) layers, each applying a residual update

$$x_i^{(\ell+1)} = x_i^{(\ell)} + \mathrm{MLP}\!\left(x_i^{(\ell)} \,\|\, \textstyle\sum_{j} \alpha_{ij} v_j\right), \quad \alpha_{ij} = \mathrm{Softmax}_j(q_i^\top k_j),$$

with per-layer query/key/value projections. Pairwise scores $S_{ij} = \langle f_i^A, f_j^B \rangle$ are formed from the final matching descriptors, and the augmented score matrix is passed to the Sinkhorn algorithm for $T = 100$ iterations, yielding a soft partial assignment $P \in [0,1]^{M \times N}$; a confidence threshold $\tau = 0.2$ converts it to discrete correspondences.

LightGlue keeps the graph-attention framework but replaces the Sinkhorn solver with a dual-softmax gated by a per-point matchability score $\sigma_i = \mathrm{Sigmoid}(\mathrm{Linear}(x_i))$:

$$P_{ij} = \sigma_i^A \cdot \sigma_j^B \cdot \mathrm{Softmax}_{k \in A}(S_{kj})_i \cdot \mathrm{Softmax}_{k \in B}(S_{ik})_j.$$

A per-point confidence head drives an early-exit mechanism: when enough points are confident, computation halts before all 9 layers run. On MegaDepth the average stopping layer is 5.7 of 9, giving roughly a third less run time.

## Detector-free dense matching

LoFTR discards the detect-then-match pipeline. A shared CNN backbone extracts coarse feature maps at $1/8$ resolution and fine maps at $1/2$ resolution; interleaved self- and cross-attention layers — using a linear-attention approximation to reduce cost from $O(N^2)$ to $O(N)$ — transform the coarse maps into context-dependent representations. The pairwise score is

$$\mathcal{S}(i, j) = \tfrac{1}{\tau} \langle \tilde{F}^A_{\mathrm{tr}}(i),\, \tilde{F}^B_{\mathrm{tr}}(j) \rangle,$$

with temperature $\tau$. Coarse matches are selected by a confidence threshold plus mutual-nearest-neighbour criterion, then each is refined by a correlation-based module that crops a local window from the fine maps to produce a sub-pixel correspondence. Because no detector fires, matches emerge even in low-texture regions where keypoint repeatability collapses.

# Numerical Concerns

**Ratio-threshold selection.** $\rho = 0.8$ is calibrated for $L_2$-normalised 128-D SIFT descriptors. It does not transfer without recalibration to binary descriptors (which require Hamming distance), to higher-dimensional descriptors, or to unnormalised embeddings. Tightening $\rho$ raises precision at the cost of recall; it must be re-swept when the descriptor changes.

**Distance metric choice.** Euclidean distance suits real-valued normalised descriptors; binary descriptors require Hamming distance. Mixing metric and descriptor type silently produces meaningless distances and catastrophic matching failure.

**Descriptor ambiguity in repetitive texture.** Periodic textures generate descriptors that are mutually similar across repetition periods; the ratio test fails when several competitors are equidistant and the ratio approaches 1. The downstream inlier fraction falls well below the level RANSAC needs for reliable convergence. Attention-based matchers partially mitigate this by propagating global scene context, but precision still degrades under severe repetition.

**Cost-matrix conditioning.** The Sinkhorn algorithm operates on the exponential of the score matrix, which grows rapidly with score magnitude; a numerically stable log-domain implementation is required. SuperGlue's matching descriptors are deliberately not $L_2$-normalised — their magnitude encodes confidence — so scores are unbounded and low-precision inference can accumulate error in the log-sum-exp.

**Unmatched handling.** SuperGlue's dustbin is a single learned scalar filling the augmented row and column; its magnitude relative to the matching scores controls how aggressively unmatched points are absorbed, and a poor initialisation either suppresses all matches or ignores outlier rejection. LightGlue's explicit matchability score decouples unmatchability from similarity, making the behaviour more interpretable.

**Coarse-to-fine alignment.** A detector-free matcher cannot recover a coarse match whose predicted position error exceeds the fine refinement window; errors in the coarse stage are fatal. Classical pipelines that stop at the nearest-neighbour step are limited to integer keypoint accuracy unless a separate sub-pixel peak-fitting stage is added.

# Where it appears

Feature matching is the shared middle-end linking keypoint/descriptor front-ends to geometric estimation back-ends such as RANSAC and pose solvers.

- [sift](/atlas/sift) — the reference implementation of nearest-neighbour matching with the ratio test; Lowe's $\rho = 0.8$ on 128-D descriptors eliminates roughly 90% of false matches with under 5% correct-match loss.
- [superglue](/atlas/superglue) — replaces the ratio test with an optimal-transport assignment over GNN-enriched descriptors; the Sinkhorn matching layer jointly assigns correspondences and rejects unmatched keypoints via the dustbin.
- [lightglue](/atlas/lightglue) — an adaptive-depth successor that swaps Sinkhorn for dual-softmax with matchability gating and early exit, reaching comparable accuracy at over twice the speed.
- [loftr](/atlas/loftr) — the detector-free paradigm: correspondences emerge from transformer-enriched dense feature maps, making it the reference matcher for low-texture and textureless scenes.

The learned front-end [superpoint](/atlas/superpoint) supplies the repeatable keypoints and descriptors that both SuperGlue and LightGlue consume, and [xfeat](/atlas/xfeat) ships its own lightweight mutual-nearest-neighbour matcher.

# References

1. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 60(2):91–110, 2004.
2. P.-E. Sarlin, D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperGlue: Learning Feature Matching with Graph Neural Networks.* IEEE CVPR, 2020.
3. P. Lindenberger, P.-E. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* IEEE ICCV, 2023.
4. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* IEEE CVPR, 2021.
5. D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperPoint: Self-Supervised Interest Point Detection and Description.* IEEE CVPR Workshops, 2018.
