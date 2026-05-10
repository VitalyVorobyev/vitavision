---
paper_id: sarlin2020-superglue
title: "SuperGlue: Learning Feature Matching with Graph Neural Networks"
authors: ["P. Sarlin", "D. DeTone", "T. Malisiewicz", "A. Rabinovich"]
year: 2020
url: https://arxiv.org/pdf/1911.11763
created: 2026-05-09
relevant_atlas_pages: [superpoint, sift, orb, xfeat, fischler-bolles-ransac, ransac, barath-magsac, loftr]
---

# Setting

**Problem class.** Feature matching: given two images $A$ and $B$, each with a set of detected local features $(p_i, d_i)$ — position $p_i := (x, y, c)_i$ (image coordinates + detection confidence) and visual descriptor $d_i \in \mathbb{R}^D$ — produce a partial assignment that maps each keypoint in $A$ to at most one keypoint in $B$ (or marks it unmatched) and vice versa. Image $A$ has $M$ keypoints indexed by $\mathcal{A} = \{1, \ldots, M\}$; image $B$ has $N$ keypoints indexed by $\mathcal{B} = \{1, \ldots, N\}$.

**Inputs.** Any sparse local features: keypoint positions, detection confidences, and $D$-dimensional descriptors (paper uses SuperPoint 256-D or root-SIFT 128-D). Image type is unrestricted (indoor, outdoor, day-night). No calibration or depth required at inference time.

**Outputs.** A partial soft assignment matrix $P \in [0,1]^{M \times N}$ with row sums $\leq 1$ and column sums $\leq 1$. At threshold $\tau = 0.2$ (paper default), entries above threshold yield the final discrete correspondence set with a confidence value per match. Unmatched keypoints are assigned to a "dustbin."

# Core idea

SuperGlue recasts feature matching as an optimal transport problem whose cost is learned by a Graph Neural Network (GNN). Rather than matching descriptors by nearest-neighbour search and then filtering outliers, SuperGlue simultaneously aggregates context, assigns correspondences, and rejects unmatched points in a single differentiable architecture.

The first block — the **Attentional GNN** — enriches each keypoint's initial representation $x_i^{(0)} = d_i + \text{MLP}_{\text{enc}}(p_i)$ (Eq. 2) by alternating $L = 9$ layers of self-attention (intra-image) and cross-attention (inter-image). At each layer $\ell$, the residual update is:

$$
x_i^{(\ell+1)} = x_i^{(\ell)} + \text{MLP}\!\left(x_i^{(\ell)} \,\|\, m_{\mathcal{E} \to i}\right), \quad m_{\mathcal{E} \to i} = \sum_{j:(i,j)\in\mathcal{E}} \alpha_{ij} v_j \quad \text{(Eqs. 3–4)}
$$

where $\alpha_{ij} = \text{Softmax}_j(q_i^\top k_j)$ are attention weights and $(q_i, k_j, v_j)$ are query/key/value projections with independent parameters per layer (Eq. 5). Multi-head attention (4 heads) is used in practice.

The second block — the **Optimal Matching Layer** — computes pairwise scores $S_{i,j} = \langle f_i^A, f_j^B \rangle$ (Eq. 7) from the final matching descriptors $f_i = W \cdot x_i^{(L)} + b$ (Eq. 6), augments the $M \times N$ score matrix with dustbin rows and columns (filled with a single learned scalar $z$, Eq. 8), and solves the resulting entropy-regularised optimal transport problem via the Sinkhorn algorithm for $T = 100$ iterations, yielding the partial assignment $P$.

The dustbin receives all unmatched keypoints: each dustbin in $A$ has $N$ "expected matches" (one per keypoint in $B$) and each dustbin in $B$ has $M$ expected matches (Eq. 9). This enforces partial assignment rather than forcing every keypoint to be matched.

Training loss is the negative log-likelihood of the augmented assignment $\bar{P}$ over ground-truth matches $\mathcal{M}$ and unmatched sets $\mathcal{I}$, $\mathcal{J}$ (Eq. 10):

$$
\mathcal{L} = -\sum_{(i,j)\in\mathcal{M}} \log \bar{P}_{i,j} - \sum_{i \in \mathcal{I}} \log \bar{P}_{i,N+1} - \sum_{j \in \mathcal{J}} \log \bar{P}_{M+1,j}
$$

Ground-truth correspondences are derived from relative poses + depth (ScanNet, MegaDepth) or synthetic homographies. The network is trained end-to-end; the descriptor network (e.g. SuperPoint) is not updated during SuperGlue training by default (§4), though backpropagation through it is demonstrated to improve AUC@20° from 51.84 to 53.38 on ScanNet (§5.4).

# Assumptions

