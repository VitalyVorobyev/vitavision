---
paper_id: yu2020-bisenet
title: "BiSeNet V2: Bilateral Network with Guided Aggregation for Real-time Semantic Segmentation"
authors: ["C. Yu", "C. Gao", "J. Wang", "G. Yu", "C. Shen", "S. Nong"]
year: 2020
url: https://arxiv.org/pdf/2004.02147
created: 2026-05-28
relevant_atlas_pages: [bisenet, fcn-semantic-segmentation, deeplab-semantic-segmentation, segformer, hrnet, convolutional-neural-network]
---

# Setting

Real-time semantic segmentation: per-pixel class labelling of RGB images at video-frame rates. Inputs are arbitrary RGB images; the paper evaluates on urban driving imagery (Cityscapes 2048×1024, CamVid 960×720) and a general scene-parsing benchmark (COCO-Stuff 640×640). Outputs are dense label maps at the original resolution. Speed is measured on a single NVIDIA GTX 1080 Ti with FP32 precision at 2048×1024 effective input (internally resized to 1024×512 for inference). The primary goal is to surpass V1 (ECCV 2018 conference paper) in both accuracy and speed while eliminating the dependency on an ImageNet-pretrained backbone.

V2 is a complete redesign of V1: V1 used a Spatial Path (three stride-2 convolutions, 64/128/256 channels), a Context Path built on a pretrained Xception39, an Attention Refinement Module (ARM), and a Feature Fusion Module (FFM). V2 replaces every one of these components.

# Core idea

BiSeNet V2 decomposes the feature extraction into two specialised branches running in parallel, then merges them with a learned gating layer.

**Detail Branch** — shallow, wide, no residual connections. Three stages S1/S2/S3, each stage beginning with a stride-2 Conv2d (BN + ReLU). Total downsampling factor 1/8 of the input. Stage channel widths: S1 = 64, S2 = 64, S3 = 128 (Table 1, §4.1). No skip connections; the paper follows the VGG-style stacking philosophy because the large spatial maps and wide channels make residual paths expensive in memory-access cost.

**Semantic Branch** — deep, narrow, fast-downsampling. Channel capacity is a fraction λ of the Detail Branch, with λ = 1/4 chosen by ablation (Table 3a, §5). Stages S3–S5 use GE layers; S5 concludes with a Context Embedding block. Semantic Branch channel widths at λ = 1/4: S1 = 16, S3 = 32, S4 = 64, S5 = 128 (Table 1, §3).

  - **Stem Block** (S1): two parallel downsampling paths — one 3×3 conv stride-2, one max-pool — concatenated. Fast, efficient feature expression with a 4× spatial reduction at the first stage (Table 1, §4.2).
  - **Gather-and-Expansion (GE) Layer** (S3–S5): an inverted-bottleneck variant with one extra 3×3 conv added before the depthwise block. Structure: (i) 3×3 conv to gather and expand to higher dimension; (ii) 3×3 depthwise conv over the expanded channels; (iii) 1×1 projection back to the output width. Expansion ratio ε = 6 (Table 3c, §5). When stride = 2, two 3×3 depthwise convolutions are stacked on the main path and a 3×3 separable conv is used as the shortcut (Fig. 5, §4.2). The extra gather convolution relative to MobileNetV2 inverted bottleneck provides higher feature expressiveness; the 3×3 convolution is also specially optimised in cuDNN.
  - **Context Embedding (CE) Block** (final S5 stage): global average pooling followed by a residual connection adds global context. The GAP compresses the feature map to a single spatial location, then it is broadcast-added back to the spatial feature map, embedding scene-level context efficiently (Fig. 4b, §4.2).

**Bilateral Guided Aggregation (BGA) Layer** — merges the two branches via mutual gating (Fig. 6, §4.3). From the Detail Branch side: a 3×3 depthwise conv + 1×1 conv produces an attention map, average-pooled and upsampled via bilinear interpolation. From the Semantic Branch side: a 3×3 depthwise conv (stride 2) + 1×1 conv produces a spatial gate. Each branch modulates the other:

  - Detail output ← Detail features ⊗ σ(Semantic features ↑)
  - Semantic output ← Semantic features ⊗ APool(Detail features)

