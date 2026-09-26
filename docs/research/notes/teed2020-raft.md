---
paper_id: teed2020-raft
title: "RAFT: Recurrent All-Pairs Field Transforms for Optical Flow"
authors: ["Zachary Teed", "Jia Deng"]
year: 2020
url: https://arxiv.org/pdf/2003.12039
created: 2026-09-15
relevant_atlas_pages: [raft, optical-flow, horn-schunck, black-anandan-robust-flow]
---

# Setting

Dense two-frame optical flow estimation. Input: a pair of consecutive RGB
images $I_1, I_2 \in \mathbb{R}^{H \times W \times 3}$. Output: a dense
displacement field $(f^1, f^2)$ mapping each pixel $(u,v)$ in $I_1$ to
estimated corresponding coordinates $(u', v') = (u + f^1(u), v + f^2(v))$ in
$I_2$ (§3, opening paragraph). No explicit calibration or camera-model
assumption; the method is purely image-to-image (two RGB frames in, per-pixel
2D flow out, at full input resolution after learned upsampling).

# Core idea

RAFT factors optical flow into three differentiable stages that are jointly
trained end-to-end: (1) a per-pixel feature encoder, (2) an all-pairs 4D
correlation volume that measures visual similarity between every pixel in
$I_1$ and every pixel in $I_2$, and (3) a recurrent, weight-tied GRU-based
"update operator" that repeatedly looks up correlation features at the
current flow estimate and predicts an incremental refinement, converging to a
fixed flow field rather than being unrolled through a coarse-to-fine pyramid
(§1, §3).

Feature extraction: a CNN encoder $g_\theta: \mathbb{R}^{H\times W\times 3}
\to \mathbb{R}^{H/8 \times W/8 \times D}$, $D=256$, applied to both frames,
plus a context encoder $h_\theta$ (identical architecture) applied only to
$I_1$ (§3.1).

Correlation volume: the full 4D correlation volume is the dot product of all
feature-vector pairs,
$$C(g_\theta(I_1), g_\theta(I_2)) \in \mathbb{R}^{H\times W\times H\times W},
\quad C_{ijkl} = \sum_h g_\theta(I_1)_{ijh}\cdot g_\theta(I_2)_{klh}
\qquad(1)$$
computed as a single matrix multiplication (§3.2, Eq. 1). A 4-level pyramid
$\{C_1,C_2,C_3,C_4\}$ is built by average-pooling the last two dimensions
with kernel sizes 1, 2, 4, 8, so level $k$ has shape $H\times W\times
H/2^k\times W/2^k$ (§3.2).