1. **Local feature pre-extraction.** SuperGlue is a middle-end; it requires pre-computed keypoint positions and descriptors. Descriptor quality is a ceiling on matching quality — thin-texture or textureless regions yield few repeatable keypoints regardless of matcher.
2. **Static scene.** Ground-truth correspondence generation assumes a rigid scene (one epipolar transform per image pair, §3). Moving objects produce incorrect supervision labels and confuse the cross-attention mechanism at test time.
3. **Partial overlap.** The method assumes some keypoints in each image have no correspondence (occlusion, failure of the detector). The dustbin handles this, but if overlap is near 100% the dustbin provides less regularisation — not a hard failure, but an untested boundary.
4. **Single camera pair at a time.** The GNN processes one image pair per forward pass. Multi-image consistency (loop closure, bundle adjustment) is not enforced by the architecture; it must be handled by the back-end (SfM/SLAM).
5. **GPU inference for real-time use.** At 512 keypoints per image: ~69 ms on NVIDIA GTX 1080 (15 FPS, §4). The Sinkhorn layer ($T = 100$ iterations of row/column normalisation over an $(M+1) \times (N+1)$ matrix) is the second-largest cost block alongside the GNN (Fig. 11 — the two blocks have similar computational costs).
6. **Descriptor dimension $D = 256$.** All intermediate representations share this dimension, matching SuperPoint's output. When using SIFT (128-D), a projection to 256-D is implied (? — the paper uses "root-normalized SIFT" but does not explicitly state the projection step).

# Failure regime

- **Textureless or low-contrast regions.** Both the detector (front-end) and the GNN struggle when keypoints are absent or unrepeatable. SuperGlue operates on the keypoints it receives; it cannot hallucinate new ones.
- **Very large viewpoint or scale changes without sufficient keypoints.** In ScanNet ablation (§5.4), the full 9-layer model significantly outperforms the 3-layer variant (AUC@20° 51.84 vs 46.93), suggesting that very challenging pairs with few good candidates require depth in the GNN. At the extreme — 0 covisible keypoints — the dustbin absorbs everything.
- **Repeated textures (e.g. windows, brick).** Self-attention can identify self-similar patterns; cross-attention can find candidate matches in the other image. SuperGlue is specifically shown to handle repeating patterns (Fig. 10 — day-night facade matching of windows). The risk is residual false matches that pass the confidence threshold when many near-identical descriptors compete.
- **Fast-moving objects in the scene (dynamic clutter).** The model was trained on static-scene correspondences. Moving foreground objects violate the epipolar constraint and produce false confidence in the GNN (no explicit mechanism to detect motion).
- **Very large keypoint counts.** The GNN's $O(M \cdot N)$ cross-attention and Sinkhorn over the $(M+1) \times (N+1)$ matrix become expensive. At 2048 keypoints per image: 270 ms on GTX 1080 (~3.7 FPS, Fig. 11).
- **CPU-only inference.** No timing for CPU is reported. The Sinkhorn iterations are GPU-parallelised log-domain operations; CPU inference is likely an order of magnitude slower.
- **Exact failure case observed:** when all keypoints of a very low-overlap pair end up in the dustbin (e.g. scene0737, Fig. 14 appendix), pose estimation is undefined — FAIL. This can happen when the scene boundary is completely outside the other image's frustum.

# Numerical sensitivity

- **Sinkhorn convergence.** The Sinkhorn algorithm operates on $\exp(\bar{S})$, which grows exponentially with score magnitude. The paper uses the numerically stable log-domain variant (entropy-regularized optimal transport, §3.2 references [12, 39]). $T = 100$ iterations are used. Fewer iterations (e.g. in early training) yield a coarser approximation; the authors mention differentiability is key (§3.2: "differentiable version of the Hungarian algorithm").
- **Dustbin score $z$.** A single learned scalar filling the entire augmented row/column (Eq. 8). Its magnitude relative to the matching scores determines how aggressively keypoints are assigned to the dustbin. Small initialisation: if $z$ starts too negative, the network cannot initially express confident matches; too large, and it suppresses all matches. Behaviour during training convergence is not reported numerically.
- **Matching descriptor magnitude.** Unlike normalised visual descriptors, the matching descriptors $f_i^A$ are NOT L2-normalised (§3.2: "the matching descriptors are not normalized, and their magnitude can change per feature and during training to reflect the prediction confidence"). The inner-product score $S_{i,j} = \langle f_i^A, f_j^B \rangle$ can grow without bound — score explosion is mitigated by the Sinkhorn normalisation, but numerical precision of the log-sum-exp operations may matter in 16-bit inference.
- **Attention weight saturation.** Softmax over all $M$ or $N$ keypoints. For very large $M$, attention weights become nearly uniform if keys are similar, reducing effective aggregation. Multi-head design (4 heads) provides diversity but no explicit prevention of saturation.
- **Confidence threshold $\tau = 0.2$.** The paper uses this fixed value (§4). Changing it trades precision for recall; for downstream RANSAC this threshold matters as RANSAC's efficiency depends on the inlier ratio.

