---
paper_id: liu2021-swin
title: "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows"
authors: ["Z. Liu", "Y. Lin", "Y. Cao", "H. Hu", "Y. Wei", "Z. Zhang", "S. Lin", "B. Guo"]
year: 2021
url: https://arxiv.org/pdf/2103.14030
created: 2026-08-23
relevant_atlas_pages: [vit, attention-mechanism, transformer, resnet, mask-rcnn]
---

# Setting

Problem class: general-purpose visual backbone. Input: an RGB image of
arbitrary size $H \times W$. Output: a hierarchy of feature maps at four
resolutions, $\frac{H}{4}\times\frac{W}{4}$ down to
$\frac{H}{32}\times\frac{W}{32}$, with channel widths doubling at each stage
— the same resolution/channel convention as a CNN backbone (VGG, ResNet), so
the model is a drop-in replacement in FPN/U-Net-style dense-prediction heads
(§3.1, p.3). The paper targets three downstream tasks with this single
backbone: ImageNet-1K classification, COCO object detection/instance
segmentation, and ADE20K semantic segmentation (§4, p.5).

Precondition: input is tiled into non-overlapping $4\times4$ patches (like
ViT's patch tokenization) before any Transformer computation; patch/window
sizes must evenly divide the feature-map resolution at each stage (bottom-right
padding is applied otherwise, footnote 4, p.5).

# Core idea

Swin Transformer replaces ViT's single-resolution, globally-attending
Transformer with a 4-stage hierarchical stack. Each stage runs self-attention
inside non-overlapping local windows of $M\times M$ patches ($M=7$ by
default) instead of over the whole feature map, making attention cost linear
in image area instead of quadratic (Eq. 1 vs Eq. 2, §3.2, p.4). Because
window-local attention alone has no cross-window connectivity, consecutive
Transformer blocks alternate between a regular window partition (W-MSA) and
one shifted by $(\lfloor M/2\rfloor,\lfloor M/2\rfloor)$ patches (SW-MSA),
so information from one window's neighbors leaks in at the next block
(Fig. 2/4, Eq. 3, §3.2, p.4). Between stages, a patch-merging layer
concatenates each $2\times2$ neighborhood of tokens (a $4C$-dim vector) and
linearly projects it to $2C$, halving spatial resolution and doubling channel
width — this is what builds the CNN-like feature-map pyramid (§3.1, p.3).
Position information is not the sinusoidal/learned absolute embedding used in
the original Transformer and ViT; instead every window applies a learned
relative position bias term added inside the softmax (Eq. 4, §3.2, p.4-5).
The shifted-window computation is batched efficiently via a cyclic shift +
attention masking, avoiding the padding overhead of naively enlarging the
window grid (Fig. 4, §3.2, p.5).

# Claimed contributions

- C1: A hierarchical Transformer whose "representation is computed with
  Shifted windows," giving cross-window connections while keeping attention
  local (Abstract, p.1).
- C2: Linear computational complexity with respect to image size, versus the
  quadratic complexity of global self-attention used by ViT (Abstract, p.1;
  restated with the exact complexity formulas in §3.2, p.4).
- C3: State-of-the-art accuracy on three tasks with one backbone: "87.3
  top-1 accuracy on ImageNet-1K," "58.7 box AP and 51.1 mask AP on COCO
  test-dev," and "53.5 mIoU on ADE20K val," the latter two surpassing prior
  best by "+2.7 box AP and +2.6 mask AP on COCO, and +3.2 mIoU on ADE20K"
  (Abstract, p.1).
- C4: The hierarchical design and shifted-window scheme are claimed to
  generalize beyond attention — "also prove beneficial for all-MLP
  architectures" (Abstract, p.1; elaborated §2 Related Work referencing
  MLP-Mixer [61], p.3).
- C5: A hardware-efficient batched implementation of shifted-window attention
  via cyclic shift, positioned against prior sliding-window self-attention
  as having "much lower latency than the sliding window method, yet is
  similar in modeling power" (§1, p.2; measured in Table 5/6, p.8).

# Assumptions

1. Window size $M$ must evenly divide the feature-map size at every stage;
   the paper pads bottom-right when it doesn't (footnote 4, p.5) — soft,
   handled automatically.
2. The relative-position bias table $\hat{B}$ is sized for a fixed window
   size $M=7$; using a different window size at fine-tuning time requires
   bi-cubic interpolation of $\hat{B}$ (§3.2, p.5) — soft, but an explicit
   extra step, not automatic.
