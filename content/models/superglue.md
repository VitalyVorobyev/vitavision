---
title: "SuperGlue"
date: 2026-05-10
summary: "Graph neural network that matches two sets of sparse local features by jointly finding correspondences and rejecting unmatched keypoints in one differentiable forward pass, trained end-to-end with a Sinkhorn optimal-transport assignment over augmented dustbin scores."
tags: ["computer-vision", "image-matching", "local-features", "graph-neural-network", "attention"]
domain: features
tasks: [local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
params: "~12M"
prerequisites: []
failureModes: []
relations:
  - type: compared_with
    target: loftr
    confidence: high
  - type: extended_by
    target: lightglue
    confidence: high
    caution: "LightGlue retains SuperGlue's graph-attention matcher framework; adds adaptive depth + token pruning + dual-softmax head for >2× speedup at comparable or better accuracy. SuperGlue remains the reference baseline."
sources:
  primary: sarlin2020-superglue
  references:
    - detone2018-superpoint
    - sun2021-loftr
    - lindenberger2023-lightglue
  notes: |
    §3 architecture: Attentional GNN + Optimal Matching Layer. §4 / Eq. 2
    keypoint encoder MLP shape (32, 64, 128, 256, D), ~100k params.
    §4 / Eqs. 3–5 multiplex GNN, L=9 alternating self/cross attention
    layers, 4 heads, D=256, ~0.66M params per layer, ~12M total.
    §3.2 / Eqs. 7–9 optimal matching layer: score $S_{ij} = \langle f_i^A,
    f_j^B \rangle$, dustbin scalar z, Sinkhorn T=100 iterations.
    Eq. 10 NLL loss over augmented assignment $\bar{P}$. §4 Adam lr 1e-4
    decayed. §4 / Appendix C: 69 ms / 15 FPS at 512 kp on GTX 1080;
    270 ms at 2048 kp. §5.2 Table 2 ScanNet AUC@20° 51.84% (vs OANet
    43.85%). §5.3 Table 3 PhotoTourism AUC@20° 64.16%, precision 84.9%.
    §5.4 end-to-end training improves AUC@20° to 53.38%.
implementations:
  - role: official
    repo: https://github.com/magicleap/SuperGluePretrainedNetwork
    commit: ddcf11f42e7e0732a0c4607648f9448ea8d73590
    framework: pytorch
    license: noncommercial-research-only
    weights_url: https://github.com/magicleap/SuperGluePretrainedNetwork/tree/ddcf11f42e7e0732a0c4607648f9448ea8d73590/models/weights
    weights_license: noncommercial-research-only
---

# Motivation

Match two sets of sparse local features — keypoint positions and visual descriptors — across an image pair by jointly finding correspondences and rejecting unmatched keypoints in a single differentiable forward pass. Input: two sets of $(p_i, d_i)$ tuples where $p_i = (x, y, c)$ encodes image coordinates and detection confidence and $d_i \in \mathbb{R}^D$ is a visual descriptor (SuperPoint 256-D or root-SIFT 128-D); image $A$ carries $M$ keypoints, image $B$ carries $N$ keypoints. Output: a partial soft assignment matrix $P \in [0,1]^{M \times N}$ with row sums $\leq 1$ and column sums $\leq 1$; entries above confidence threshold $\tau = 0.2$ yield discrete correspondences. SuperGlue replaces hand-crafted nearest-neighbour search, ratio test, and mutual-check heuristics with a Graph Neural Network trained end-to-end to reason about geometric context, appearance similarity, and partial visibility in one forward pass.

# Architecture

**Family & shape.** GNN-on-set. Input: two sets of $(p_i, d_i)$ tuples — $M$ keypoints from image $A$ and $N$ keypoints from image $B$. Output: partial assignment $P \in [0,1]^{M \times N}$ satisfying $P\mathbf{1}_N \leq \mathbf{1}_M$ and $P^\top\mathbf{1}_M \leq \mathbf{1}_N$ (Eq. 1). The architecture consists of two sequential blocks: an Attentional Graph Neural Network followed by an Optimal Matching Layer.

**Blocks.** The **Keypoint Encoder** (Eq. 2) maps the 3-D position $p_i = (x, y, c)$ through a 5-layer MLP with channel widths $(32, 64, 128, 256, D)$ to a $D$-dimensional embedding, which is added to the visual descriptor $d_i$ to produce the initial node state:

$$
x_i^{(0)} = d_i + \text{MLP}_{\text{enc}}(p_i). \quad \text{(Eq. 2)}
$$

The encoder MLP contributes approximately 100k parameters (§4).

The **Multiplex GNN** runs $L = 9$ alternating attention layers — odd layers aggregate self-edges (intra-image), even layers aggregate cross-edges (inter-image) (§4). Each layer $\ell$ applies a residual message-passing update with multi-head attention (4 heads, $D = 256$) (Eqs. 3–5):

$$
\begin{aligned}
m_{\mathcal{E} \to i} &= \sum_{j:(i,j)\in\mathcal{E}} \alpha_{ij}\,v_j, \quad \alpha_{ij} = \text{Softmax}_j\!\left(q_i^\top k_j\right), \quad \text{(Eqs. 3–4)} \\
x_i^{(\ell+1)} &= x_i^{(\ell)} + \text{MLP}\!\left(x_i^{(\ell)} \,\|\, m_{\mathcal{E} \to i}\right), \quad \text{(Eq. 4)}
\end{aligned}
$$

where $(q_i, k_j, v_j)$ are query/key/value linear projections with independent parameters per layer and per attention type (Eq. 5). Each layer contributes approximately 0.66M parameters; total GNN parameters are approximately 12M (§4).

The **Optimal Matching Layer** first projects the final node states to matching descriptors $f_i^A = W \cdot x_i^{(L)} + b$ (Eq. 6), then computes the $M \times N$ score matrix as inner products $S_{i,j} = \langle f_i^A, f_j^B \rangle$ (Eq. 7). The score matrix is augmented with dustbin rows and columns filled by a single learned scalar $z$ (Eq. 8):

$$
\bar{S}_{i,N+1} = \bar{S}_{M+1,j} = \bar{S}_{M+1,N+1} = z \in \mathbb{R}. \quad \text{(Eq. 8)}
$$

The alternating self/cross attention update in PyTorch notation:

```python
import torch
import torch.nn.functional as F

def attention_update(x_self, x_other, q_proj, k_proj, v_proj, mlp):
    q = q_proj(x_self)                          # (B, M, D)
    k = k_proj(x_other)                         # (B, N, D)
    v = v_proj(x_other)                         # (B, N, D)
    attn = F.softmax(
        torch.einsum("bmd,bnd->bmn", q, k), dim=-1
    )                                           # (B, M, N)  Eqs. 3-4
    msg = torch.einsum("bmn,bnd->bmd", attn, v) # (B, M, D)
    return x_self + mlp(
        torch.cat([x_self, msg], dim=-1)
    )                                           # Eq. 4 residual update
```

:::definition[Optimal-transport assignment]
The Sinkhorn algorithm runs $T = 100$ iterations of alternating row and column log-sum-exp normalisation on the augmented score matrix $\bar{S} \in \mathbb{R}^{(M+1)\times(N+1)}$, solving the entropy-regularised optimal transport problem and yielding the augmented soft assignment $\bar{P}$. Unmatched keypoints are absorbed by the dustbin rows/columns (Eq. 9); the final partial assignment is $P = \bar{P}_{1:M,\,1:N}$.
:::

**Training.** Three data sources: synthetic homographies applied to Oxford and Paris distractor images (1M images) for homography estimation, ScanNet poses + depth maps for indoor matching, and MegaDepth MVS depth for outdoor matching (§4, Appendix E). Loss is the negative log-likelihood of the augmented assignment $\bar{P}$ over ground-truth matches $\mathcal{M}$ and unmatched sets $\mathcal{I}$, $\mathcal{J}$ (Eq. 10):

$$
\mathcal{L} = -\sum_{(i,j)\in\mathcal{M}} \log \bar{P}_{i,j} - \sum_{i \in \mathcal{I}} \log \bar{P}_{i,N+1} - \sum_{j \in \mathcal{J}} \log \bar{P}_{M+1,j}. \quad \text{(Eq. 10)}
$$

Optimiser: Adam, learning rate $10^{-4}$, decayed exponentially after 200k/100k/50k iterations depending on dataset (Appendix E). SuperPoint descriptor weights are frozen during training by default; end-to-end back-propagation through SuperPoint improves indoor AUC@20° from 51.84% to 53.38% on ScanNet (§5.4). Headline metrics: indoor pose AUC@20° 51.84% on ScanNet (Table 2); outdoor pose AUC@20° 64.16% on PhotoTourism (Table 3).

**Complexity.** Approximately 12M parameters total (§4). At ~512 keypoints per image: 69 ms / ~15 FPS on NVIDIA GTX 1080 (§4, Appendix C). At 2048 keypoints per image: 270 ms on the same GPU (Appendix C, Fig. 11). The GNN and Sinkhorn layers carry roughly equal computational cost (Fig. 11).

# Implementations

The official Magic Leap PyTorch release ships pretrained indoor and outdoor model weights; the LICENSE at the pinned commit restricts all use to noncommercial-research-only — see Limitations.

# Assessment

**Novelty.**

- Replaces hand-crafted matching heuristics (mutual nearest-neighbour, Lowe's ratio test, mutual check) with a learned middle-end trained end-to-end on ground-truth image-pair correspondences, requiring no post-hoc outlier filter before RANSAC (§1).
- Joint use of self-attention (intra-image geometric context) and cross-attention (inter-image appearance context) in an alternating multiplex GNN, enabling the network to reason about scene structure and partial visibility simultaneously (Eqs. 3–5).
- Differentiable Sinkhorn optimal transport with a dustbin for unmatched keypoints — partial assignment trained end-to-end without a separate outlier-rejection stage (Eqs. 8–9).

**Strengths.**

- Indoor pose estimation: SuperPoint+SuperGlue achieves AUC@20° 51.84% vs SuperPoint+OANet 43.85% on ScanNet — a 7.99 percentage-point improvement over the next-best learned matcher (Table 2).
- Outdoor pose estimation: AUC@20° 64.16% with precision 84.9% on PhotoTourism, compared to SuperPoint+OANet 46.88% (Table 3).
- Real-time on GPU at a practical keypoint count: 69 ms per pair at ~512 keypoints on GTX 1080 (§4).
- Architecture-agnostic on the descriptor side: demonstrated with both SuperPoint 256-D and root-SIFT 128-D front-ends (§4).

**Limitations.**

- Quadratic memory in keypoint count: cross-attention computes over the full $M \times N$ product, and the Sinkhorn layer operates on an $(M+1) \times (N+1)$ matrix — at 2048 keypoints this reaches 270 ms on GTX 1080 (Fig. 11).
- Restrictive license: the official Magic Leap repository ships code and weights under a noncommercial-research-only agreement; commercial deployment requires a separate licensing arrangement or retraining under a permissive license.
- Inference is bound to one image pair per forward pass: multi-image consistency (loop closure, bundle adjustment) is not enforced by the architecture and must be handled by a separate back-end.
- For new pipelines, [LightGlue](/atlas/lightglue) (Lindenberger et al., 2023) extends this matcher with adaptive depth, token pruning, and a dual-softmax assignment head, achieving over 2× faster matching at equivalent or better pose-estimation accuracy. The LightGlue matcher half is Apache-2.0 (the SuperPoint front-end retains its Magic-Leap restriction either way — see LightGlue's Limitations). SuperGlue is retained as the historical reference and for teams already integrated with the Magic Leap release.

## When to choose SuperGlue over LoFTR

SuperGlue is a detector-dependent matcher: it operates on pre-computed keypoints and descriptors from a front-end such as SuperPoint or SIFT and learns to match the provided sparse set. LoFTR is detector-free and operates directly on dense feature maps, with a coarse-to-fine transformer that establishes correspondences in low-texture regions where detectors fail.

Choose SuperGlue when a reliable front-end detector already provides sufficient keypoints and per-pair latency matters: at ~512 keypoints, SuperGlue runs at 69 ms on GTX 1080 (§4), faster than LoFTR-DS at 116 ms per 640×480 pair on RTX 2080Ti. SuperGlue's quadratic memory in keypoint count caps practical use around 2048 keypoints per image (270 ms at 2048; Appendix C, Fig. 11), but for that regime it remains the strongest learned matcher for sparse-descriptor pipelines on indoor/outdoor pose estimation (Table 2, Table 3).

Choose LoFTR when matching must succeed in textureless or homogeneous regions where keypoint detectors find no repeatable interest points, when commercial deployment requires a permissive license (LoFTR is Apache-2.0; SuperGlue is noncommercial-research-only), or when a 100+ ms per-pair GPU budget is acceptable.

# References

1. P. Sarlin, D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperGlue: Learning Feature Matching with Graph Neural Networks.* CVPR, 2020. [arXiv:1911.11763](https://arxiv.org/pdf/1911.11763)
2. D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperPoint: Self-Supervised Interest Point Detection and Description.* CVPR Workshops, 2018. [arXiv:1712.07629](https://arxiv.org/abs/1712.07629)
3. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* CVPR, 2021. [arXiv:2104.00680](https://arxiv.org/pdf/2104.00680)
4. P. Lindenberger, P. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* ICCV, 2023. [arXiv:2306.13643](https://arxiv.org/pdf/2306.13643)