# Applicability

- **Use when:** you want maximum correspondence quality and have a GPU; you are building an SfM or SLAM pipeline where matching quality is the bottleneck; you use SuperPoint as front-end (the systems are co-designed and complement each other — repeatable SuperPoint keypoints maximise the number of correct matches SuperGlue can produce, §5.2).
- **Use when:** wide-baseline indoor or outdoor image matching under large viewpoint and illumination changes. SuperGlue is specifically evaluated on ScanNet (indoor, wide baseline) and MegaDepth/PhotoTourism (outdoor, phototourism wide baseline) with SOTA results at the time (2020).
- **Use when:** you need a plug-in replacement for nearest-neighbour + ratio-test / mutual-check — SuperGlue is a drop-in middle-end between any local feature front-end and a pose-estimation back-end.
- **Don't use when:** CPU-only inference or embedded deployment is required — use LightGlue (a later distilled successor, not covered in this paper) or XFeat's lightweight descriptor matching.
- **Don't use when:** real-time dense matching is needed — SuperGlue produces sparse correspondences at the keypoint positions only.
- **Don't use when:** keypoints cannot be extracted (e.g. purely textureless scenes) — SuperGlue has nothing to match.
- **Compared against:** NN + mutual check, NN + ratio test, PointCN [33], OANet [71], NG-RANSAC [7], ContextDesc [32]; also compared implicitly to LoFTR (later dense method; not in this paper) in subsequent literature.

# Connections

- Builds on: [detone2018-superpoint] (primary front-end pairing; dustbin concept; 256-D descriptor convention), [vaswani2017-transformer (ref. 61 in paper — Transformer self-attention)], [cuturi2013-sinkhorn (ref. 12 — Sinkhorn algorithm)], [peyre2019-computational-ot (ref. 39 — optimal transport)]
- Enables: downstream SfM/SLAM pipelines; visual localization (Aachen Day-Night, Table 7); later work LightGlue (2023, Lindenberger et al.) and GlueStick

# Atlas update plan

## NEW: superglue
Type: model
Category: feature_matching
Primary source: sarlin2020-superglue

- **Goal.** Learn to match two sets of sparse local features by jointly finding correspondences and rejecting unmatched keypoints in a single differentiable forward pass. SuperGlue is a "learnable middle-end" that replaces hand-crafted nearest-neighbour search + ratio test / mutual check heuristics with a GNN trained end-to-end on ground-truth image-pair correspondences.

- **Architecture.**
  - Two-block architecture (Fig. 3): (1) Attentional Graph Neural Network, (2) Optimal Matching Layer.
  - **Keypoint Encoder** (Eq. 2): a 5-layer MLP maps the 3-D position $p_i = (x, y, c)$ (image coordinates + detection confidence) to a $D$-dimensional embedding added to the visual descriptor $d_i$, producing the initial node state $x_i^{(0)} = d_i + \text{MLP}_{\text{enc}}(p_i)$. MLP has layers mapping to dimensions $(32, 64, 128, 256, D)$, ~100k parameters.
  - **Multiplex GNN** (Eqs. 3–5): $L = 9$ alternating attention layers. Odd layers aggregate self-edges (intra-image, self-attention); even layers aggregate cross-edges (inter-image, cross-attention). Each layer is a residual message-passing update with multi-head attention (4 heads, $D = 256$). Per-layer parameters: ~0.66M. Total GNN parameters: ~12M.
  - **Optimal Matching Layer** (Eqs. 7–9): scores all $M \times N$ keypoint pairs as inner products $S_{i,j} = \langle f_i^A, f_j^B \rangle$ of (non-normalised) final matching descriptors. Score matrix augmented with dustbin row/column (a single learned scalar $z$, Eq. 8). **Sinkhorn algorithm** ($T = 100$ iterations) solves the entropy-regularised optimal transport problem, producing the soft partial assignment $\bar{P}$; dustbins are dropped to yield $P = \bar{P}_{1:M,\,1:N}$.

- **Training.** Supervised negative log-likelihood loss (Eq. 10) on ground-truth correspondences derived from: (a) synthetic homographies + 1M Oxford/Paris distractor images for homography estimation, (b) ScanNet poses + depth maps for indoor, (c) MegaDepth poses + MVS depth for outdoor. Adam optimiser, lr $10^{-4}$, decayed exponentially after 200k/100k/50k iterations depending on dataset. SuperPoint descriptor weights are frozen during SuperGlue training by default; end-to-end training through SuperPoint improves indoor AUC@20° from 51.84 to 53.38 (§5.4).