3. Translation-invariance-friendly inductive bias (via windowing + relative
   position) is assumed beneficial for general-purpose vision; the paper
   explicitly argues this against ViT/DeiT's abandonment of it (§4.4, p.8) —
   a design assumption, not a hard precondition on inputs.
4. All experiments use ImageNet-1K or ImageNet-22K pretraining before
   downstream fine-tuning; no from-scratch-on-small-data results are
   reported (§4.1, §A2.1, p.5,9).

# Failure regime

- Not measured/discussed as a failure mode by the paper itself (no explicit
  ablation of window size choice below/above 7, or of extreme aspect-ratio
  images). The paper's own critique of the *prior* approach it replaces is
  the closest analogue: naive sliding-window self-attention "suffer[s] from
  low latency on general hardware due to different key sets for different
  query pixels" (§1, p.2) — i.e., that failure mode is what Swin's
  windowing+shift design is built to avoid, not a failure of Swin itself.
- Naive padding of the shifted-window grid (rather than the cyclic-shift
  trick) is explicitly called out as a computational failure mode: "the
  increased computation with this naive solution is considerable (2×2→3×3,
  which is 2.25 times greater)" (§3.2, p.5).

# Numerical sensitivity

- Complexity crossover: $\Omega(\text{MSA})=4hwC^2+2(hw)^2C$ is quadratic in
  patch count $hw$, while $\Omega(\text{W-MSA})=4hwC^2+2M^2hwC$ is linear in
  $hw$ for fixed $M$ (Eq. 1–2, §3.2, p.4) — the quadratic term dominates at
  high resolution, which is the paper's stated motivation for windowing.
- Query/key dimension per head is fixed at $d=32$ and MLP expansion ratio
  $\alpha=4$ across all model variants (§3.3, p.5) — these are not tuned per
  variant, only $C$ (base channel width) and per-stage layer counts are.
- Absolute position embedding, if added on top of relative position bias,
  measurably *hurts* dense-prediction tasks while slightly helping
  classification: "+0.4%" top-1 accuracy but "-0.2 box/mask AP on COCO and
  -0.6 mIoU on ADE20K" (§4.4, p.8) — a task-dependent sign flip, not a
  uniformly beneficial term.
- Stochastic-depth ratio is scaled with model capacity: 0.2/0.3/0.5 for
  Swin-T/S/B respectively (§A2.1, p.9) — larger models need stronger
  regularization at the same training budget.

# Applicability

- Use when: a single backbone must serve both classification and dense
  prediction (detection/segmentation) tasks at variable input resolution,
  and hierarchical multi-scale features (FPN/U-Net-style) are needed.
- Don't use when: only image-level classification at fixed resolution is
  needed and a single-scale, architecturally simpler backbone (plain ViT)
  is sufficient — Swin's windowing/merging machinery adds no benefit there.
- Compared against: ViT [20] / DeiT [63] (Transformer backbones), ResNe(X)t
  [30, 70] / RegNet [48] / EfficientNet [58] (CNN backbones), Performer [14]
  and prior sliding-window self-attention [33, 50] (efficient-attention
  alternatives).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| dosovitskiy2020-vit | "previous vision Transformers [20] produce feature maps of a single low resolution and have quadratic computation complexity to input image size due to computation of self-attention globally" (Fig. 1 caption, p.1); ViT's "architecture is unsuitable for use as a general-purpose backbone network on dense vision tasks or when the input image resolution is high" (§2, p.3) | compared_with (orchestrator to weigh against extended_by) | medium | Swin's own framing reads as supersession-for-dense-tasks, which would argue `extended_by`/`generalized_by`. But Swin is architecturally a different tokenization-to-hierarchy pipeline (patch merging, windowed+shifted attention) rather than a strict superset of ViT's mechanism, and plain ViT retains independent standing as the minimal-architecture backbone for later self-supervised work. Proposing `compared_with` (peer backbone choice) at medium confidence; orchestrator should confirm against vit's note before committing, per the task's explicit prompt to weigh extended_by vs compared_with. |
