---
paper_id: lindenberger2023-lightglue
title: "LightGlue: Local Feature Matching at Light Speed"
authors: ["P. Lindenberger", "P. Sarlin", "M. Pollefeys"]
year: 2023
url: https://arxiv.org/pdf/2306.13643
created: 2026-05-10
relevant_atlas_pages: [superglue, superpoint, loftr, xfeat, sift]
---

# Setting

**Problem class:** Sparse local feature matching — finding a partial assignment between two sets of keypoints across an image pair.

**Inputs:**
- Two sets of local features, one per image. Each feature i has a 2D position **p**_i := (x,y)_i ∈ [0,1]² (normalized by image size) and a visual descriptor **d**_i ∈ ℝ^d. The descriptor type is agnostic: SuperPoint, DISK, SIFT, or ALIKED all work; the model is trained separately per front-end.
- Image A has M features, image B has N features.

**Outputs:**
- A set of correspondences M = {(i,j)} ⊂ A×B drawn from a soft partial assignment matrix **P** ∈ [0,1]^{M×N}. A pair (i,j) is reported when P_{ij} > threshold τ and P_{ij} is the maximum along both its row and column.
- No pose is estimated directly; correspondences feed downstream geometric solvers (RANSAC + essential/homography estimation, PnP).

**Calibration assumptions:** None — the matcher operates on raw image coordinates. Calibration is a downstream concern.

**Resolution / scale:** The paper evaluates at images resized to 480 px (HPatches) and 1600 px longer dimension (MegaDepth). No stated resolution limit, but attention complexity scales as O(NMd) for cross-attention.

# Core idea

LightGlue is an adaptive-depth Transformer matcher that builds on SuperGlue's graph-attention framework while addressing its two main weaknesses: quadratic-in-depth compute cost and slow, unstable training.

The key mechanism is **adaptive depth + width**: after each of L=9 identical self+cross-attention layers, a per-point confidence head c_i = Sigmoid(MLP(x_i)) ∈ [0,1] (Eq. 9) estimates whether a point's representation is already reliable. If a threshold fraction α of all points is confident (Eq. 10, exit criterion), the network halts early — no subsequent layers are computed. Points that are confident *and* unmatchable are pruned from the input to the next layer, reducing quadratic attention cost at each step. Easy pairs (high overlap, small viewpoint change) exit after ~4–5 of 9 layers; hard pairs run all 9.

The correspondence head replaces SuperGlue's expensive Sinkhorn optimal-transport solver with a dual-softmax + matchability product (Eq. 8):

  **P**_{ij} = σ_i^A · σ_j^B · Softmax_{k∈A}(**S**_{kj})_i · Softmax_{k∈B}(**S**_{ik})_j