where ⊗ is element-wise product, σ is sigmoid, ↑ is bilinear upsample, APool is average pooling for downsampling. Both modulated outputs are summed (Fig. 6, §4.3). This bidirectional gating is strictly stronger than simple summation or concatenation; the ablation in Table 2 shows BGA adds +1.07 mIoU over concatenation and +1.07 over summation on the Cityscapes val set.

**Booster training strategy** — auxiliary segmentation heads (seg-heads) are attached to the intermediate stages of the Semantic Branch only during training and discarded at inference (Fig. 3 and Fig. 7, §4.4). Each auxiliary head is a 3×3 conv → BN → ReLU → 1×1 conv → bilinear upsample pipeline, with output channel dimension C_t controlling its cost. The booster applies standard cross-entropy loss on the auxiliary outputs. In the ablation (Table 2, §5.1): adding Booster to the full architecture (Detail + Semantic + BGA) raises Cityscapes val mIoU from 69.67% to 73.19% with no GFLOPs increase at inference.

# Assumptions

1. (Soft) Urban or driving-domain imagery with spatially consistent semantics — performance may degrade on datasets with dramatically different appearance distributions.
2. (Hard) RGB input; no depth or multi-spectral channels assumed.
3. (Soft) Batch normalisation statistics are reliable — requires batch size ≥ 8–16 for stable BN (paper uses batch size 16, §5 Training).
4. (Soft) Training from scratch converges without ImageNet pretraining — this holds in practice (§5 Training; "kaiming normal" initialisation) but requires careful LR scheduling.
5. (Soft) Inference resolution is fixed — the FPS figures are tied to 1024×512 internal processing of 2048×1024 input. Applying the network to very different resolutions may require re-tuning.

# Failure regime

- **Very thin structures** (poles, traffic signs at distance): the 1/8 output stride of the Detail Branch limits boundary precision; the paper's visualisations show some degradation on fine linear structures.
- **Small object accuracy**: the Semantic Branch downsamples aggressively (1/32 at S5), which can lose small objects. The BGA layer partially compensates but does not fully recover detail-branch spatial precision.
- **Out-of-domain generalisation**: trained from scratch on Cityscapes, the model needs re-training or at least Cityscapes pre-training for other domains. CamVid experiments show >6 mIoU gain from Cityscapes pre-training (§5.3, Table 8), implying significant domain sensitivity.
- **Batch normalisation under very small batches**: BN is used throughout. At batch size 1 (e.g., single-image mobile deployment without TensorRT fusion), BN variance estimation collapses; this is common to all BN-heavy architectures.

# Numerical sensitivity

- **Channel ratio λ**: ablation (Table 3a, §5) shows λ = 1/4 is Pareto-optimal — λ = 1/2 adds 4.69 GFLOPs for 0.01 mIoU gain; λ = 1/8 saves 1.22 GFLOPs at a cost of 0.41 mIoU. The 64 and 128 channel dimensions of the late Semantic Branch stages (S4 and S5) are fixed regardless of λ; only the early stages scale.
- **GE expansion ratio ε**: ablation (Table 3c) selects ε = 6 as the expansion factor — consistent with MobileNetV2 practice. This directly multiplies the channel count inside the GE layer.
- **BiSeNetV2-Large (BiSeNetV2-L)**: obtained by setting width multiplier α = 2.0 and depth multiplier d = 3.0 (§5.2). Achieves 75.8% mIoU on Cityscapes val and 75.3% mIoU on Cityscapes test at 47.3 FPS (Table 7, §5.3).
- **Poly learning rate**: initial LR = 5e-2, schedule = (1 − iter/iter_max)^0.9, SGD momentum 0.9, weight decay 5e-4 (Cityscapes/CamVid) or 1e-4 (COCO-Stuff). Applied on conv layer parameters only.
- **Training iterations**: 150K (Cityscapes), 10K (CamVid), 20K (COCO-Stuff). Batch size = 16 in all cases (§5 Training).
- **BN momentum and inference speed**: the FPS measurement runs 5000 repeated iterations on one GPU (GTX 1080 Ti, CUDA 9.0, cuDNN 7.0, TensorRT v5.1.5, FP32) to reduce noise. The inference input is 2048×1024 (internally resized to 1024×512) and the output is resized back; the resize time is included in the measurement (§5 Inference).

# Applicability