| touvron2020-deit | "Compared to the previous state-of-the-art Transformer-based architecture, i.e. DeiT [63], Swin Transformers noticeably surpass the counterpart DeiT architectures with similar complexities: +1.5% for Swin-T (81.3%) over DeiT-S (79.8%)" (§4.1, p.6); Swin explicitly reuses DeiT's training recipe: "We include most of the augmentation and regularization strategies of [63] in training" (§4.1, p.5) | compared_with | high | Direct head-to-head benchmarking at matched model/compute budget (Table 1, Table 2b) is the paper's own comparison axis — canonical `compared_with`. The shared training-recipe borrowing is a methodological detail, not architectural incorporation, so it doesn't push this to `feeds_into`. |
| vaswani2017-attention | "Swin Transformer is built by replacing the standard multi-head self attention (MSA) module in a Transformer block by a module based on shifted windows..., with other layers kept the same" (§3.1, p.4) | feeds_into | high | Swin explicitly keeps the standard Transformer block (LN, residual, MLP) and only swaps the MSA module for a windowed variant — textbook "incorporates A as a named internal component." Chronology holds (1706.03762, 2017 ≤ 2021). |
| he2016-resnet | "the proposed architecture can conveniently replace the backbone networks in existing methods for various vision tasks" because its hierarchical feature maps match "typical convolutional networks, e.g., VGG [52] and ResNet [30]" (§3.1, p.3); "the complexity of Swin-T and Swin-S are similar to those of ResNet-50 (DeiT-S) and ResNet-101, respectively" (§3.3, p.5); direct backbone-swap benchmarks in Table 2/3 | compared_with | high | Both are directly benchmarked as interchangeable backbones inside identical detection/segmentation frameworks (Cascade Mask R-CNN, UperNet) at matched FLOPs tiers — peer practitioner choice at the backbone level, not supersession (ResNet is a different paradigm, not the same mathematical formulation, so `alternative_formulation_of` doesn't apply either). |

# Connections

- Builds on: [vaswani2017-attention, dosovitskiy2020-vit]
- Enables: downstream dense-prediction SOTA results reported directly in
  this paper (Cascade Mask R-CNN, HTC++, UperNet with Swin backbones);
  no separate follow-up paper is cited as "enabled" within this text.
- Refutes / supersedes: none stated as supersession by the paper itself —
  it claims to *surpass* ViT/DeiT/ResNe(X)t empirically but frames itself as
  a new architecture choice, not a formal generalization proof (see Stated
  relations above).

# Atlas update plan

## NEW: swin
Type: model
Category: vision-transformer / backbone
Primary source: liu2021-swin
Relations to be confirmed by orchestrator from `# Stated relations` before
drafting (pivot workflow).

Bullets per public-page section:
- Motivation: general-purpose vision backbone problem — ViT's single-resolution,
  quadratic-in-image-size global attention is unsuitable for dense prediction at
  high resolution (§1–2, p.2–3); need a Transformer backbone with CNN-like
  hierarchical multi-scale feature maps.
- Architecture: 4-stage hierarchy built from patch partition (4×4 patches,
  48-dim raw feature) → linear embed to $C$ → patch merging halves resolution
  and doubles channels between stages ($C\to2C\to4C\to8C$, confirmed per-variant
  in Table 7, p.9) → window attention with $M=7$ and the W-MSA/SW-MSA
  alternating-block scheme (Eq. 3), efficient shifted-window batching via
  cyclic shift + masking (Fig. 4), relative position bias (Eq. 4).
- Complexity: reproduce Eq. 1 vs Eq. 2 with the quadratic-vs-linear framing.
- Model variants table: Swin-T/S/B/L with $C$, per-stage layer counts, params,
  FLOPs (Table 1/7).
- Assessment: ImageNet-1K/22K top-1, COCO box/mask AP (Cascade Mask R-CNN and
  HTC++ SOTA), ADE20K mIoU headline numbers; shifted-window and relative-
  position-bias ablation gains (Table 4) as evidence for the design choices.
- References: liu2021-swin (primary); dosovitskiy2020-vit, vaswani2017-attention,
  touvron2020-deit, he2016-resnet (comparison/lineage — see Stated relations).

## UPDATE: attention-mechanism
Section: Where it appears / efficiency variants
Bullets to add:
- Windowed self-attention as a linear-complexity efficiency device: cite
  $\Omega(\text{W-MSA})=4hwC^2+2M^2hwC$ vs $\Omega(\text{MSA})=4hwC^2+2(hw)^2C$
  (Eq. 1–2) as a concrete instance of trading global receptive field for
  linear scaling, with the shift trick as the mechanism that restores
  cross-window information flow without paying quadratic cost.

## UPDATE: transformer
Section: Where it appears
Bullets to add:
- Swin Transformer as a vision-domain block-level modification of the
  standard Transformer block (Eq. 3): same LN/residual/MLP skeleton,
  MSA module replaced by window-based (S)W-MSA.

## UPDATE: vit
Section: Where it appears / Remarks
Bullets to add (pending orchestrator confirmation of relation type):
- Pointer to Swin as a hierarchical, window-attention alternative addressing
  ViT's single-resolution/quadratic-complexity limits for dense prediction
  (§2, p.3) — exact relation type (`compared_with` vs `extended_by`) to be
  finalized per the Stated relations table above.

# Provenance

- Abstract, p.1: headline numbers "87.3 top-1 accuracy on ImageNet-1K",
  "58.7 box AP and 51.1 mask AP on COCO test-dev", "53.5 mIoU on ADE20K
  val", margins "+2.7 box AP and +2.6 mask AP on COCO, and +3.2 mIoU on
  ADE20K"; "all-MLP architectures" claim.
- §1 Introduction, p.1–2: patch-merging hierarchical construction narrative;
  "all query patches within a window share the same key set" hardware
  argument; sliding-window latency critique; ViT/DeiT/ResNe(X)t comparison
  sentence ("outperforms the ViT / DeiT [20, 63] and ResNe(X)t models [30, 70]
  significantly with similar latency").
- §2 Related Work, p.2–3: CNN backbone lineage (AlexNet→VGG→GoogleNet→
  ResNet→DenseNet→HRNet→EfficientNet); prior sliding-window self-attention
  backbones [33, 50, 80] and their "costly memory access" latency problem;
  ViT/DeiT positioning paragraph ("ViT requires large-scale training
  datasets (i.e., JFT-300M)... DeiT... architecture is unsuitable for use as
  a general-purpose backbone network on dense vision tasks or when the input
  image resolution is high").
- §3.1 Overall Architecture, p.3: patch size 4×4, feature dim 4×4×3=48;
  stage resolutions $H/4\times W/4$ → $H/8\times W/8$ → $H/16\times W/16$ →
  $H/32\times W/32$; patch-merging $2\times2\to4C\to2C$ mechanism;
  "conveniently replace the backbone networks" / VGG-ResNet feature-map
  resolution parity claim.
- §3.2 Shifted Window based Self-Attention, p.4–5: Eq. 1
  $\Omega(\text{MSA})=4hwC^2+2(hw)^2C$; Eq. 2
  $\Omega(\text{W-MSA})=4hwC^2+2M^2hwC$; $M=7$ default; shift displacement
  $(\lfloor M/2\rfloor,\lfloor M/2\rfloor)$; Eq. 3 two-successive-block
  formulas ($\hat z^l=\text{W-MSA}(\text{LN}(z^{l-1}))+z^{l-1}$, etc.);
  Fig. 4 cyclic-shift batching description; naive-padding 2×2→3×3
  "2.25 times greater" computation claim; Eq. 4
  $\text{Attention}(Q,K,V)=\text{SoftMax}(QK^T/\sqrt d + B)V$,
  $B\in\mathbb R^{M^2\times M^2}$, $\hat B\in\mathbb R^{(2M-1)\times(2M-1)}$;
  bi-cubic interpolation for window-size change at fine-tune time.
- §3.3 Architecture Variants, p.5: $d=32$, $\alpha=4$ for all variants;
  variant hyperparameters — Swin-T: $C=96$, layers $\{2,2,6,2\}$; Swin-S:
  $C=96$, layers $\{2,2,18,2\}$; Swin-B: $C=128$, layers $\{2,2,18,2\}$;
  Swin-L: $C=192$, layers $\{2,2,18,2\}$; "complexity of Swin-T and Swin-S
  are similar to those of ResNet-50 (DeiT-S) and ResNet-101."
- Table 1(a), p.6: Swin-T $224^2$ 29M params, 4.5G FLOPs, 755.2 img/s,
  81.3% top-1; Swin-S $224^2$ 50M, 8.7G, 436.9 img/s, 83.0%; Swin-B $224^2$
  88M, 15.4G, 278.1 img/s, **83.5%** top-1; Swin-B $384^2$ 88M, 47.0G,
  84.7 img/s, 84.5%. DeiT-S $224^2$ 79.8%; DeiT-B $224^2$ 81.8%, $384^2$
  83.1%. ViT-B/16 $384^2$ 77.9% (regular)/84.0% (22K-pretrained); ViT-L/16
  $384^2$ 76.5%/85.2%.
- Table 1(b), p.6: ImageNet-22K-pretrained Swin-B $224^2$ 85.2%, Swin-B
  $384^2$ 86.4%, Swin-L $384^2$ **87.3%** top-1 — the paper's headline
  ImageNet number.
- §4.1 text, p.6: prose states Swin-B "83.3%/84.5%" over DeiT-B at
  $224^2/384^2$ — **note discrepancy**: this contradicts Table 1(a)'s 83.5%
  for Swin-B $224^2$; Table 8 (Appendix, p.9) also reports 83.3% for Swin-B
  $224^2$ (throughput 278.1 matches Table 1's 278.1 exactly, confirming same
  run). Flagged with `?` — Table 1's 83.5% and the §4.1/Table 8's 83.3% for
  the identical Swin-B/$224^2$ configuration cannot both be the source
  paper's intended value; treat 83.5% (Table 1, the paper's own primary
  results table) as the citable headline figure but note the paper's
  internal inconsistency if precision below 0.5pp matters downstream.
- Table 2(a)/(b)/(c), p.7: Swin-T Cascade Mask R-CNN 50.5 box AP/43.7 mask
  AP vs ResNet-50 46.3/40.1 (+4.2/+3.6... paper states "+3.4∼4.2 box AP"
  range across four frameworks); Swin-B HTC++ 56.4/49.1 (mini-val); Swin-L
  HTC++ multi-scale test 58.7/51.1 (test-dev) — the headline COCO SOTA
  numbers, "surpassing the previous best results by +2.7 box AP (Copy-paste
  [26] without external data) and +2.6 mask AP (DetectoRS [46])."
- Table 3, p.7: Swin-L (UperNet, ImageNet-22K pretrained) 53.5 mIoU val,
  "surpassing the previous best model by +3.2 mIoU (50.3 mIoU by SETR
  [81])"; Swin-S 49.3 mIoU vs DeiT-S 44.0 mIoU ("+5.3 mIoU higher").