where σ_i = Sigmoid(Linear(x_i)) ∈ [0,1] is a matchability score (Eq. 7) and **S**_{ij} = Linear(x_i^A)^⊤ Linear(x_j^B) is a pairwise similarity score (Eq. 6). This disentangles similarity and matchability (vs. SuperGlue's dustbin entanglement) and allows a lightweight head that can supervise at every layer, enabling both faster convergence and the early-exit mechanism.

Positional encoding is rotary (RoPE-style, Eq. 3–4): in self-attention, the score between points i and j is a_{ij} = q_i^⊤ **R**(p_j − p_i) k_j, where **R**(·) is a block-diagonal rotation matrix encoding relative keypoint displacement. This encodes relative (not absolute) geometry, is added at every self-attention layer (not just at input), and is shared and cached across layers.

Cross-attention uses bidirectional attention (Eq. 5): a_{ij}^{IS} = k_i^I · (k_j^S)^⊤ = a_{ji}^{SI}, so the similarity matrix is computed once for both directions, saving a factor of ~2 on the most expensive step.

# Assumptions

1. **Repeatability of keypoints (soft):** A matching point in image A must be detected in image B to form a correspondence. Missed detections produce unmatched points (matchability σ→0), degrading recall rather than causing silent failure.
2. **Descriptor discriminability (soft):** Descriptors must be informative enough for the attention layers to distinguish correct from incorrect correspondences. Very repetitive textures cause precision to drop because attention cannot disambiguate.
3. **Sufficient overlap (soft):** The model is trained on MegaDepth pairs with balanced visual overlap. Very low overlap (loop closure) requires more layers to exit (average stopping layer 6.9 vs 4.7 for easy pairs per Table 5) but still produces correct matches.
4. **Front-end type known at training time (hard):** LightGlue is trained per descriptor type (SuperPoint, SIFT, DISK, ALIKED). A model trained on SuperPoint descriptors cannot be applied to SIFT descriptors without retraining — weights are not shared across front-ends.
5. **Input descriptors in ℝ^d format (hard):** Binary descriptors (ORB, BRIEF) are not natively supported; they require a compatible dense descriptor format.
6. **No explicit epipolar prior:** The model learns geometric priors from data (MegaDepth) but is not given calibration. On scenes very different from training (e.g., fisheye, medical, satellite), generalization is not guaranteed.

# Failure regime

- **Repeated / periodic textures:** Attention cannot resolve the assignment uniquely when multiple points are mutually similar; precision collapses. The matchability head mitigates this but does not eliminate it. This is the same failure mode as all descriptor-based sparse matchers.
- **Very few keypoints:** Attention is most beneficial when context from many keypoints disambiguates individual ones. With fewer than ~50 keypoints, the advantage over mutual nearest neighbor largely disappears.
- **Extreme viewpoint changes (>90°) or scale changes:** The model is trained on MegaDepth outdoor scenes; large appearance changes outside this distribution degrade accuracy. Night-time queries (Aachen benchmark) still succeed due to the SuperPoint pre-training, but are harder (stopping layer averages higher ?).
- **Non-overlapping image pairs:** When there is zero visual overlap, all points should be classified unmatchable (σ→0). If the classifier is not confident quickly, all 9 layers are computed. The early-exit then fires only at the end, so there is no efficiency benefit for completely non-overlapping pairs.
- **Large input sizes (memory):** Cross-attention scales as O(NMd). For N=M=4096 and d=256, the similarity matrix alone is ~68M float32 values (~272 MB). The paper mitigates this with FlashAttention for self-attention, but cross-attention memory remains a constraint at very high keypoint counts.
- **Front-end / trained weight mismatch:** Using SIFT descriptors with a SuperPoint-trained LightGlue model produces incorrect matches. This is a hard failure.

# Numerical sensitivity

- **Descriptor dimension d=256** (§4): all hidden states share this dimension. Using a smaller d (e.g., 128) is possible with retraining but has not been benchmarked in the paper.
- **L=9 layers, 4 attention heads** (§4): Depth is the primary knob; early exit makes average depth data-dependent (~5.7 layers on MegaDepth per Table 5).
- **Threshold τ for correspondence extraction:** The paper tunes this per method and reports highest AUC (§5.1). An improperly tuned τ directly changes precision/recall; no universal default is given.
- **Exit threshold α and per-layer threshold λ_ℓ:** α controls the speed/accuracy trade-off directly; λ_ℓ decays across layers to compensate for lower early-layer confidence. These are set during training of the confidence classifier stage and are not user-tunable at inference without retraining.
- **Rotary encoding basis vectors b_k ∈ ℝ²** (Eq. 4): Learned during training, one per d/2=128 2D subspace. These encode what relative geometric offsets are most useful for matching, and are fixed after training.
- **Keypoint coordinate normalization:** Positions are normalized to [0,1]² by image dimensions. Failure to normalize (e.g., passing raw pixel coords) breaks the rotary encoding.
- **Mixed precision training (FP16/FP32):** The paper trains with mixed precision and gradient checkpointing to fit 32 image pairs on a single 24 GB GPU (§4). Inference in FP16 is standard; FP32 is not required for correctness at the tested scales.

# Applicability

- **Use when:** sparse feature matching is needed and latency or throughput is a concern; image pairs vary in difficulty (video frames vs. wide-baseline pairs) and adaptive compute is valuable; a drop-in replacement for SuperGlue with better speed/accuracy is needed; front-end is SuperPoint, DISK, SIFT, or ALIKED.
- **Don't use when:** a binary descriptor front-end (ORB, BRIEF) is required; GPU is unavailable (the model is not designed for CPU inference, though community ports exist); matching descriptors from a front-end with no trained LightGlue weights and retraining is not an option; memory is severely constrained (very high keypoint counts with limited GPU VRAM).
- **Compared against:** SuperGlue (direct predecessor, same family — slower, Sinkhorn head), LoFTR (detector-free dense matcher — more robust in textureless regions but ~8× slower), SGMNet (reduced attention by seed-match clustering — faster only at >4k keypoints but less accurate than LightGlue at standard sizes), XFeat+MNN (fast front-end with its own matcher — faster but lower accuracy ceiling).

# Connections

- **Builds on:**
  - `sarlin2020-superglue` — architecture lineage; LightGlue replaces Sinkhorn with dual-softmax+matchability, adds adaptive depth/width, and updates positional encoding. The graph-attention layer structure is inherited.
  - `detone2018-superpoint` — primary front-end used for training and evaluation; the paper trains a SuperPoint-variant model specifically.
  - `lowe2004-sift` — second front-end explicitly trained and evaluated; LightGlue is tested with SIFT features in §4.
  - Vaswani et al. 2017 "Attention is All You Need" — foundational Transformer architecture (cited as [74] in paper; no index entry in this repo — referenced in prose only).
  - Su et al. 2021 RoFormer / rotary embeddings (cited as [67]) — source of the rotary positional encoding adapted in Eq. 3–4 (no index entry in this repo).

- **Enables:**
  - Downstream relative pose estimation and SfM pipelines (hloc toolbox, COLMAP) — LightGlue is demonstrated in the hloc framework on Aachen Day-Night.
  - SLAM front-ends requiring low-latency matching — the paper explicitly targets tracking and large-scale mapping as motivating applications.
  - Object pose estimation pipelines that use sparse correspondences for PnP.

- **Refutes / supersedes:** none in the strict sense. LightGlue extends SuperGlue without making SuperGlue obsolete as a research baseline — the relation is `extended_by` (from SuperGlue's side), not `generalized_by`. SuperGlue retains practical value as a reference and for teams already using its infrastructure.

# Atlas update plan

## NEW: lightglue
Type: model
Category: feature-matching (deep)
Primary source: lindenberger2023-lightglue

Page bullets per template (Motivation, Architecture, Implementations, Assessment, References) — populate these from the note's other sections. Specifically:
- Motivation: SuperGlue's quadratic-attention matcher is accurate but slow; many image pairs are easy and don't need full-depth attention. LightGlue makes the matcher adaptive to pair difficulty, retaining the graph-attention framework but cutting compute on easy pairs.
- Architecture: stack of L self+cross attention layers over keypoint tokens; each layer attaches a confidence head + a matchability head; early-exit when confidence exceeds a threshold (adaptive depth); prunes tokens unlikely to be matched at each layer (token pruning); positional encoding via rotary keypoint coords; final assignment via dual-softmax + matchability gating.
- Implementations: official PyTorch repo `cvg/LightGlue`; ONNX/TensorRT exports community-maintained; supports SuperPoint, DISK, SIFT, ALIKED keypoints out of the box.
- Assessment: ~10× faster than SuperGlue at comparable accuracy on HPatches/MegaDepth/ETH3D benchmarks per the paper; speedup is largest on easy pairs (low overlap, high overlap, or texture-poor) where adaptive depth fires early.

Relations:
{ type: extended_by, target: lightglue, confidence: high, caution: "Authored on superglue's side. LightGlue retains SuperGlue's graph-attention matcher; adds adaptive depth + token pruning. SuperGlue is still the reference baseline." }
{ type: feeds_into, target: lightglue, confidence: high }   # authored on superpoint's side
{ type: compared_with, target: loftr, confidence: high, caution: "Different paradigm: LoFTR is detector-free dense; LightGlue is detector-based sparse. Compare on speed/accuracy/robustness for the target task." }
{ type: feeds_into, target: lightglue, confidence: medium, caution: "XFeat ships its own MNN matcher; pairing with LightGlue is supported but not the headline configuration." }   # authored on xfeat's side

## UPDATE: superglue
Section: Remarks
- Add a one-liner pointing to LightGlue as the efficiency-focused successor (`extended_by`/high relation, with the caution above).

## UPDATE: superpoint
Section: Remarks
- Add a `feeds_into → lightglue` relation note (or update the existing matcher list bullet to mention LightGlue alongside SuperGlue).

## UPDATE: loftr
Section: Remarks (or "When to choose X over Y" subsection if it has one for SuperGlue)
- Add LightGlue to the comparison set: similar accuracy frontier as SuperGlue but with adaptive compute; clarifies the "sparse-matcher branch is no longer slow" point.

## UPDATE: xfeat
Section: Remarks
- Add a brief note that XFeat keypoints can be matched with LightGlue when accuracy > raw speed is desired.

# Provenance

- **§ Abstract / §1:** General problem framing, claim that LightGlue is more efficient/accurate/easier to train than SuperGlue; "adaptive to the difficulty of the problem."
- **§3 "Problem formulation":** Definition of local feature pair (p_i, d_i), sets A/B with M/N features, partial assignment goal **P** ∈ [0,1]^{M×N}.
- **Eq. 1:** Attention update rule x_i^I ← x_i^I + MLP([x_i^I | m_i^{I←S}]).
- **Eq. 2:** Message aggregation m_i^{I←S} = Σ_j Softmax_k(a_{ik}^{IS})_j **W**x_j^S.
- **Eq. 3:** Self-attention score a_{ij} = q_i^⊤ **R**(p_j − p_i) k_j (rotary encoding of relative position).
- **Eq. 4:** Rotary matrix **R**(p) as block-diagonal of 2×2 rotation blocks **R̂**(b_k^⊤ p); **R̂**(θ) = [[cos θ, −sin θ],[sin θ, cos θ]].
- **Eq. 5:** Cross-attention score a_{ij}^{IS} = k_i^I (k_j^S)^⊤ = a_{ji}^{SI} (bidirectional trick, factor-of-2 saving).
- **Eq. 6:** Pairwise similarity **S**_{ij} = Linear(x_i^A)^⊤ Linear(x_j^B).
- **Eq. 7:** Matchability σ_i = Sigmoid(Linear(x_i)) ∈ [0,1].
- **Eq. 8:** Soft partial assignment **P**_{ij} = σ_i^A σ_j^B · Softmax_{k∈A}(**S**_{kj})_i · Softmax_{k∈B}(**S**_{ik})_j (dual-softmax + matchability).
- **Eq. 9:** Confidence c_i = Sigmoid(MLP(x_i)) ∈ [0,1].
- **Eq. 10:** Exit criterion: mean fraction of confident points > α.
- **Eq. 11:** Training loss averaged over L layers — log-likelihood of matches + log(1−σ) for unmatchable points.
- **§4 "Implementation details":** L=9 layers, 4 attention heads, d=256, 2k keypoints per image during training, batch size 32 pairs on 24 GB GPU with gradient checkpointing + mixed precision.
- **§4 "Recipe":** Pre-train on synthetic homographies from 1M images, fine-tune on MegaDepth (196 landmarks, 1M images).
- **§3.5 "Comparison with SuperGlue":** Sinkhorn replaced by dual-softmax; absolute MLP positional encoding replaced by rotary; Sinkhorn dustbin replaced by separate matchability head; deep supervision enabled by lightweight head.
- **Table 1 (HPatches):** LightGlue+SuperPoint: P=88.9, R=94.3; AUC-RANSAC@5px=79.6; AUC-DLT@5px=78.6.
- **Table 2 (MegaDepth-1500):** LightGlue+SuperPoint: LO-RANSAC AUC 66.7/79.3/87.9 at 5°/10°/20°, time 44.2 ms; adaptive variant: 66.3/79.0/87.9 at 31.4 ms; SuperGlue: 65.8/78.7/87.5 at 70.0 ms. LightGlue adaptive is "over 2× faster than SuperGlue."
- **Table 3 (Aachen Day-Night):** LightGlue: 17.2–26.1 pairs/second vs SuperGlue: 6.5 pairs/second; "2.5× higher throughput", "4× when optimized."
- **Table 4 (Ablation):** LightGlue full: precision 86.8, recall 96.3, time 19.4 ms; SuperGlue: 74.6 / 90.5 / 29.1 ms.
- **Table 5 (Adaptive depth/width):** Average stopping layer: easy 4.7, medium 5.5, hard 6.9, average 5.7; speedup: easy 1.86×, medium 1.33×, hard 1.16×, average 1.45× (→ "reduces run time by 33%").
- **§5.4 "Efficiency":** "For up to 2K keypoints per image, LightGlue is faster than both SuperGlue and SGMNet."
- **Figure 1 caption:** "accuracy closer to the dense matcher LoFTR at an 8× higher speed."
