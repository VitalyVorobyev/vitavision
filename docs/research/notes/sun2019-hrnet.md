---
paper_id: sun2019-hrnet
title: "Deep High-Resolution Representation Learning for Human Pose Estimation"
authors: ["K. Sun", "B. Xiao", "D. Liu", "J. Wang"]
year: 2019
url: https://arxiv.org/pdf/1902.09212
created: 2026-05-27
relevant_atlas_pages:
  - ritm-interactive-segmentation
  - resnet
  - deeplab-semantic-segmentation
  - fcn-semantic-segmentation
  - unet-segmentation
  - mask-rcnn
  - convolutional-neural-network
  - faster-rcnn
  - image-pyramid
---

# Setting

Problem class: dense-prediction backbone, specifically 2D single-person human pose estimation (keypoint localisation).

Input: an RGB image crop of a single person, resized to a fixed aspect-ratio rectangle (256×192 or 384×288 in the paper's primary experiments). Resolution is enforced before entering the network via an upstream person detector; the network itself operates on these fixed-size crops.

Output: K heatmaps of size W′×H′ (one per anatomical keypoint), where each heatmap H_k encodes the predicted location confidence for keypoint k (§3, paper). Keypoint positions are extracted by taking the location of the maximum activation in each heatmap and applying a quarter-pixel offset refinement toward the second-highest activation (§4.1, Testing paragraph).

The paper's primary benchmarks are COCO keypoint detection (17 keypoints, OKS-based AP) and MPII Human Pose (16 keypoints, PCKh@0.5). The paper explicitly lists semantic segmentation, object detection, face alignment, and image translation as intended future applications; HRNetV2 variants published in the extended journal version apply the same backbone to segmentation and detection.

The paper's central claim: maintaining high-resolution representations throughout the network—rather than encoding to low resolution and then upsampling—yields predictions that are both more accurate (richer feature content) and more spatially precise (no resolution loss to recover).

# Core idea

HRNet replaces the conventional encode-then-decode (high-to-low then low-to-high) design with **parallel multi-resolution streams** that are fused repeatedly throughout the entire forward pass.

**Stage progression.** The network is built in four stages (§3, "Parallel multi-resolution subnetworks"):
- Stage 1: a single high-resolution subnetwork (full input resolution ÷ 4, after the stem's two strided convolutions).
- Stage 2: a second parallel stream at half that resolution is added; both streams are fused.
- Stage 3: a third stream at quarter resolution is added; all three are fused.
- Stage 4: a fourth stream at eighth resolution is added; all four are fused.

The four parallel streams run at resolutions $1\times, \tfrac{1}{2}\times, \tfrac{1}{4}\times, \tfrac{1}{8}\times$ relative to the post-stem feature maps, and **all four remain active until the last exchange unit** — the network never discards a resolution pathway once it is created.

**Exchange unit (multi-scale fusion).** At each fusion point, every output stream $Y_k$ is the element-wise sum of the transformed input maps from all $s$ parallel streams:

$$Y_k = \sum_{i=1}^{s} a(X_i, k), \quad k = 1, \ldots, s$$

where $a(X_i, k)$ transforms $X_i$ from resolution $i$ to resolution $k$ (§3, "Repeated multi-scale fusion", Eq. implied by the text description and Figure 3):
- Same resolution ($i = k$): identity, $a(X_i, k) = X_i$.
- Downsampling ($i < k$): strided 3×3 convolution(s); one strided-2 conv for 2× downsampling, two consecutive for 4×.
- Upsampling ($i > k$): nearest-neighbour upsampling followed by a 1×1 convolution to align channel counts.

The extra output map when transitioning between stages ($Y_{s+1} = a(Y_s, s+1)$) creates the new lower-resolution stream.

**Network instantiation.** The stem consists of two stride-2 3×3 convolutions (resolution reduced to ¼ of input). Stage 1 contains 4 residual bottleneck units (ResNet-50 style, width 64), followed by a 3×3 conv reducing channels to $C$. Stages 2, 3, 4 contain 1, 4, 3 exchange blocks respectively; each exchange block contains 4 residual units with two 3×3 convolutions per resolution and an exchange unit (§3, "Network instantiation"). Total: 8 exchange units (8 multi-scale fusions). The final heatmaps are regressed from the high-resolution stream's output using MSE loss against 2D Gaussian-blurred ground-truth heatmaps (σ = 1 pixel).

**Variants by channel width.** The high-resolution stream has $C$ channels; parallel lower streams have $2C$, $4C$, $8C$ channels respectively:
- HRNet-W32: $C = 32$; parallel widths 32, 64, 128, 256. (§3, "Network instantiation")
- HRNet-W48: $C = 48$; parallel widths 48, 96, 192, 384. (§3)

An HRNet-W18 variant is referenced in later work but the primary paper reports W32 and W48 (Table 1 and Table 2).

# Assumptions

1. **(Hard) High-resolution stream must be preserved throughout.** The paper's ablation (§4.4, "Resolution maintenance") shows that adding all four streams at the start and running them in parallel without the sequential stage-by-stage progression gives 72.5 AP vs. 73.4 AP for the proposed design. The staged addition of lower-resolution streams is necessary for the low-level features from early high-resolution processing to have been computed before the lower-resolution branches are created. Removing the high-resolution branch entirely collapses to a ResNet-style encoder, which the baselines confirm is significantly worse.

2. **(Hard) Cross-resolution fusion must use strided/upsample convolutions, not pooling/interpolation alone.** The exchange unit's 3×3 strided conv for downsampling and 1×1 conv + nearest-neighbour upsample for upsampling are the specific mechanism that preserves learned spatial alignment across scales. The paper ablates the absence of intermediate exchange (Table 6): without any intermediate exchange AP is 70.8; with only across-stage exchanges 71.9; with both across-stage and within-stage exchanges (full method) 73.4.

3. **(Soft) Position-sensitive task.** The architecture is designed for tasks where spatial precision matters. For image-level classification tasks, the parallel high-resolution streams add memory overhead without meaningful accuracy gains — the paper's own ImageNet classification experiment shows only comparable performance to ResNet (§Appendix, "Results on the ImageNet Validation Set"), with HRNet-W32 achieving 22.7% top-1 error vs. ResNet's roughly comparable number.

4. **(Soft) Input resolution ≥ 128×96 for meaningful use of all four streams.** At the paper's smallest input size tested (128×96), AP is ~62% (Figure 6); the lowest-resolution parallel stream (1/8 scale = 16×12 spatial) carries very limited spatial information. The paper notes explicitly that "the quality of heatmap prediction over the lowest-resolution response map is too low and the AP score is below 10 points" (§4.4, "Representation resolution").

5. **(Soft) ImageNet pretraining helps but is not required.** HRNet-W32 trained from scratch achieves 73.4 AP vs. 74.4 AP with ImageNet pretraining (Table 1), a +1.0 point gain — pretraining is beneficial but the architecture is not dependent on it.

# Failure regime

**Very small inputs.** At 128×96, AP drops to ~62% and HRNet-W32 still outperforms SimpleBaseline-ResNet50 at the same size, but the absolute accuracy is low (Figure 6). Below this, the eight-times-downsampled stream is spatially degenerate.

**Global-context tasks.** Image classification accuracy is only comparable to ResNet, not better (Appendix, ImageNet results). HRNet's design specifically targets *position-sensitive* dense prediction; for tasks that require only global reasoning (scene classification, image-level labels), the additional memory cost of maintaining four resolutions provides no benefit.

**Activation-memory-constrained environments.** Running four parallel streams at full throughput requires substantially more activation memory than a sequential encoder-decoder. At HRNet-W48 with 384×288 input, the network uses 63.6M parameters and 32.9 GFLOPs (Table 1). Parameter count is comparable to ResNet-152 (68.6M), but the four parallel activation maps at all depths mean peak memory is higher than the GFLOPs figure implies. For mobile or real-time video inference where memory bandwidth dominates, lighter alternatives (HRNet-W18-small or MobileNet-based backbones) are typically preferred.

**Occluded or invisible keypoints.** The COCO OKS metric uses a visibility flag $v_i$; performance degrades on heavily occluded poses. The paper reports APM (medium objects) and APL (large objects) separately, but does not isolate occlusion regimes — standard keypoint estimation failure mode, not specific to HRNet.

**Non-person keypoint tasks with different topology.** The architecture and loss are tuned for human anatomy (K = 17 COCO keypoints, or 16 MPII). Adapting to significantly different keypoint counts or object categories requires re-specification of K and heatmap ground-truth generation, which is straightforward, but the backbone itself was validated primarily in human pose.

# Numerical sensitivity

**Channel-width scaling.** W32 → W48 yields +0.7 AP on 256×192 input (Table 1: 74.4 → 75.1) and +0.5 on 384×288 (75.8 → 76.3), demonstrating diminishing returns at larger width. The four-stream channel structure (C, 2C, 4C, 8C) means doubling C quadruples the parameter count in the widest (lowest-resolution) stream — width growth has super-linear cost in parameters but sub-linear returns in accuracy.

**Input resolution.** HRNet-W32 at 256×192 vs. 384×288: +1.4 AP (74.4 → 75.8, Table 1). SimpleBaseline-ResNet152 at the same transition: +2.3 AP (72.0 → 74.3). The paper notes that HRNet's improvement over SimpleBaseline is more pronounced at smaller input sizes — +4.0 points at 256×192, +6.3 points at 128×96 (§4.4, Figure 6 caption) — because maintaining high resolution is more critical when the input resolution is already constrained.

**Number of fusions.** Table 6 ablation:
- 1 fusion (final exchange only): AP = 70.8
- 3 fusions (across-stage only): AP = 71.9
- 8 fusions (full method, across-stage + within-stage): AP = 73.4

Each additional level of fusion yields diminishing but positive returns.

**Learning rate schedule.** Adam optimiser; base LR = 1e-3, decayed to 1e-4 at epoch 170 and 1e-5 at epoch 200, training for 210 epochs (§4.1, Training). The schedule follows SimpleBaseline [72] — no special warmup or cosine schedule reported for the primary experiments.

**Heatmap ground truth.** 2D Gaussian, σ = 1 pixel, centred on the ground-truth keypoint location (§3, "Heatmap estimation"). The small σ means the loss is sharply penalised for sub-pixel localisation errors; the quarter-pixel offset refinement at test time addresses this.

**COCO val AP, key numbers (Table 1):**
| Model | Input | Pretrain | #Params | GFLOPs | AP |
|---|---|---|---|---|---|
| HRNet-W32 | 256×192 | N | 28.5M | 7.10 | 73.4 |
| HRNet-W32 | 256×192 | Y | 28.5M | 7.10 | 74.4 |
| HRNet-W48 | 256×192 | Y | 63.6M | 14.6 | 75.1 |
| HRNet-W32 | 384×288 | Y | 28.5M | 16.0 | 75.8 |
| HRNet-W48 | 384×288 | Y | 63.6M | 32.9 | 76.3 |

**COCO test-dev AP, top numbers (Table 2):**
- HRNet-W48: 75.5 AP (384×288)
- HRNet-W48 + extra data (AI Challenger): 77.0 AP

**MPII PCKh@0.5 (Table 3 and Table 4):**
- HRNet-W32: 92.3 PCKh@0.5 (ties Tang et al. [62], outperforms Hourglass [40] at 90.9, SimpleBaseline-ResNet152 at 91.5)
- HRNet-W48: 92.3 PCKh@0.5 (same as W32 on this saturated benchmark)
- HRNet-W32 params: 28.5M, GFLOPs: 9.5 at 256×256 (Table 4)

# Applicability

- **Use when:** dense-prediction tasks where position accuracy matters — 2D keypoint detection, semantic segmentation, instance segmentation, face alignment, line/curve detection. HRNet-W32 provides strong accuracy at moderate computational cost; HRNet-W48 maximises accuracy.
- **Don't use when:** image-level classification (no benefit over ResNet), low-resolution inputs (<128px on the short side), severely memory-constrained real-time inference (mobile, embedded), or tasks where global context dominates over local spatial precision.
- **Compared against:** Hourglass [40] (symmetric encode-decode), CPN [11] (cascaded pyramid network, ResNet-50 backbone), SimpleBaseline [72] (ResNet + transposed convolutions), RMPE/PyraNet [77] (feature pyramid learning). HRNet outperforms all on COCO val and test-dev with comparable or fewer parameters and GFLOPs than SimpleBaseline-ResNet152 (see Table 1 and Table 2).

# Connections

- **Builds on:**
  - `he2016-resnet` (he2016-resnet?) — residual blocks (bottleneck in Stage 1, basic 3×3-conv pairs in remaining stages) compose the depth within each branch; the paper explicitly cites He et al. 2016 [22] as the design rule for distributing depth across stages.
  - Newell et al. 2016 Stacked Hourglass [40] — the dominant prior work that establishes the encode-decode paradigm for pose estimation; HRNet is explicitly positioned as an alternative. (paper_id in index: ?)
  - Chen et al. 2017 CPN / Cascaded Pyramid Network [11] — the main ResNet-based competitor; used as a direct comparison. (paper_id: ?)
  - Szegedy et al. 2015 GoogLeNet/Inception [61 in paper = ref 61 = Szegedy et al. CVPR 2015] — cited for intermediate supervision concept; multi-branch parallel computation precedent. (szegedy2015-inception?)
  - Wang et al. 2016 Deeply-Fused Nets [67] — cited as inspiration for the repeated multi-scale fusion design.

- **Enables:**
  - `sofiiuk2021-ritm` — RITM interactive segmentation (Sofiiuk et al. 2021) deploys HRNet-W18 as its feature backbone; the paper explicitly names HRNet as the backbone of choice.
  - HRNet+OCR semantic segmentation (Yuan et al. 2020) — uses HRNet-W48 as the backbone; not yet in Atlas index.
  - HigherHRNet (Cheng et al. 2020) — extends HRNet to multi-person bottom-up pose estimation.

- **Refutes / supersedes:** Not a supersession of any single method. The paper challenges the *design principle* of encode-then-decode by demonstrating that maintaining high resolution throughout outperforms it on position-sensitive tasks. No individual prior method is declared historically obsolete.

# Atlas update plan

## NEW: hrnet
Type: model
Category: backbone (dense-prediction)
Primary source: this paper (sun2019-hrnet)
Relations:
  - { type: feeds_into, target: ritm-interactive-segmentation, confidence: high }
  - { type: compared_with, target: resnet, confidence: medium, caution: "ResNet is the dominant backbone for dense prediction; HRNet trades higher activation memory for better keypoint/segmentation accuracy via parallel high-resolution streams." }

Bullets per public-page section:

**Motivation:**
- Prior dense-prediction backbones (Hourglass, SimpleBaseline, CPN) all follow an encode-then-decode pattern: compress to low resolution to build high-level features, then upsample to recover spatial precision. This lossy recover-from-low approach limits spatial accuracy.
- HRNet's central thesis: if the high-resolution representation is never discarded, the network can simultaneously accumulate semantic context (via lower-resolution parallel branches) and preserve spatial precision. The result is heatmaps that are "more accurate and spatially more precise" (§Abstract).

**Architecture:**
- Stem: two stride-2 3×3 convolutions reduce spatial dimensions to ¼ of input; 64 channels.
- Stage 1: 4 residual bottleneck units (width 64), then a 3×3 conv to $C$ channels. One stream at full post-stem resolution.
- Stages 2–4: each stage adds one lower-resolution branch. Final network has four parallel streams at $\frac{1}{4}, \frac{1}{8}, \frac{1}{16}, \frac{1}{32}$ of input resolution (i.e., $1\times, \frac{1}{2}\times, \frac{1}{4}\times, \frac{1}{8}\times$ post-stem).
- Stream widths: $C, 2C, 4C, 8C$ channels. W32: $C$=32 (32/64/128/256); W48: $C$=48 (48/96/192/384).
- Exchange unit: strided 3×3 for downsampling; 1×1 conv + nearest-neighbour upsample for upsampling; identity for same-resolution paths. Each output is a sum of all transformed inputs.
- Exchange block: 4 residual units + 1 exchange unit. Stage 2: 1 block; Stage 3: 4 blocks; Stage 4: 3 blocks → 8 total fusions.
- Head: the high-resolution stream output is passed directly to a regressor (1×1 conv) producing K heatmaps. MSE loss vs. 2D Gaussian GT (σ=1 px).

**Implementations:**
- Official PyTorch repo: https://github.com/leoxiaobin/deep-high-resolution-net.pytorch (cited in Abstract and §Abstract). This is the original paper repo from one of the first authors.
- The HRNet-Maintainers organisation (https://github.com/HRNet) maintains separate repos for different tasks: HRNet-Human-Pose-Estimation, HRNet-Semantic-Segmentation, HRNet-Object-Detection. Verify current canonical repo at the orchestrator review step.
- HRNetV2 / HRNetV2p: extended variants with multi-scale head outputs (fusing all four resolution streams rather than using the high-resolution stream only) are used in segmentation and detection downstream tasks.
- Widely integrated: mmsegmentation, mmdetection, timm, torchvision (as of 2021+); verify current status at time of authoring.
- Pretrained weights: ImageNet-pretrained W32/W48 models available from the official repos; the paper reports that pretraining yields +1.0 AP on COCO val for W32.

**Assessment:**
- On COCO keypoint val (256×192 input, pretrained): W32 74.4 AP / 28.5M params / 7.10 GFLOPs; W48 75.1 AP / 63.6M params / 14.6 GFLOPs (Table 1).
- On COCO test-dev: W48 75.5 AP; W48 + extra data 77.0 AP (Table 2).
- On MPII PCKh@0.5: W32 and W48 both 92.3, matching the then-best published result (Table 3/4).
- Efficiency: at matched input size 384×288, HRNet-W32 outperforms SimpleBaseline-ResNet152 by 1.5 AP at 45% of the GFLOPs (Table 1, §4.1 "Results on validation set").
- Weakness: activation memory is higher than GFLOPs suggest due to four parallel streams; poor fit for memory-constrained deployment.
- Downstream adoption: became a standard dense-prediction backbone; explicitly selected by RITM, HRNet+OCR, HigherHRNet, and numerous segmentation/detection frameworks.

**References:**
- Primary: sun2019-hrnet (this paper).
- Comparison: SimpleBaseline (Xiao et al. 2018, ref [72] in paper — paper_id?), CPN (Chen et al. 2018, ref [11] — paper_id?), Hourglass (Newell et al. 2016, ref [40] — paper_id?).
- Backbone building block: he2016-resnet (ref [22]).

## UPDATE: ritm-interactive-segmentation
Section: References / sources.references
Bullets:
  - Add `sun2019-hrnet` to `sources.references[]` when authoring the HRNet page (so the existing RITM page links to the new HRNet card).
  - The existing RITM page already mentions HRNet by name in its body and notes; once the HRNet page exists, the build will surface the reverse `fedBy` edge automatically — no body edit required on the RITM page beyond the references update.

## REFS: downstream / family context (no typed Atlas edges)

- **deeplab-semantic-segmentation**, **fcn-semantic-segmentation**, **unet-segmentation**: dense-prediction-family context. These are the established encode-decode designs that HRNet's parallel-stream principle is positioned against. HRNet can be (and was) used as the backbone for all three task classes in subsequent work; no typed `relations[]` edge appropriate between the HRNet backbone page and these task-level pages.
- **mask-rcnn**, **faster-rcnn**: downstream tasks reported in the HRNet paper. Table 2 includes Mask-RCNN [21] (ResNet-50-FPN) as a baseline comparison in the COCO test-dev top-down category. HRNet's architecture can be adapted as a backbone for both; no typed relation from the backbone page to detection-framework pages is warranted.
- **convolutional-neural-network**: foundational concept. HRNet is a CNN; the concept page provides context for the building blocks (residual units, strided convolutions, batch normalisation) used within each branch.
- **image-pyramid**: multi-scale-representation contrast. The image-pyramid concept (feed multiple image resolutions to multiple networks or processing paths) is the conceptual predecessor to learned multi-scale feature representations. HRNet achieves multi-scale fusion internally within a single-input network; the contrast is worth noting on both pages as a pedagogical link, but no typed relation applies.

# Provenance

All numerical constants and structural claims are traceable to the paper as retrieved from the ar5iv HTML and plain-text cache (`sun2019-hrnet.html`, `sun2019-hrnet.txt`).

- **Abstract, §1**: "maintains high-resolution representations through the whole process"; parallel subnetworks connected in parallel; repeated multi-scale fusions.
- **§3, "Parallel multi-resolution subnetworks" (Eq. 2)**: 4-stage network structure with N^1_1 → N^2_1 → N^3_1 → N^4_1, plus N^2_2 → N^3_2 → N^4_2 branches, etc. (text lines 176–181 of .txt).
- **§3, "Network instantiation"**: Stage 1 = 4 bottleneck units width 64 + 3×3 conv to C; Stage 2 = 1 exchange block; Stage 3 = 4 exchange blocks; Stage 4 = 3 exchange blocks; total 8 exchange units / 8 fusions. W32: widths 64/128/256 for non-high-res streams; W48: 96/192/384 (text lines 184–217).
- **§3, "Repeated multi-scale fusion"**: strided 3×3 for downsampling, 1×1 + nearest-neighbour upsample for upsampling, identity for same resolution; summation aggregation $Y_k = \sum_i a(X_i, k)$ (text lines 196–254).
- **§3, "Heatmap estimation"**: MSE loss; 2D Gaussian σ=1 pixel GT (text lines 255–266).
- **§4.1, Training**: Adam, base LR 1e-3, drop to 1e-4 at epoch 170 and 1e-5 at epoch 200, terminate at 210 epochs; input 256×192 or 384×288 (text lines 307–313).
- **Table 1** (COCO val): HRNet-W32 scratch 73.4 AP / 28.5M / 7.10 GFLOPs; pretrained 74.4; W48 pretrained 75.1 (256×192); W32 75.8, W48 76.3 (384×288) (text lines 267–281).
- **Table 2** (COCO test-dev): HRNet-W48 75.5 AP; +extra data 77.0 AP; W32 74.9 AP (text lines 283–303).
- **Table 3** (MPII PCKh@0.5 test): HRNet-W32 total 92.3 (text line 342).
- **Table 4** (#Params/GFLOPs/PCKh, MPII): HRNet-W32 28.5M params, 9.5 GFLOPs, 92.3 PCKh@0.5 (text line 390).
- **Table 6** (ablation, repeated multi-scale fusion): (a) 1 fusion → 70.8 AP; (b) 3 fusions → 71.9 AP; (c) 8 fusions → 73.4 AP (text lines 406–411).
- **§4.4, "Resolution maintenance"**: variant with all 4 streams from the start achieves 72.5 AP vs. 73.4 for the proposed design (text lines 492–504).
- **§4.4, "Representation resolution"**: "the quality of heatmap prediction over the lowest-resolution response map is too low and the AP score is below 10 points" (text lines 492–508).
- **§4.4, Figure 6 discussion**: improvement over SimpleBaseline is 4.0 pts at 256×192 and 6.3 pts at 128×96 (text lines 500–507).
- **Appendix, ImageNet**: HRNet-W32 top-1 error 22.7%, top-5 error 6.5%; W48 top-1 22.1%, top-5 6.1% (text lines 563–570).
- **§5, Conclusion**: future applications listed as "semantic segmentation, object detection, face alignment, image translation" (text lines 520–525).