- Table 4, p.8: shifted-window ablation — w/o shifting 80.2 top-1/47.7 box
  AP/41.5 mask AP/43.3 mIoU; shifted windows (default) 81.3/50.5/43.7/46.1
  — matches prose "+1.1% top-1 accuracy on ImageNet-1K, +2.8 box AP/+2.2
  mask AP on COCO, and +2.8 mIoU on ADE20K." Position-embedding ablation:
  no pos. 80.1/49.2/42.6/43.8; abs. pos. 80.5/49.0/42.4/43.2; abs.+rel. pos.
  81.3/50.2/43.4/44.0; rel. pos. w/o app. 79.3/48.2/41.9/44.1; rel. pos.
  (default) 81.3/50.5/43.7/46.1 — matches prose "+1.2%/+0.8% top-1... +1.3/
  +1.5 box AP and +1.1/+1.3 mask AP on COCO, and +2.3/+2.9 mIoU on ADE20K in
  relation to those without position encoding and with absolute position
  embedding"; absolute-position-embedding harms detection/segmentation
  ("-0.2 box/mask AP on COCO and -0.6 mIoU on ADE20K") despite +0.4%
  classification gain.
- Table 5/6, p.8: cyclic-shift speedups "13%, 18% and 18%" for Swin-T/S/B
  over naive padding; shifted-window efficiency multiples over sliding
  window naive/kernel implementations — "40.8×/2.5×, 20.2×/2.5×, 9.3×/2.1×,
  and 7.6×/1.8×" across the four stages; overall architecture speedups
  "4.1/1.5, 4.0/1.5, 3.6/1.5 times faster than variants built on sliding
  windows" for Swin-T/S/B.
- Table 7, p.9: per-stage channel/head configuration confirming
  $C\to2C\to4C\to8C$ doubling — Swin-T stage1 dim 96/head 3, stage2 dim
  192/head 6, stage3 dim 384/head 12, stage4 dim 768/head 24 (analogous
  scaling for S/B/L); window size 7×7 fixed across all stages/variants.
- §A2.1, p.9: stochastic depth ratios 0.2/0.3/0.5 for Swin-T/S/B.