Correlation lookup: given a current flow estimate, each pixel $x=(u,v)$ maps
to $x' = (u+f^1(u), v+f^2(v))$; a local grid
$$N(x')_r = \{x' + dx \mid dx \in \mathbb{Z}^2, \lVert dx\rVert_1 \le r\}
\qquad(2)$$
(§3.2, Eq. 2) is used with bilinear sampling to index every pyramid level
(level $k$ indexed via $N(x'/2^k)_r$), and the retrieved values across levels
are concatenated into one feature map. An equivalent $O(NM)$-complexity
implementation (vs. the $O(N^2)$ precomputed all-pairs volume, constant in
iteration count $M$) is given in §3.2 by exploiting linearity of the inner
product and average pooling, but the paper reports the precomputed all-pairs
form is not a bottleneck in practice (all-pairs correlation is 17% of total
inference time even at 1088×1920 resolution, §3.2).

Iterative update: starting from $f_0=0$, the update operator produces
$\{f_1,\dots,f_N\}$ via $f_{k+1} = \Delta f + f_k$ (§3.3), using a
convolutional GRU with tied weights across all iterations:
$$z_t = \sigma(\mathrm{Conv}_{3\times3}([h_{t-1}, x_t], W_z)) \qquad(3)$$
$$r_t = \sigma(\mathrm{Conv}_{3\times3}([h_{t-1}, x_t], W_r)) \qquad(4)$$
$$\tilde h_t = \tanh(\mathrm{Conv}_{3\times3}([r_t \odot h_{t-1}, x_t], W_h))
\qquad(5)$$
$$h_t = (1-z_t)\odot h_{t-1} + z_t \odot \tilde h_t \qquad(6)$$
where $x_t$ concatenates correlation features, flow features (2 conv layers
each), and the injected context-network features (§3.3, Eqs. 3–6). The GRU
hidden state is passed through two conv layers to predict $\Delta f$ at 1/8
resolution, then upsampled to full resolution via a learned convex
combination over a 3×3 neighborhood (predicted mask, softmax-normalized;
implementable via PyTorch's `unfold`) (§3.3, "Upsampling").

Supervision: $L1$ loss over the full sequence of predictions with
exponentially increasing weights,
$$L = \sum_{i=1}^N \gamma^{N-i}\lVert f_{gt} - f_i\rVert_1 \qquad(7)$$
with $\gamma=0.8$ (§3.4, Eq. 7).

# Claimed contributions

- C1: State-of-the-art accuracy — "On KITTI, RAFT achieves an F1-all error of
  5.10%, a 16% error reduction from the best published result (6.10%). On
  Sintel (final pass), RAFT obtains an end-point-error of 2.855 pixels, a 30%
  error reduction from the best published result (4.098 pixels)." (Abstract;
  §1 bullet list)
- C2: Strong generalization — "When trained only on synthetic data, RAFT
  achieves an end-point-error of 5.04 pixels on KITTI, a 40% error reduction
  from the best prior deep network trained on the same data (8.36 pixels)."
  (§1 bullet list; confirmed in Table 1, C+T row: 5.04 F1-epe vs. VCN's 8.36)
- C3: High efficiency — "RAFT processes 1088×436 videos at 10 frames per
  second on a 1080Ti GPU. It trains with 10X fewer iterations than other
  architectures. A smaller version of RAFT with 1/5 of the parameters runs at
  20 frames per second while still outperforming all prior methods on
  Sintel." (§1 bullet list)
- C4: A single fixed-resolution flow field updated recurrently, "different
  from the prevailing coarse-to-fine design in prior work ... where flow is
  first estimated at low resolution and upsampled and refined at high
  resolution," claimed to avoid "the difficulty of recovering from errors at
  coarse resolutions, the tendency to miss small fast-moving objects, and the
  many training iterations (often over 1M) typically required for training a
  multi-stage cascade." (§1, "Third" paragraph is actually "First")
- C5: A lightweight, weight-tied recurrent update operator (2.7M parameters,
  100+ iterations without divergence at inference), contrasted with IRR's
  FlowNetS-based recurrence (38M parameters, capped at 5 iterations) or
  PWC-Net-based recurrence (capped by pyramid levels). (§1, "Second"
  paragraph)
- C6: A novel update-operator design — "a convolutional GRU that performs
  lookups on 4D multi-scale correlation volumes; in contrast, refinement
  modules in prior work typically use only plain convolution or correlation
  layers." (§1, "Third" paragraph)

# Assumptions

1. Two consecutive RGB frames of a video (or an image pair) are available;
   the method does not use more than two frames at inference (§3, opening).
2. Training requires large labeled/synthetic flow datasets (FlyingChairs,
   FlyingThings3D, with optional finetuning on Sintel/KITTI-2015/HD1K) — hard
   dependency for reaching reported accuracy; the paper trains on two 2080Ti
   GPUs for ~250k total iterations across stages (§4, "Training Schedule").
3. Correlation-volume memory is $O(H\cdot W\cdot H\cdot W)$ per feature
   channel-free dot-product volume, computed once per pair; this is a soft
   assumption — the paper explicitly notes an $O(NM)$ alternative exists for
   memory-constrained settings, trading precomputation for per-iteration
   lookup cost (§3.2, "Efficient Computation for High Resolution Images"). ?
   The paper does not state an explicit GPU-memory ceiling in the main text.
4. The GRU update operator is trained with tied weights across all
   iterations and bounded activations, explicitly to "mimic the steps of an
   optimization algorithm" and "encourage convergence to a fixed point" —
   this is a soft prior, not a formal convergence guarantee (§3.3, opening).
5. During training, gradients through $\Delta f + f_k$ are backpropagated
   only through the $\Delta f$ branch (zeroed through $f_k$), "as suggested
   by [20]" — an implementation-level assumption for stable training (§4,
   "Implementation Details").

# Failure regime

The paper does not run a dedicated failure-mode analysis, but ablations
delimit where components matter:
- Lookup radius $r=0$ (correlation retrieved at a single point, no local
  neighborhood) still produces a rough flow estimate but degrades sharply:
  Sintel-clean EPE 3.41 vs. 1.63 at $r=4$; KITTI F1-all 44.8 vs. 19.8 (Table
  2, "Lookup Radius"). ? The paper attributes the non-zero result at $r=0$ to
  the network "learning to use 0'th order information," not a formal
  argument.
- Replacing the all-pairs correlation volume with a warping layer (using the
  current flow estimate to warp $I_2$ features onto $I_1$, then estimating
  residual displacement) is "still competitive... on Sintel" but degrades
  substantially on KITTI (Table 2, "Features for Refinement": Sintel-clean
  2.27 vs. 1.63, KITTI F1-all 32.1 vs. 19.8) — i.e., the correlation-volume
  formulation matters more under KITTI's larger/discontinuous automotive
  motion than Sintel's smoother synthetic motion (§4.3, "Features for
  Refinement").
- Restricting the correlation volume to a local range (32px/64px/128px
  instead of all-pairs) costs accuracy at small ranges (32px: Sintel-clean
  2.91 vs. all-pairs 1.63) and converges to near-parity only at 128px,
  because "most displacements fall within this range" on Sintel — implying
  the all-pairs formulation specifically matters for larger, unbounded
  displacements not covered by a fixed local range (§4.3, "Correlation
  Range").
- Removing weight tying across update iterations increases parameter count
  7x (32.5M vs. 4.8M) and *decreases* accuracy (Sintel-clean 1.96 vs. 1.63),
  i.e. untied per-iteration weights overfit / fail to generalize as well
  (Table 2, "Tying").

# Numerical sensitivity

- The correlation volume $C_{ijkl}$ (Eq. 1) is an unnormalized dot product of
  learned feature vectors — no explicit scale normalization term is given in
  the equation; feature-vector magnitude is implicitly controlled only
  through network training, not through an explicit denominator (e.g. no
  $1/\sqrt{D}$ scaling as in attention). ? Not discussed as a numerical
  concern in the paper; flagged here as an inference from Eq. 1 as written.
- Gradients are clipped to $[-1, 1]$ during training with AdamW (§4,
  "Implementation Details") — an explicit numerical-stability measure for
  the recurrent, weight-tied architecture.
- The exponential loss weighting $\gamma^{N-i}$ with $\gamma=0.8$ (Eq. 7)
  means early iterations in a long unrolled sequence receive vanishingly
  small gradient weight (e.g. at $N=12$ training unroll, $i=1$ gets
  $0.8^{11}\approx 0.086\times$ the weight of $i=N$) — a design choice
  affecting how strongly early, coarse updates are supervised. ? Exact
  training unroll depth is stated as "we unroll 12 updates during training"
  in §4.3 ("Inference Updates" paragraph).
- The method is robust to iteration count far beyond training-time unroll
  depth: inference-time update count from 1 to 200 is ablated (Table 2,
  "Inference Updates") and shows monotonic improvement without divergence up
  to 200 iterations (Sintel-clean EPE 4.04 at 1 update → 1.40 at 200
  updates), evidence for the claimed fixed-point convergence behavior rather
  than a proof of it.

# Applicability

- Use when: dense two-frame optical flow is needed with high accuracy and
  reasonable compute (10 fps on a 1080Ti at 1088×436, §1 "High efficiency"
  bullet), including cross-dataset generalization from synthetic-only
  training (§1 "Strong generalization" bullet; §4.2).
- Don't use when: only a single, very lightweight/classical estimator is
  affordable (no GPU, no learned-feature training pipeline) — the smallest
  reported variant (Ours-S) still has ~1M parameters (§4.4, Fig. 5) and
  requires the same trained encoder/update-operator pipeline.
- Compared against (paper's own baselines in Table 1): FlowFields,
  FlowFields++, DCFlow, MRFlow, HD3, LiteFlowNet/LiteFlowNet2, PWC-Net,
  PWC-Net+, VCN, MaskFlowNet, FlowNet2, IRR-PWC, ScopeFlow — all evaluated on
  Sintel and/or KITTI-15 (Table 1).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| horn-schunck | "Horn and Schnuck formulated optical flow as a continuous optimization problem using a variational framework, and were able to estimate a dense flow field by performing gradient steps... Like continuous methods, we maintain a single estimate of optical flow which is refined with each iteration. However, since we build correlation volumes for all pairs... each local update uses information about both small and large displacements. In addition, instead of using a subpixel Taylor approximation of the data term, our update operator learns to propose the descent direction." (§2, "Optical Flow as Energy Minimization") | learned_alternative_of | medium | RAFT frames itself as inheriting the single-flow-field, iterative-refinement structure of Horn–Schunck but replacing the hand-derived Taylor-approximation data term and analytic gradient step with a learned update operator and learned features — a deep-learning replacement for the classical variational paradigm, not a strict head-to-head drop-in for Horn–Schunck specifically. |
| black-anandan-robust-flow | "Black and Anandan addressed problems with oversmoothing and noise sensitivity by introducing a robust estimation framework." (§2, same paragraph as Horn–Schunck contrast; the paragraph's contrast with "continuous formulations" — first-order Taylor approximation, coarse-to-fine for large displacements — applies collectively to this line of work) | learned_alternative_of | low | Only briefly named in the historical lineage sentence; the explicit contrast (single high-res flow field vs. coarse-to-fine, learned vs. hand-derived data term) is argued at the level of the "continuous formulations" class rather than against Black–Anandan specifically. |

# Connections

- Builds on: [ilg2017-flownet2 (cited [25], not yet in index), sun2018-pwcnet (cited [42], not yet in index)] — RAFT's ablation baselines and coarse-to-fine contrast target these directly; ? neither is registered in docs/papers/index.yaml yet, so left as prose only, not a `cites:` edge.
- Builds on (registered): [horn1981-horn-schunck]
- Enables: ? not stated by the paper (published 2020; downstream influence not discussed in-paper).
- Refutes / supersedes: none claimed explicitly — RAFT positions itself as outperforming, not superseding, the coarse-to-fine deep baselines (Table 1 comparison, not a lineage claim).

# Atlas update plan

## NEW: raft
Type: model
Category: optical-flow
Primary source: this paper
Bullets per public-page section:
- Motivation: dense two-frame optical flow, replacing hand-crafted variational optimization and coarse-to-fine CNN cascades with a single-resolution recurrent update operator (§1, C4).
- Architecture: feature encoder $g_\theta$ + context encoder $h_\theta$ → all-pairs 4D correlation volume with 4-level pooled pyramid (Eq. 1, §3.2) → ConvGRU-based update operator with correlation lookup (Eqs. 2-6, §3.3) → learned convex upsampling to full resolution.
- Training: $L1$ loss over the unrolled sequence with $\gamma=0.8$ exponential weighting (Eq. 7); FlyingChairs → FlyingThings3D pretraining, optional Sintel/KITTI/HD1K finetuning (§3.4, §4).
- Assessment: SOTA on Sintel/KITTI at publication (Table 1); strong synthetic-to-real generalization (C2); efficient at 2.7M-parameter update operator / 5.3M total params (Table 2), 10fps at 1088×436 on a 1080Ti (§1).
- References: this paper (primary).

## UPDATE: optical-flow
Section: Where it appears / survey of methods
Bullets to add:
- Add RAFT as a deep-learning method that departs from coarse-to-fine CNN cascades (FlowNet2, PWC-Net, LiteFlowNet) by maintaining a single high-resolution flow field refined via a weight-tied recurrent update operator over an all-pairs 4D correlation volume (§1, §3).

## UPDATE: horn-schunck
Section: Remarks / Relations
Bullets to add:
- Note RAFT's own positioning: it inherits the single-flow-field, iteratively-refined structure of the Horn–Schunck variational formulation but replaces the analytic Taylor-approximation data term and gradient-descent step with learned features and a learned update operator (§2, "Optical Flow as Energy Minimization"). See Stated relations table above for the proposed `learned_alternative_of` edge (medium confidence) — not committed here per plan.

## UPDATE: black-anandan-robust-flow
Section: Remarks / Relations
Bullets to add:
- Briefly named in RAFT's related-work lineage of "continuous formulations" contrasted with RAFT's learned, single-resolution approach (§2). See Stated relations table above for the proposed `learned_alternative_of` edge (low confidence) — not committed here per plan.

# Provenance

- Abstract: KITTI F1-all 5.10% (16% reduction from 6.10%); Sintel final EPE
  2.855px (30% reduction from 4.098px).
- §1 (Introduction), bullet list: three claimed strengths (state-of-the-art
  accuracy, strong generalization, high efficiency) — C1–C3 above.
- §1, unlabeled "First"/"Second"/"Third" paragraphs: architectural novelty
  claims — C4–C6 above.
- §2 (Related Work), "Optical Flow as Energy Minimization": Horn–Schunck and
  Black–Anandan positioning quotes (Stated relations table).
- §3.1 (Feature Extraction): encoder $g_\theta$, output resolution 1/8,
  $D=256$, 6 residual blocks (2 each at 1/2, 1/4, 1/8 resolution).
- §3.2 (Computing Visual Similarity), Eq. 1: correlation volume definition.
  Eq. 2: local lookup grid $N(x')_r$. "Efficient Computation" paragraph:
  $O(N^2)$ vs. $O(NM)$ complexity argument; "17% of total inference time"
  figure for 1088×1920 video.
- §3.3 (Iterative Updates): update recurrence $f_{k+1}=\Delta f + f_k$;
  Eqs. 3–6 (ConvGRU); "Upsampling" paragraph (learned convex upsampling via
  `unfold`).
- §3.4 (Supervision), Eq. 7: $L1$ loss with $\gamma=0.8$.
- §4 ("Implementation Details"): PyTorch, AdamW, gradient clip $[-1,1]$, 32
  updates on Sintel / 24 on KITTI at inference, gradient stop-through on
  $f_k$ branch citing [20]. "Training Schedule": two 2080Ti GPUs, 100k(C) +
  100k(T) + 100k finetune + 50k KITTI finetune.
- Table 1: full quantitative comparison table (Sintel clean/final,
  KITTI-15 F1-epe/F1-all) across all cited baselines.
- Table 2 (Ablations): lookup radius, correlation pooling, correlation
  range, features-for-refinement (warping vs. correlation), tying,
  inference-update-count rows used in Failure regime / Numerical sensitivity.
- §4.4 ("Timing and Parameter Counts"): Ours-S = 1M params; Fig. 5 parameter
  comparison.
- §4.5 ("Video of Very High Resolution"): 1080p DAVIS, 550ms/frame at 12
  iterations, 95ms of that for all-pairs correlation.
- §5 (Conclusions): summary claim, no new numbers.
