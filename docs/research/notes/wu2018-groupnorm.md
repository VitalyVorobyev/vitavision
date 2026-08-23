---
paper_id: wu2018-groupnorm
title: "Group Normalization"
authors: ["Y. Wu", "K. He"]
year: 2018
url: https://arxiv.org/pdf/1803.08494
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit, resnet]
---

# Setting

Problem class: normalizing convolutional-network activations without
depending on the batch dimension, motivated by BN's accuracy collapse at
small batch sizes — a regime forced by memory-constrained high-resolution
tasks (object detection, segmentation, video) that cannot afford BN's
required batch size of "e.g., 32 per worker" (§1 Introduction, p.1, citing
[26,59,20]). Input: a 4D feature tensor $(N,C,H,W)$ from a convolutional
layer. Output: a normalized tensor computed by dividing the channel axis
into a fixed number of groups and normalizing within each (group, sample)
pair over the spatial and intra-group-channel extent — computation that does
not touch the batch axis $N$ at all, so behavior is independent of batch
size.

# Core idea

The paper first gives a **unifying formulation** for the whole normalization
family (§3.1, Eq. 1-2, p.4): for feature $x$ indexed by
$i=(i_N,i_C,i_H,i_W)$, every method computes
$\hat x_i = \frac{1}{\sigma_i}(x_i-\mu_i)$ with
$\mu_i=\frac1m\sum_{k\in S_i}x_k$,
$\sigma_i=\sqrt{\frac1m\sum_{k\in S_i}(x_k-\mu_i)^2+\epsilon}$, where the
methods differ only in how the index set $S_i$ (over which statistics are
pooled) is defined. **Batch Norm**: $S_i=\{k\mid k_C=i_C\}$ — pool over
$(N,H,W)$ for each channel (Eq. 3). **Layer Norm**: $S_i=\{k\mid k_N=i_N\}$
— pool over $(C,H,W)$ for each sample (Eq. 4). **Instance Norm**:
$S_i=\{k\mid k_N=i_N, k_C=i_C\}$ — pool over $(H,W)$ for each sample and
channel (Eq. 5). **Group Norm** (this paper's contribution):
$S_i = \{k \mid k_N=i_N,\ \lfloor k_C/(C/G)\rfloor=\lfloor i_C/(C/G)\rfloor\}$
(§3.1, Eq. 7, p.4) — pool over $(H,W)$ and a contiguous group of $C/G$
channels, for each sample, where $G$ is a predefined hyperparameter
(**default $G=32$**, stated in §3.1 p.4 and used throughout §4). All methods
then apply the same learned per-channel affine transform
$y_i=\gamma\hat x_i+\beta$ (Eq. 6, p.4). GN is motivated by the observation
that classical hand-crafted features (SIFT, HOG, GIST) are inherently
group-wise, each group formed by a histogram or oriented-cell structure, and
are conventionally normalized group-wise (§1 Introduction, p.2; §3
Introduction, p.3), plus a cited neuroscience finding that cell-response
normalization in visual cortex operates over pools of nearby cells with
diverse receptive-field/frequency tuning (§3, p.3, citing [21,52,55,5]).
Because GN's group extent never includes the batch axis, its computation and
accuracy are, by construction, independent of batch size (§3.1, p.4;
empirically verified §4.1).

# Assumptions

1. Channels within a network layer are not fully independent and can be
   meaningfully partitioned into groups whose members share similar response
   statistics (§3, p.3, "The channels of visual representations are not
   entirely independent... it is not necessary to think of deep neural
   network features as unstructured vectors"). (Soft — a design premise
   motivating the method, not a formal precondition; degrades gracefully if
   grouping is arbitrary, since Table 3 shows GN is fairly insensitive to
   the exact group count.)
2. Channels are assumed pre-arranged "in a sequential order along the C
   axis" so that a contiguous block of $C/G$ channels forms one group (§3.1,
   p.4, "assuming each group of channels are stored in a sequential order").
   (Hard for the specific floor-division formula in Eq. 7 — an arbitrary
   channel permutation would require a different, non-contiguous grouping to
   preserve semantic coherence within a group, though the normalization
   arithmetic itself works for any partition.)