- **Use when**: real-time semantic segmentation at ≥100 FPS on mid-range GPUs (≥ GTX 1080 class) for video or embedded robotics; training data is available and an ImageNet-pretrained backbone is not required or desired; autonomous driving or urban scene applications on Cityscapes-like imagery.
- **Don't use when**: maximum accuracy is required and inference latency is unconstrained (SOTA non-real-time models significantly exceed 75.8% mIoU); task requires panoptic or instance-level segmentation; input resolution is very low (<256 px wide); deployment target lacks cuDNN-optimised 3×3 conv (e.g., some mobile NPUs).
- **Compared against**: BiSeNet V1 (yu2018-bisenet — same group, conference predecessor), Fast-SCNN, ICNet, DFANet, SwiftNet, ERFNet, ESPNetV2, FDA-Net, FADA, GUN (§5.3, Tables 7, 8, 9). BiSeNetV2 outperforms all on the speed–accuracy frontier at Cityscapes test resolution according to Table 7: at 156 FPS it achieves 72.6% mIoU versus BiSeNet V1's ~68.4% at ~65 FPS.?

# Connections

- Builds on: [yu2018-bisenet, long2015-fcn]   # V2 extends V1's bilateral philosophy; FCN is the upstream semantic segmentation paradigm
- Enables: []      # subsequent works may adopt the GE layer or BGA design
- Refutes / supersedes: [yu2018-bisenet]   # V2 is a complete redesign that improves both speed and accuracy over V1

# Atlas update plan

## NEW: bisenet
Type: model
Category: segmentation
Primary source: this paper contributes the V2 (redesign) half of the combined page.

The `bisenet` Atlas page should cover both V1 (ECCV 2018) and V2 (IJCV 2021) as two major sections. The foundational/first half of the page (V1 architecture: Spatial Path, Context Path with Xception39, ARM, FFM) and the canonical `Relations:` block are recorded in the companion note `docs/research/notes/yu2018-bisenet.md`; the Relations block should NOT be duplicated here.

**V2 section — Motivation:**
- V1's cross-layer connections (ARM bridging context to spatial path, FFM fusing them) were costly and architecturally complex; V2 streamlines this into a cleaner bilateral design with purpose-built lightweight components.
- V1 required an ImageNet-pretrained backbone (Xception39 / ResNet18); V2 trains entirely from scratch, removing the pretraining dependency.
- V2 introduces Gather-and-Expansion layers (depth-wise bottleneck + extra gather conv) and a Context Embedding block (global average pooling + residual) as drop-in, self-contained components optimised for real-time semantic segmentation.

**V2 section — Architecture:**
- **Detail Branch**: 3 stages (S1/S2/S3), VGG-style conv stacking, no residual connections, output at 1/8 input resolution. Stage channels: 64 / 64 / 128.
- **Semantic Branch**: 5 stages. S1 = Stem Block (dual-path fast downsampling). S3/S4/S5 = GE layers. Final S5 = Context Embedding Block. Channel ratio λ = 1/4 relative to Detail Branch. Output at 1/32 input resolution.
- **GE Layer**: 3×3 conv (gather + expand) → 3×3 DWconv → 1×1 proj; expansion factor ε = 6. For stride = 2: two stacked DWconvs + separable shortcut.
- **BGA Layer**: bidirectional element-wise product gating — semantic branch guides detail via sigmoid-gated upsample; detail guides semantic via average-pooled downsample; results summed.
- **Booster**: auxiliary seg-heads on Semantic Branch stages, training only; zero inference cost.
- **Variants**: BiSeNetV2 (base, 156 FPS / 72.6% mIoU Cityscapes test); BiSeNetV2-L (α=2, d=3, 47.3 FPS / 75.3% mIoU Cityscapes test).

**V2 section — Implementations:**
- Official PyTorch implementation released by the authors (paper §5 confirms code will be made public).
- Third-party implementations exist in mmsegmentation and other open-source libraries.