- **Implementations.** Official Magic Leap PyTorch release: `github.com/magicleap/SuperGluePretrainedNetwork` (referenced in §4 and Appendix E). License: ? (the SuperPoint repo from the same organisation is noncommercial-research-only; the SuperGlue repo is expected to carry the same restriction but must be verified at the repo).

- **Assessment.**
  - Real-time on GPU: 69 ms (15 FPS) for ~512-keypoint indoor pairs on GTX 1080; 87 ms at 512 kp, 270 ms at 2048 kp (Fig. 11, Appendix C). GNN and Sinkhorn layer have roughly equal cost.
  - Indoor pose estimation (ScanNet): SuperPoint+SuperGlue achieves AUC@20° = 51.84% vs next-best SuperPoint+OANet 43.85% — a 7.99 pp improvement (Table 2).
  - Outdoor pose estimation (PhotoTourism): SuperPoint+SuperGlue AUC@20° = 64.16%, precision 84.9% vs SuperPoint+OANet 46.88% (Table 3).
  - Homography estimation: 98.3% recall, 90.7% precision with SuperPoint (Table 1) — so good that DLT (no robust estimator) outperforms RANSAC on SuperGlue's outputs.
  - Visual localization (Aachen Day-Night): SuperPoint+SuperGlue matches or beats all contemporaries using only 4096 keypoints/image (Table 7, Appendix B).
  - Ablation (Table 4): removing the GNN entirely leaves AUC@20° = 38.56%; removing cross-attention: 42.57%; removing positional encoding: 47.12%; 3-layer GNN: 46.93%; full 9-layer: 51.84%. Cross-attention and positional encoding are the most critical components after the GNN itself.

- **Relations.**
  ```
  Relations:
  - { type: compared_with, target: loftr, confidence: high }
  ```

## UPDATE: superpoint
Section: Relations / typed relations
- Add `{ type: feeds_into, target: superglue, confidence: high, caution: "SuperGlue is the canonical learned matcher paired with SuperPoint." }` to superpoint's `relations[]`.

# Provenance

- §1 (Abstract + Introduction): "matches two sets of local features by jointly finding correspondences and rejecting non-matchable points"; "learnable middle-end"; "performs matching in real-time on a modern GPU"; "github.com/magicleap/SuperGluePretrainedNetwork"
- §3 (Architecture overview): Fig. 3 caption — "L times" alternating self/cross attention; "Sinkhorn Algorithm (for T iterations)"; "dustbin"; keypoint encoder maps $p_i$ and $d_i$ to initial representation; M, N keypoints in images A, B.
- Eq. 1: partial assignment constraints $P\mathbf{1}_N \leq \mathbf{1}_M$ and $P^\top\mathbf{1}_M \leq \mathbf{1}_N$
- Eq. 2: keypoint encoder $x_i^{(0)} = d_i + \text{MLP}_{\text{enc}}(p_i)$
- Eqs. 3–4: residual GNN update and attention-weighted message aggregation
- Eq. 5: query/key/value linear projections
- Eq. 6: final matching descriptor $f_i^A = W \cdot {}^{(L)}x_i^A + b$
- Eq. 7: score $S_{i,j} = \langle f_i^A, f_j^B \rangle$
- Eq. 8: dustbin scores $\bar{S}_{i,N+1} = \bar{S}_{M+1,j} = \bar{S}_{M+1,N+1} = z \in \mathbb{R}$
- Eq. 9: augmented assignment constraints $\bar{P}\mathbf{1}_{N+1} = a$, $\bar{P}^\top\mathbf{1}_{M+1} = b$
- Eq. 10: negative log-likelihood training loss
- §4 (Implementation details): $D = 256$, $L = 9$ layers, 4 attention heads, $T = 100$ Sinkhorn iterations, 12M parameters, 69 ms on GTX 1080, confidence threshold $\tau = 0.2$; MLP encoder shape $(32, 64, 128, 256, D)$ with 100k parameters, per-layer 0.66M parameters (Appendix C)
- §5.1 (Table 1): SuperGlue recall 98.3%, precision 90.7% on homography estimation
- §5.2 (Table 2): indoor AUC@20° SuperPoint+SuperGlue 51.84% vs OANet 43.85%
- §5.3 (Table 3): outdoor AUC@20° SuperPoint+SuperGlue 64.16%, precision 84.9%
- §5.4 (Table 4): ablation study — all values for GNN removal, no cross-attention, no positional encoding, 3-layer vs 9-layer variants; end-to-end training AUC improvement 51.84→53.38
- Appendix B (Table 7): Aachen Day-Night visual localization results
- Appendix C (Fig. 11): per-block timing at 256/512/1024/2048 keypoints on GTX 1080
- Appendix E: training hyperparameters (Adam lr $10^{-4}$, decay schedules, batch sizes)