3. $C$ must be divisible by $G$ (implicit in "C/G is the number of channels
   per group," §3.1, p.4) so that groups have equal size. (Hard — not
   explicitly flagged as a constraint by the authors, but required for the
   stated formula.)

# Failure regime

- Not a failure mode of GN itself, but the paper documents BN's failure
  regime that GN is designed to fix: **BN's ImageNet validation error rises
  sharply as batch size shrinks below ~16 images/GPU** — with batch size 2,
  BN reaches 34.7% error vs. GN's 24.1% (a 10.6-point gap), and at batch
  size 4, BN is 27.3% vs. GN's 24.2% (Table 2, §4.1, p.6; visualized in
  Figure 1, p.1, and Figure 5, p.6). The paper attributes this to "inaccurate
  batch statistics estimation" when computed over very few samples (§1
  Introduction, p.1; §4.1, p.6, "the batch mean and variance estimation can
  be overly stochastic and inaccurate, especially when they are computed
  over 4 or 2 images").
- GN's own accuracy is slightly worse than BN at *regular* (large) batch
  sizes: with batch size 32 on ResNet-50/ImageNet, GN has 24.1% error vs.
  BN's 23.6% — a 0.5-point gap the authors attribute to GN lacking BN's
  batch-sampling-induced stochastic regularization effect (Table 1, §4.1,
  p.6, "The slightly higher validation error of GN implies that GN loses
  some regularization ability of BN").
- The extreme case $G=1$ makes GN equivalent to LN, which the paper reports
  as its own worst group-division setting (25.3% error vs. 24.1% at
  $G=32$, Table 3 top panel, §4.1, p.7) — evidence that pure per-sample,
  all-channel normalization is measurably worse than group-wise
  normalization for this architecture.
- The extreme case of 1 channel per group makes GN equivalent to IN, also
  reported as its worst channels-per-group setting in Table 3 (28.4% error),
  substantially worse than $\geq2$ channels per group (25.6% at 2
  channels/group) — "This result shows the effect of grouping channels when
  performing normalization" (§4.1, p.7).
- GN applied directly to the box head of Mask R-CNN's Region-of-Interest
  features underperforms when the analogous BN swap is attempted: BN on
  RoI features (512 RoIs sampled from the same image, hence non-i.i.d.) is
  "∼9 AP worse" because "the batch of RoIs are sampled from the same image
  and their distribution is not i.i.d." — a case the paper attributes to
  BN's specific batch-statistics fragility, contrasted with GN which "does
  not suffer from this problem" (§4.2, p.8, discussion of Table 5).

# Numerical sensitivity

- $\epsilon$ is added inside the square root purely for numerical stability,
  matching BN's convention: "$\epsilon$ [is] a small constant" (§3.1, Eq. 2,
  p.4).
- The general formulation (Eq. 1-2) makes explicit that the size of the
  statistics-pooling set $m=|S_i|$ differs by method — for GN,
  $m = (C/G)\times H\times W$ — which is the key numerical lever: larger $m$
  (fewer, bigger groups) gives lower-variance statistics estimates at the
  cost of coarser per-group specialization; smaller $m$ (more, smaller
  groups) trades the reverse. Table 3 quantifies this trade-off directly in
  validation error for $G\in\{64,32,16,8,4,2,1\}$ and channels-per-group
  $\in\{64,32,16,8,4,2,1\}$ (§4.1, p.7), with the paper's chosen default
  $G=32$ landing near the empirical optimum (24.1% error, within 0.5 points
  of the best value found, 24.6% at $G=64$ vs. reported best 24.1-24.6%
  range — the authors note the method "performs reasonably well for all
  values of G we studied").
- The reference implementation snippet (Figure 3, §3.2, p.4) computes
  moments via `tf.nn.moments` over axes `[2,3,4]` after reshaping
  `x` to `[N, G, C//G, H, W]` — i.e., statistics pooled jointly over the
  intra-group-channel axis and both spatial axes, matching Eq. 7 exactly;
  `eps=1e-5` is the concrete default used in that snippet.
- No moving-average / population-statistics machinery is needed at inference
  time (unlike BN): because GN's statistics never depend on the batch axis,
  "GN's computation is independent of batch sizes" at both train and test
  time, eliminating BN's train/inference discrepancy entirely (§1
  Introduction, p.1; §3.1, p.4) — this is a numerical/engineering
  simplification relative to BN's Algorithm 2 (moving-average population
  statistics), not merely a batch-size robustness claim.
