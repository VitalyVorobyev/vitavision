---
title: "RAFT"
date: 2026-09-15
summary: "Recurrent all-pairs field transform for dense two-frame optical flow: an all-pairs 4D correlation volume queried by a weight-tied convolutional-GRU update operator, refining a single fixed-resolution flow field instead of a coarse-to-fine cascade."
tags: ["deep-learning", "optical-flow", "dense-prediction"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
params: "4.8M total; 2.7M in the tied update operator (Table 2, 'Tying' ablation)"
prerequisites: [optical-flow, convolutional-neural-network]
failureModes: []
implementations:
  - role: official
    repo: https://github.com/princeton-vl/RAFT
    commit: 2888e15a51fa41140771d3f498ed8023cff098d1
    framework: pytorch
    license: BSD-3-Clause
relations:
  - type: learned_alternative_of
    target: horn-schunck
    confidence: medium
    caution: "Keeps the single-field iterative-refinement structure of variational flow; data term and update operator are learned."
sources:
  primary: teed2020-raft
  references:
    - horn1981-horn-schunck
  notes: |
    §3.1 feature encoder $g_\theta: \mathbb{R}^{H\times W\times 3} \to
    \mathbb{R}^{H/8\times W/8\times D}$, $D=256$, plus an identical context
    encoder $h_\theta$ applied only to $I_1$. §3.2 all-pairs 4D correlation
    volume $C_{ijkl}=\sum_h g_\theta(I_1)_{ijh}g_\theta(I_2)_{klh}$ (Eq. 1),
    computed once as a matrix multiply; 4-level pooled pyramid (kernels
    1,2,4,8); local lookup grid $N(x')_r$ (Eq. 2) indexes every level via
    bilinear sampling. §3.3 ConvGRU update operator (Eqs. 3-6), update
    $f_{k+1}=\Delta f+f_k$, gradient stopped through the $f_k$ branch;
    learned convex upsampling via `unfold` to full resolution. §3.4 $L1$
    loss over the unrolled sequence with exponential weight $\gamma=0.8$
    (Eq. 7). Training: FlyingChairs → FlyingThings3D, optional Sintel /
    KITTI-2015 / HD1K finetuning; AdamW, gradient clip $[-1,1]$; unroll
    depth 12 at training. Headline results (Abstract, Table 1): KITTI
    F1-all 5.10% (16% reduction from 6.10%); Sintel-final EPE 2.855 px
    (30% reduction from 4.098 px); synthetic-only KITTI EPE 5.04 vs
    VCN's 8.36 (Table 1, C+T row). Ablations (Table 2): lookup radius
    $r=0$ degrades Sintel-clean EPE 3.41 vs 1.63 at $r=4$; untied update
    weights raise parameter count 7x (32.5M vs 4.8M) and hurt accuracy;
    inference-time iteration count 1-200 improves monotonically without
    divergence (4.04 → 1.40 EPE, Table 2 'Inference Updates').
---

# Motivation

Estimate a dense two-frame optical flow field by iteratively refining a single, fixed-resolution estimate rather than progressing through a coarse-to-fine cascade of increasingly higher-resolution predictions. Input: two RGB frames $I_1, I_2 \in \mathbb{R}^{H \times W \times 3}$. Output: a dense per-pixel displacement field $(f^1, f^2)$ mapping each pixel $(u, v)$ in $I_1$ to estimated coordinates $(u + f^1(u), v + f^2(v))$ in $I_2$. The model is specific to an **all-pairs 4D correlation volume**, computed once as a single matrix multiplication and queried repeatedly at the current flow estimate, and a **weight-tied recurrent update operator** that plays the role of an optimization step at every iteration — together replacing both the analytic data term and gradient-descent update of variational optical flow and the multi-resolution pyramid of prior coarse-to-fine deep architectures.

# Architecture

**Family & shape.** Two CNN encoders of identical architecture — a feature encoder $g_\theta$ applied to both frames and a context encoder $h_\theta$ applied only to $I_1$ — map each frame to a $1/8$-resolution feature map with $D = 256$ channels. A weight-tied convolutional-GRU update operator is then run for $N$ iterations, each producing an incremental flow update from correlation lookups and the context features. The full-resolution output is obtained from the $1/8$-resolution estimate $f_N$ by a learned convex upsampling.

**Blocks.** The all-pairs correlation volume is the dot product of every feature-vector pair between the two frames:

:::definition[All-pairs correlation volume]
$$
C(g_\theta(I_1), g_\theta(I_2)) \in \mathbb{R}^{H\times W\times H\times W}, \qquad C_{ijkl} = \sum_h g_\theta(I_1)_{ijh}\cdot g_\theta(I_2)_{klh}.
$$

Computed once per image pair as a single matrix multiplication; a 4-level pyramid $\{C_1, C_2, C_3, C_4\}$ is built by average-pooling the last two dimensions with kernel sizes $1, 2, 4, 8$.
:::

:::definition[Correlation lookup]
Given the current flow estimate, pixel $x = (u, v)$ maps to $x' = (u + f^1(u), v + f^2(v))$; a local grid around $x'$ is sampled from every pyramid level:

$$
N(x')_r = \{\, x' + dx \mid dx \in \mathbb{Z}^2,\ \lVert dx \rVert_1 \le r \,\}.
$$

Level $k$ is indexed via $N(x'/2^k)_r$ with bilinear sampling; retrieved values across all levels are concatenated into one feature map.
:::

The recurrent update operator is a convolutional GRU with weights tied across all iterations:

```python
def raft_update_block(h_prev, x_t, conv):
    """One ConvGRU update-operator step (Eqs. 3-6).
    h_prev: hidden state.
    x_t: concat(correlation features, flow features, context features).
    conv: 3x3 convolutions producing the gate pre-activations.
    """
    hx = concat(h_prev, x_t, axis="channel")
    z = sigmoid(conv(hx, weight="Wz"))            # Eq. 3
    r = sigmoid(conv(hx, weight="Wr"))             # Eq. 4
    rhx = concat(r * h_prev, x_t, axis="channel")
    h_tilde = tanh(conv(rhx, weight="Wh"))         # Eq. 5
    h_next = (1 - z) * h_prev + z * h_tilde        # Eq. 6
    return h_next
```

The updated hidden state is passed through two convolutional layers to predict an increment $\Delta f$ at $1/8$ resolution; the flow estimate updates as $f_{k+1} = \Delta f + f_k$, with gradients stopped through the $f_k$ branch during training. The full-resolution field is recovered by a learned convex combination over a $3\times 3$ neighbourhood (softmax-normalized weights), implementable via an `unfold` operation.

**Training.** Supervision is an $L1$ loss over the full unrolled sequence of $N$ predictions with exponentially increasing weights:

$$
L = \sum_{i=1}^{N} \gamma^{N-i} \lVert f_{gt} - f_i \rVert_1, \qquad \gamma = 0.8.
$$

Training proceeds on FlyingChairs then FlyingThings3D, with optional finetuning on Sintel, KITTI-2015, and HD1K; the optimizer is AdamW with gradients clipped to $[-1, 1]$, unrolling 12 updates during training. On Sintel (final pass), RAFT reaches an end-point error of 2.855 px, a 30% reduction from the best published result of 4.098 px; on KITTI it reaches an F1-all error of 5.10%, a 16% reduction from 6.10% (Abstract). Trained only on synthetic data (FlyingChairs + FlyingThings3D), it reaches KITTI F1-epe 5.04, a 40% reduction from the best prior network trained on the same data (8.36, Table 1, "C+T" row).

**Complexity.** The update operator has 2.7M parameters; removing weight tying across iterations raises the total parameter count 7x, from 4.8M to 32.5M, and *decreases* Sintel-clean accuracy (1.96 vs 1.63 EPE, Table 2 "Tying"). A reduced variant with roughly 1M parameters ("Ours-S") runs at 20 fps on Sintel-scale imagery while still outperforming prior methods there. The full model processes 1088×436 video at 10 frames per second on a 1080Ti GPU.

# Implementations

Official PyTorch release under a BSD-3-Clause license, pinned at the commit verified below.

# Assessment

**Novelty.**

- Maintains a single fixed-resolution flow field refined recurrently, rather than the prevailing coarse-to-fine design that estimates flow at low resolution and progressively upsamples and refines it.
- Computes an all-pairs 4D correlation volume once as a matrix multiplication (Eq. 1) and indexes it via bilinear lookup at every iteration (Eq. 2), instead of re-evaluating correlation or warping at each pyramid level.
- Uses a lightweight, weight-tied ConvGRU update operator (2.7M parameters, stable for 100+ inference iterations), contrasted with IRR's FlowNetS-based recurrence (38M parameters, capped at 5 iterations) or PWC-Net-based recurrence capped by the number of pyramid levels.
- Replaces the hand-derived Taylor-approximation data term and analytic gradient-descent step of variational optical flow with a learned update operator that "learns to propose the descent direction" from correlation features.

**Strengths.**

- State-of-the-art at publication: KITTI F1-all 5.10% (16% error reduction from the best published 6.10%); Sintel-final EPE 2.855 px (30% reduction from 4.098 px).
- Strong synthetic-to-real generalization: trained only on FlyingChairs + FlyingThings3D, reaches KITTI F1-epe 5.04 versus VCN's 8.36 under the same training data (Table 1, "C+T" row) — a 40% reduction.
- Robust to inference-time iteration count far beyond the training unroll depth of 12: iterations from 1 to 200 improve Sintel-clean EPE monotonically (4.04 → 1.40) without divergence (Table 2, "Inference Updates").
- Efficient: 10 fps at 1088×436 on a 1080Ti; a ~1M-parameter variant runs at 20 fps while still outperforming all prior methods on Sintel.

**Limitations.**

- Correlation-lookup radius matters: restricting the local lookup to a single point ($r=0$) degrades Sintel-clean EPE from 1.63 to 3.41 and KITTI F1-all from 19.8 to 44.8 (Table 2, "Lookup Radius").
- The all-pairs correlation formulation specifically matters on KITTI's larger, discontinuous motion: replacing it with a warping-layer alternative is "still competitive" on Sintel (2.27 vs 1.63 EPE) but degrades sharply on KITTI (32.1 vs 19.8 F1-all, Table 2 "Features for Refinement").
- Requires large labeled or synthetic training data (FlyingChairs, FlyingThings3D, optional Sintel/KITTI/HD1K finetuning) and roughly 250k total training iterations across two GPUs.
- No formal proof of fixed-point convergence for the recurrent update operator; the 1-to-200-iteration stability (Table 2) is empirical evidence toward that design goal, not a guarantee.

# References

1. Z. Teed, J. Deng. *RAFT: Recurrent All-Pairs Field Transforms for Optical Flow.* ECCV 2020. [arXiv](https://arxiv.org/pdf/2003.12039)
2. B. K. P. Horn, B. G. Schunck. *Determining Optical Flow.* Artificial Intelligence 17(1–3), 1981. [hdl.handle.net/1721.1/6337](http://hdl.handle.net/1721.1/6337)
