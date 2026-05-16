---
title: "LightGlue"
date: 2026-05-10
summary: "Adaptive-depth Transformer matcher for sparse local features: stacks 9 self+cross-attention layers with rotary positional encoding and a per-token confidence head, exits early on easy image pairs, and replaces SuperGlue's Sinkhorn solver with a dual-softmax × matchability assignment head — over 2× faster than SuperGlue at equivalent or better pose-estimation accuracy."
tags: ["local-descriptors", "deep-learning"]
domain: features
tasks: [local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
prerequisites: [feature-matching, attention-mechanism]
failureModes: []
relations:
  - type: compared_with
    target: loftr
    confidence: high
    caution: "Different paradigm — LoFTR is detector-free dense, LightGlue is detector-based sparse. LoFTR wins in textureless regions; LightGlue wins on speed."
sources:
  primary: lindenberger2023-lightglue
  references:
    - sarlin2020-superglue
    - detone2018-superpoint
    - sun2021-loftr
    - lowe2004-sift
  notes: |
    §3 / Eq. 1–2 attention update + message aggregation inherited from
    SuperGlue. §3 / Eq. 3–4 rotary positional encoding R(p_j − p_i) at
    every self-attention layer; learned 2D basis vectors b_k ∈ ℝ², one per
    d/2 = 128 subspace. §3 / Eq. 5 bidirectional cross-attention saves ~2×.
    §3 / Eq. 6 pairwise similarity S_ij = Linear(x_i^A)^⊤ Linear(x_j^B).
    §3 / Eq. 7 matchability σ_i = Sigmoid(Linear(x_i)). §3 / Eq. 8 dual-
    softmax × matchability assignment P_ij. §3 / Eq. 9 per-layer confidence
    c_i = Sigmoid(MLP(x_i)). §3 / Eq. 10 exit criterion (fraction confident
    > α). §3 / Eq. 11 deep-supervision loss averaged over L layers. §4
    L=9 layers, 4 attention heads, d=256, 2k keypoints/img, batch 32 on
    24 GB GPU with mixed precision + gradient checkpointing. §4 pre-train
    on synthetic homographies from 1M images, fine-tune on MegaDepth
    (196 landmarks, 1M images). Table 2 (MegaDepth-1500) LightGlue+SP
    LO-RANSAC AUC 66.7/79.3/87.9 @ 5°/10°/20°, 44.2 ms; adaptive variant
    66.3/79.0/87.9 @ 31.4 ms; SuperGlue 65.8/78.7/87.5 @ 70.0 ms. Table 4
    LightGlue precision 86.8 / recall 96.3 / 19.4 ms vs SuperGlue
    74.6 / 90.5 / 29.1 ms. Table 5 average stopping layer 5.7 (easy 4.7,
    medium 5.5, hard 6.9), per-difficulty speedup 1.86×/1.33×/1.16×,
    aggregate 33% runtime reduction. Figure 1 caption: accuracy "closer to
    the dense matcher LoFTR at an 8× higher speed."
implementations:
  - role: official
    repo: https://github.com/cvg/LightGlue
    commit: edb2b838efb2ecfe3f88097c5fad9887d95aedad
    framework: pytorch
    license: Apache-2.0
    weights_url: https://github.com/cvg/LightGlue/releases/tag/v0.1_arxiv
    weights_license: Apache-2.0
---

# Motivation

Match two sets of sparse local features — keypoint positions and visual descriptors — across an image pair with compute that adapts to the difficulty of the pair. Input: image $A$ with $M$ keypoints and image $B$ with $N$ keypoints, each described by a 2D normalised position $\mathbf{p}_i \in [0,1]^2$ and a descriptor $\mathbf{d}_i \in \mathbb{R}^d$. Output: a soft partial assignment $\mathbf{P} \in [0,1]^{M \times N}$; a correspondence $(i,j)$ is reported when $P_{ij} > \tau$ and $P_{ij}$ is maximal in both its row and column. The defining property is **adaptive depth and width**: after each of $L=9$ identical self+cross-attention layers, a per-point confidence head estimates whether each token's representation is already reliable enough to contribute to the assignment. When the fraction of confident tokens exceeds a threshold $\alpha$, the network exits early — no subsequent layers are computed. Tokens that are both confident and classified as unmatchable are pruned before the next layer, reducing the quadratic attention cost at each step. Easy image pairs exit after roughly 4–5 layers; hard pairs run all 9, matching SuperGlue's depth at no extra cost. Replacing SuperGlue's Sinkhorn optimal-transport solver with a lightweight dual-softmax and matchability head allows supervision at every layer, which stabilises training and enables the early-exit mechanism.

# Architecture

**Family & shape.** GNN-on-set with adaptive depth. Input: two sets of $(p_i, d_i)$ tuples — $M$ tokens from image $A$, $N$ tokens from image $B$. Output: partial assignment $\mathbf{P} \in [0,1]^{M \times N}$ derived from a dual-softmax product gated by per-token matchability scores. The model is descriptor-agnostic; separate weights are trained for each front-end (SuperPoint, DISK, SIFT, ALIKED, DoGHardNet).

**Blocks.** The network is a stack of $L=9$ identical layers, each consisting of a self-attention sub-layer followed by a cross-attention sub-layer, sharing the residual structure from SuperGlue (Eq. 1–2):

$$
x_i^I \leftarrow x_i^I + \text{MLP}\!\left([x_i^I \mid m_i^{I \leftarrow S}]\right), \quad m_i^{I \leftarrow S} = \textstyle\sum_j \text{Softmax}_k(a_{ik}^{IS})_j \, \mathbf{W} x_j^S.
$$

Self-attention uses **rotary positional encoding** (RoPE-style, Eq. 3–4): the score between tokens $i$ and $j$ is $a_{ij} = q_i^\top \mathbf{R}(\mathbf{p}_j - \mathbf{p}_i)\, k_j$, where $\mathbf{R}(\cdot)$ is a block-diagonal rotation matrix built from learned 2D basis vectors $b_k \in \mathbb{R}^2$ (one per $d/2 = 128$ subspace). Relative geometry is thus encoded at every self-attention layer rather than injected once at input. Cross-attention exploits bidirectionality (Eq. 5): $a_{ij}^{IS} = k_i^I \cdot (k_j^S)^\top = a_{ji}^{SI}$, so the similarity matrix is computed once for both directions, saving a factor of approximately 2 on the most expensive step. The architecture uses 4 attention heads and a descriptor dimension of $d=256$ throughout (§4).

At each layer, two lightweight heads are applied to each token's updated representation:

- **Matchability head** (Eq. 7): $\sigma_i = \text{Sigmoid}(\text{Linear}(x_i)) \in [0,1]$ — probability that point $i$ has a valid correspondent in the other image.
- **Confidence head** (Eq. 9): $c_i = \text{Sigmoid}(\text{MLP}(x_i)) \in [0,1]$ — estimate of whether point $i$'s representation has converged.

The final assignment head computes the soft partial assignment using dual-softmax gated by matchability (Eq. 6–8). The pairwise similarity is $\mathbf{S}_{ij} = \text{Linear}(x_i^A)^\top \text{Linear}(x_j^B)$ (Eq. 6), and the assignment matrix is:

$$
\mathbf{P}_{ij} = \sigma_i^A \cdot \sigma_j^B \cdot \text{Softmax}_{k \in A}(\mathbf{S}_{kj})_i \cdot \text{Softmax}_{k \in B}(\mathbf{S}_{ik})_j. \quad \text{(Eq. 8)}
$$

This disentangles similarity (the dual-softmax factor) from matchability ($\sigma_i^A \sigma_j^B$), in contrast to SuperGlue's dustbin, which entangles the two into a single Sinkhorn matrix entry. The lightweight head admits supervision at every layer rather than only at the final one (Eq. 11 training loss).

The dual-softmax assignment head with matchability gating in PyTorch notation:

```python
import torch
import torch.nn.functional as F

def assign(x_a: torch.Tensor, x_b: torch.Tensor,
           sim_proj: torch.nn.Linear,
           match_proj: torch.nn.Linear) -> torch.Tensor:
    # x_a: (B, M, D)  x_b: (B, N, D)
    fa = sim_proj(x_a)                              # (B, M, D)
    fb = sim_proj(x_b)                              # (B, N, D)
    S = torch.einsum("bmd,bnd->bmn", fa, fb)        # (B, M, N)  Eq. 6
    sigma_a = torch.sigmoid(match_proj(x_a))        # (B, M, 1)  Eq. 7
    sigma_b = torch.sigmoid(match_proj(x_b))        # (B, N, 1)  Eq. 7
    P = (F.softmax(S, dim=1)                        # softmax over A  Eq. 8
         * F.softmax(S, dim=2)                      # softmax over B
         * sigma_a                                  # matchability A
         * sigma_b.transpose(1, 2))                 # matchability B
    return P                                        # (B, M, N)
```

**Training.** Pre-training uses synthetic homographies applied to 1M images; fine-tuning uses MegaDepth (196 landmarks, 1M images) with ground-truth correspondences from camera poses and depth (§4). Training is performed with mixed precision (FP16/FP32) and gradient checkpointing on a single 24 GB GPU with a batch size of 32 image pairs (§4). The loss (Eq. 11) is the negative log-likelihood of correct matches plus $\log(1 - \sigma_i)$ for unmatchable points, averaged over all $L=9$ layers (deep supervision). Two training phases: first the transformer layers are trained with supervision at the final layer only; then the matchability and confidence classifiers are trained with per-layer supervision while the transformer layers are frozen. On MegaDepth-1500 (Table 2), LightGlue+SuperPoint achieves LO-RANSAC AUC of 66.7 / 79.3 / 87.9 at pose thresholds 5° / 10° / 20°, at a mean matching time of 44.2 ms. The adaptive variant reaches 66.3 / 79.0 / 87.9 at 31.4 ms — over 2× faster than SuperGlue's 65.8 / 78.7 / 87.5 at 70.0 ms (Table 2). Ablation results (Table 4) show LightGlue at precision 86.8, recall 96.3, time 19.4 ms versus SuperGlue at 74.6 / 90.5 / 29.1 ms.

**Complexity.** The model has $L=9$ layers, 4 attention heads, and $d=256$ throughout (§4). No explicit parameter count is stated in the paper. Adaptive depth reduces mean run time by 33% across a MegaDepth test set (Table 5): average stopping layer is 5.7 out of 9 (easy pairs: 4.7, medium: 5.5, hard: 6.9), yielding per-difficulty speedups of 1.86×, 1.33×, and 1.16× respectively. For up to 2K keypoints per image, LightGlue is faster than both SuperGlue and SGMNet (§5.4). Cross-attention memory scales as $O(NMd)$; at $N=M=4096$ and $d=256$, the similarity matrix alone requires approximately 272 MB in float32.

# Implementations

The official `cvg/LightGlue` PyTorch package ships pretrained matcher weights for SuperPoint, DISK, SIFT, ALIKED, and DoGHardNet front-ends; the matcher code and the `*_lightglue.pth` checkpoints are Apache-2.0, but the bundled SuperPoint inference file and its Magic Leap pretrained weights are noncommercial-research-only — see Limitations before pairing with SuperPoint in a commercial pipeline.

# Assessment

**Novelty.**

- Replaces SuperGlue's Sinkhorn optimal-transport solver with a dual-softmax product gated by per-token matchability scores (Eq. 8), disentangling similarity from matchability and enabling per-layer supervision via the lightweight head (Eq. 11) — a capability the Sinkhorn dustbin forecloses.
- Introduces adaptive depth (Eq. 10 exit criterion) and per-layer token pruning as first-class mechanisms in a learned sparse matcher; prior work (including SGMNet) applied clustering-based pruning without per-layer depth control.
- Replaces the absolute MLP positional encoding from SuperGlue with rotary encoding of relative keypoint coordinates (Eq. 3–4), providing persistent geometric signal at every self-attention layer rather than a one-time injection at input.

**Strengths.**

- On MegaDepth-1500, the adaptive LightGlue+SuperPoint variant matches SuperGlue's pose accuracy (LO-RANSAC AUC 66.3 / 79.0 / 87.9 vs SuperGlue 65.8 / 78.7 / 87.5) at 31.4 ms vs 70.0 ms — over 2× faster (Table 2).
- Ablation (Table 4) shows a substantial quality improvement over SuperGlue on precision (86.8 vs 74.6) and recall (96.3 vs 90.5), confirming that the architectural changes improve accuracy and not only speed.
- Adaptive compute is most effective on easy pairs: average stopping layer 4.7 on easy inputs yields a 1.86× speedup per pair; Figure 1 reports accuracy "closer to the dense matcher LoFTR at an 8× higher speed."
- The LightGlue matcher itself (code + the five released matcher checkpoints `*_lightglue.pth`) is Apache-2.0, removing the SuperGlue Magic-Leap restriction on the matcher half of the pipeline. Front-end licenses are heterogeneous and must be reviewed separately — see Limitations.

**Limitations.**

- Trained per front-end: a model trained on SuperPoint descriptors cannot be applied to SIFT descriptors without retraining; zero-shot transfer across front-end types is not supported (§4 and Assumption 4 in the note).
- Cross-attention memory at high keypoint counts: at $N=M=4096$, the similarity matrix alone occupies approximately 272 MB float32; FlashAttention is used for self-attention but cross-attention memory remains a constraint (§ Numerical sensitivity).
- Inherits the failure mode of all sparse matchers: repeated or periodic textures cause precision to collapse because attention cannot disambiguate mutually similar token sets; the matchability head mitigates but does not eliminate this.
- Front-end licenses are heterogeneous and override the matcher's Apache-2.0 grant for the affected pipeline. Per the official `cvg/LightGlue` README "License" section: DISK is Apache-2.0; ALIKED is BSD-3-Clause; SuperPoint (both the inference file [`lightglue/superpoint.py`](https://github.com/cvg/LightGlue/blob/v0.2/lightglue/superpoint.py) bundled in this repo and the Magic Leap pretrained weights it loads) is **noncommercial-research-only**. Commercial pipelines using LightGlue+SuperPoint inherit the SuperPoint restriction; commercial deployments should pair LightGlue with DISK, ALIKED, or a freely-licensed SIFT/DoG implementation.

## When to choose LightGlue over SuperGlue

LightGlue is the default choice for any new pipeline using a sparse detector front-end. Its adaptive depth delivers over 2× reduction in mean matching time at equivalent or better accuracy (Table 2), and the Apache-2.0 license on the matcher half removes the noncommercial-research-only restriction inherited from the official SuperGlue weights. The SuperPoint front-end retains its Magic-Leap restriction whether paired with SuperGlue or LightGlue (see Limitations); pairing LightGlue with DISK or ALIKED is the unrestricted commercial path. SuperGlue remains a well-understood reference baseline for ablation studies and for teams whose infrastructure is already built around the Magic Leap release.

Choose LoFTR (detector-free, dense) over LightGlue when matching must succeed in textureless or homogeneous regions where a sparse front-end finds no repeatable keypoints, and a per-pair latency of 116 ms on RTX 2080Ti is acceptable. LightGlue's 8× speed advantage over LoFTR (Figure 1) is decisive in tracking, large-scale mapping, and video applications; LoFTR's detector-free paradigm wins on featureless surfaces.

# References

1. P. Lindenberger, P. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* ICCV, 2023. [arXiv:2306.13643](https://arxiv.org/pdf/2306.13643)
2. P. Sarlin, D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperGlue: Learning Feature Matching with Graph Neural Networks.* CVPR, 2020. [arXiv:1911.11763](https://arxiv.org/pdf/1911.11763)
3. D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperPoint: Self-Supervised Interest Point Detection and Description.* CVPR Workshops, 2018. [arXiv:1712.07629](https://arxiv.org/abs/1712.07629)
4. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* CVPR, 2021. [arXiv:2104.00680](https://arxiv.org/pdf/2104.00680)