- Weight decay of 0 is used specifically for the $\gamma,\beta$ affine
  parameters during Mask R-CNN fine-tuning, reported as "important for good
  detection results when $\gamma$ and $\beta$ are being tuned" (§4.2, p.8).

# Applicability

- Use when: batch size per worker/GPU is small (1-8 images), as forced by
  high-resolution inputs in detection/segmentation, or by the 3D
  spatial-temporal memory cost of video models — the regimes the paper
  targets directly (§4.2 COCO detection/segmentation; §4.3 Kinetics video
  classification).
- Use when: fine-tuning must transfer cleanly from a pre-training batch size
  to a different fine-tuning batch size — GN "can naturally transfer from
  pre-training to fine-tuning" because its behavior does not depend on batch
  size at all (§1 Introduction, p.2; demonstrated in §4.2 Table 4-6).
- Don't use when: batch size is already large and stable and BN's
  regularization-from-batch-noise is beneficial — GN trails BN by ~0.5 point
  on ImageNet classification at batch size 32 (Table 1).
- Compared against: Batch Norm (throughout); Layer Norm and Instance Norm
  (§4.1, Table 1, Table 3, shown as GN's own extreme special cases); Batch
  Renormalization [Ioffe 2017] (§4.1, p.7, "Comparison with Batch Renorm" —
  BR reaches 26.3% error at batch size 4, better than BN's 27.3% but 2.1
  points worse than GN's 24.2%); Weight Normalization (footnote 3, §4.1,
  p.6, WN gets 28.2% at the regular batch-32 setting, worse than all
  feature-normalization variants tested).

# Connections

- Builds on: ioffe2015-batchnorm (GN is presented as "a simple alternative
  to BN," reusing BN's general normalize-affine-transform structure, §1);
  ba2016-layernorm (explicitly identified as GN's $G=1$ special case, §3.1
  "Relation to Prior Work," p.4-5); instance normalization [Ulyanov et al.
  2016] (identified as GN's $G=C$ special case, same section).
- Enables: none named forward in this paper (2018, most recent of the
  three).
- Refutes / supersedes: none — GN is presented as a competitive alternative
  to BN in specific regimes (small batch, detection/segmentation/video), not
  a universal replacement; the paper concedes BN's mild edge at large,
  stable batch sizes for plain classification (Table 1).

# Atlas update plan

## NEW: normalization
Type: concept
Category: training / deep-learning-fundamentals
Primary source: this paper (one of ≥3 sources for the future concept page)
- **Definition**: contributes the single unifying formulation (Eq. 1-2) that
  should anchor the concept page's "Mathematical Description" section — BN,
  LN, IN, and GN are all instances of one normalize-then-affine-transform
  operator differing only in the index set $S_i$ used to pool statistics.
  Also contributes the classical-feature analogy (SIFT/HOG/GIST as
  group-wise normalized features) as an intuition-building motivation.
- **Mathematical Description**: contributes the exact $S_i$ definitions for
  all four methods (Eq. 3-5, 7) in one consistent notation — this is the
  authoritative source for a "taxonomy table" comparing BN/LN/IN/GN by
  pooling axis, reproduced here as Figure-2-style taxonomy:

  | Method | Pooling set $S_i$ | Axes pooled | Batch-dependent? |
  |---|---|---|---|
  | Batch Norm | $\{k\mid k_C=i_C\}$ | $(N,H,W)$ per channel | Yes |
  | Layer Norm | $\{k\mid k_N=i_N\}$ | $(C,H,W)$ per sample | No |
  | Instance Norm | $\{k\mid k_N=i_N,k_C=i_C\}$ | $(H,W)$ per sample+channel | No |
  | Group Norm | $\{k\mid k_N=i_N,\lfloor k_C/(C/G)\rfloor=\lfloor i_C/(C/G)\rfloor\}$ | $(H,W)$ + intra-group $C$ per sample | No |

  (provenance: §3.1, Eq. 3-5, 7, and Figure 2, p.3-4).
- **Numerical Concerns**: contributes the group-count sensitivity data
  (Table 3: error vs. $G$ and vs. channels-per-group) quantifying the
  bias/specialization trade-off in the pooling-set size, and the
  train/inference-consistency simplification GN provides relative to BN's
  moving-average population statistics.
- **Where it appears**: contributes the small-batch degradation curve
  (Figure 1/Figure 5, Table 2) that is the concept page's clearest
  quantitative evidence for *why* batch-axis normalization is
  batch-size-fragile, plus concrete regimes where each variant wins
  (GN ≈ BN quality at regular batch sizes with only ~0.5% gap; GN clearly
  beats BN once batch size drops to ≤4; BN still preferred at large stable
  batch sizes for plain image classification per Table 1).
- Regime of validity for this paper's variant: convolutional networks
  (ResNet-50/101, VGG-16) for image classification, object
  detection/segmentation (Mask R-CNN/COCO), and video classification
  (I3D/Kinetics); default $G=32$ tuned on these tasks; not evaluated by this
  paper on RNN/LSTM or GAN architectures, though the authors speculate GN
  "could be used in place of LN and IN" there as future work (§1
  Introduction, p.2).

Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- BN's small-batch error growth (10.6% error gap at batch size 2): Abstract,
  p.1; Figure 1, p.1; Table 2, §4.1, p.6.
- Unifying formulation, Eq. 1-2 ($\hat x_i$, $\mu_i$, $\sigma_i$): §3.1, p.4.
- Batch Norm's $S_i$, Eq. 3: §3.1, p.4.
- Layer Norm's $S_i$, Eq. 4: §3.1, p.4.
- Instance Norm's $S_i$, Eq. 5: §3.1, p.4.
- Learned affine transform, Eq. 6: §3.1, p.4.
- Group Norm's $S_i$ and $G=32$ default, Eq. 7: §3.1, p.4.
- Taxonomy figure (BN/LN/IN/GN pooling diagram): Figure 2, p.3.
- Reference TensorFlow implementation, `eps=1e-5`: Figure 3, §3.2, p.4.
- Relation to LN ($G=1$) and IN ($G=C$): §3.2 "Relation to Prior Work," p.4-5.
- ImageNet classification comparison of BN/LN/IN/GN at batch 32: Table 1,
  Figure 4, §4.1, p.5-6.
- Batch-size sensitivity sweep (32/16/8/4/2): Table 2, Figure 5, §4.1, p.6.
- Group-division ablation (varying $G$ and channels/group): Table 3, §4.1,
  p.7.
- Batch Renormalization comparison: §4.1, p.7 ("Comparison with Batch
  Renorm").
- Weight Normalization comparison (28.2% error): footnote 3, §4.1, p.6.
- ResNet-101 deeper-model comparison: §4.1, p.7 ("Deeper models").
- VGG-16 feature-distribution evolution: Figure 6, §4.1, p.7.
- COCO Mask R-CNN C4-backbone results: Table 4, §4.2, p.7-8.
- COCO Mask R-CNN FPN-backbone results, RoI/non-i.i.d. BN failure
  discussion: Table 5, §4.2, p.8.
- COCO full Mask R-CNN + FPN results ("long" schedule): Table 6, §4.2, p.8.
- From-scratch (no pre-training) Mask R-CNN results: Table 7, §4.2, p.8.
- Kinetics I3D video classification results: Table 8, Figure 7, §4.3, p.8-9.
- Weight-decay-0 for $\gamma,\beta$ during fine-tuning: §4.2, p.8.