**V2 section — Assessment:**
- Headline numbers (Cityscapes test, single-scale inference, 2048×1024 effective input, GTX 1080 Ti): BiSeNetV2 = 72.6% mIoU at 156 FPS; BiSeNetV2-L = 75.3% mIoU at 47.3 FPS (Table 7, §5.3).
- Cityscapes val ablation: Detail+Semantic+BGA = 69.67%; + Booster = 73.19%; + OHEM = 73.36% (Table 2, §5.1).
- CamVid test (from scratch): BiSeNetV2 = 72.4% mIoU; BiSeNetV2-L = 75.8%? mIoU (Table 8, §5.3 — exact L variant CamVid number at line 2017 listed; verify from Table 8 source).
- COCO-Stuff: BiSeNetV2-L reaches best results among the real-time baselines in Table 9.
- Training from scratch ("kaiming normal") converges without ImageNet pretraining, verified by ablation.

# Provenance

- Abstract (lines 113–138): headline numbers 72.6% mIoU at 156 FPS, 2048×1024 input, GTX 1080 Ti.
- §1 Introduction (lines 220–226): Detail/Semantic branch definitions; BGA purpose.
- §1 (lines 263–278): V2 vs V1 changes — removed cross-layer connections, deepened Detail Path, lightweighted Semantic Path, new aggregation layer.
- Figure 2 caption (lines 177–185): channel-capacity factor λ, e.g. λ = 1/4; bilateral segmentation backbone diagram.
- Table 1 caption (lines 378–388): λ = 1/4; stage/operation/channel/stride/repeat table for Detail and Semantic Branches.
- Table 1 rows (lines 411–608): exact per-stage channel and stride values for both branches.
- §3.1 Detail Branch (lines 616–623): wide channels, shallow layers, no residual connections.
- §3.2 Semantic Branch (lines 628–636): channel ratio λ, fast downsampling, global average pooling for receptive field.
- §4.1 Detail Branch (lines 676–683): output 1/8 of input; stride-2 first layer per stage; VGG-style stacking.
- Figure 4 caption (lines 698–706): Stem Block (dual branch concat) and Context Embedding Block (GAP + residual).
- §4.2 Stem Block (lines 746–750): dual-path downsampling concatenated as output.
- §4.2 Context Embedding Block (lines 756–759): GAP + residual connection for global context.
- §4.2 GE Layer description (lines 766–775): (i) 3×3 gather+expand, (ii) 3×3 DWconv, (iii) 1×1 proj; stride=2 variant uses two DWconvs + separable shortcut; ε = 6 selected by ablation (Table 3c line 1100).
- Figure 6 caption (lines 778–780): BGA layer components: DWconv, APooling, BN, Upsample (bilinear), Sigmoid, element-wise product (⊗), Sum.
- §4.3 BGA (lines 795–799): semantic guides detail via contextual information at different scales; bidirectional.
- §4.4 Booster (lines 813–820): auxiliary heads on Semantic Branch during training; discarded at inference; channel dimension C_t controls head cost.
- §5 Training (lines 1111–1117): SGD, momentum 0.9, batch size 16, LR 5e-2 poly schedule power 0.9; 150K/10K/20K iterations; weight decay 5e-4 (Cityscapes/CamVid) / 1e-4 (COCO-Stuff); kaiming normal init, no ImageNet pretraining.
- §5 Inference (lines 1130–1134): no sliding-window or multi-scale; 2048×1024 resized to 1024×512; resize time included; 5000 iterations repeated for FPS measurement; GTX 1080 Ti, CUDA 9.0, cuDNN 7.0, TensorRT v5.1.5, FP32.
- Table 2 (lines 861–953): ablation on Cityscapes val — Detail-only 62.35%, Semantic-only 64.68%, +Sum 68.60%, +Concat 68.93%, +BGA 69.67%, +Booster 73.19%, +OHEM 73.36% mIoU.
- Table 3a (lines 979–1003): λ ablation — λ=1/2: 69.66% / 25.84 GFLOPs; λ=1/4: 69.67% / 21.15 GFLOPs (chosen); λ=1/8: 69.26%; λ=1/16: 68.27%.
- §5.2 BiSeNetV2-Large (line 1856): α=2.0, d=3.0; 75.8% mIoU.
- §5.3 Cityscapes results text (line 2065): BiSeNetV2 = 72.6% at 156 FPS; BiSeNetV2-L = 75.3% at 47.3 FPS; Table 7 rows 1834, 1842.
- Table 8 (line 1870): CamVid comparisons; BiSeNetV2-L at line 2017.
- §5.3 CamVid text (line 2126): pre-training on Cityscapes improves CamVid mIoU by >6%.
