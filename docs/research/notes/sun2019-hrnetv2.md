---
paper_id: sun2019-hrnetv2
title: "High-Resolution Representations for Labeling Pixels and Regions"
authors: [Ke Sun, Yang Zhao, Borui Jiang, Tianheng Cheng, Bin Xiao, Dong Liu, Yadong Mu, Xinggang Wang, Wenyu Liu, Jingdong Wang]
year: 2019
url: https://arxiv.org/abs/1904.04514
created: 2026-05-27
relevant_atlas_pages: [hrnet]
---

# Setting

Dense prediction tasks: semantic segmentation (per-pixel class label), human pose estimation (2-D landmark heatmaps), face alignment (2-D landmark heatmaps), and region-level detection/instance segmentation.

**Inputs:** RGB images at varying resolutions. Segmentation experiments run at 512×1024 or 1024×2048 (Cityscapes). Detection uses the standard COCO 800-px short-edge convention.

**Outputs:**
- Segmentation: softmax probability map at 1/4 input resolution, 4× bilinear upsampled to full resolution.
- Face/body landmarks: Gaussian-peak heatmaps at 1/4 input resolution (no final upsample for face).
- Detection: a 5-level feature pyramid at strides 4/8/16/32/32 (the extra max-pool level), 256 channels each.

**Guarantees / units:** mIoU (segmentation), NME as % of inter-ocular / diagonal distance (landmarks), AP at IoU 0.5:0.95 (COCO detection/instance-seg).

# Core idea

HRNetV1 (the original pose paper) keeps parallel resolutions throughout training but reads only the highest-resolution stream at inference (1/4-scale, C channels). This paper shows that the low-resolution parallel streams encode semantic context that V1 discards.

**HRNetV2** fixes this by upsampling all four parallel streams bilinearly to 1/4 resolution, concatenating them (C + 2C + 4C + 8C = 15C total channels), and applying a single 1×1 convolution to the concatenated tensor to produce the final representation. For segmentation a second 1×1 conv maps to the class count; for face landmarks the 15C representation is fed through a final 1×1 to landmark channels. A 4× bilinear upsample is appended for segmentation only.

$$\mathbf{y} = \text{BN-ReLU}\bigl(W_{1\times1} \cdot [\mathbf{r}_1; \uparrow_2 \mathbf{r}_2; \uparrow_4 \mathbf{r}_3; \uparrow_8 \mathbf{r}_4]\bigr)$$

where $\mathbf{r}_k$ is the output of the $k$-th resolution branch (stride $2^{k-1}$ relative to 1/4 scale), and $\uparrow_s$ denotes factor-$s$ bilinear upsampling. The bracket denotes channel-wise concatenation.

**HRNetV2p** extends V2 for region-level tasks. The 15C concatenated tensor is first projected to 256 channels via 1×1 conv (matching FPN's channel width). Average-pooling strides of 2/4/8 + one max-pool then produce five pyramid levels at strides 4/8/16/32/32, which plug directly into Faster R-CNN / Mask R-CNN as the FPN backbone replacement.

The key architectural constant: the backbone has four stages with branch widths $C, 2C, 4C, 8C$. Stage 1 contains four bottleneck units (width 64) plus a 1×3 conv that projects to C channels. Stages 2/3/4 have 1/4/3 multi-resolution exchange blocks respectively; each block contains four residual units per resolution, each unit being two 3×3 convolutions with BN-ReLU.

Instantiation sizes: **W18** ($C=18$), **W32** ($C=32$), **W40** ($C=40$), **W48** ($C=48$).

# Assumptions

1. **ImageNet pretraining** (hard). For classification the same backbone appends cascaded bottlenecks + stride-2 3×3 convolutions to produce a 2048-dimensional feature; this head is discarded at transfer. The architecture is not validated from scratch.
2. **1/4-resolution streams carry spatially precise information** (soft). True for natural images with typical fine-grained structure; may degrade on microscopy or satellite imagery where the useful frequency content is finer-grained than what 1/4-resolution retains.
3. **Low-resolution streams add semantic value** (hard for V2; verified empirically in §4.4). If the additional streams were pure noise the 15C concatenation would still work via V1's channel subset, but the paper's whole justification collapses.
4. **Fixed 4× upsampling to full-resolution** (segmentation, soft). Bilinear upsample from 1/4 to 1/1 is cheap but introduces no learned refinement. Methods like deep-lab ASPP or learned upsampling could be substituted.
5. **5-level pyramid suffices for detection** (soft). Matches FPN's convention; objects smaller than the stride-4 level are ignored (rare on COCO).

# Failure regime

- **Small models, single scale, few training iterations:** HRNetV2p-W18 underperforms ResNet-50-FPN on COCO detection at the 1× training schedule (12 epochs). Authors note convergence is slow; W18 reaches parity only at 2× schedule. (§4.2, Table 6.)
- **Large-model Cityscapes saturation:** On Cityscapes val the gain from V1 → V2 is minor for large-channel models (W48). The paper notes this explicitly: "the gain is minor in the large model case in segmentation for Cityscapes" (§4.4). Plausible explanation: at high capacity, even V1 implicitly learns context without the stream aggregation.
- **Repeated/ambiguous texture at face landmarks:** NME degrades in the challenging subset of 300W (V2-W18 full=3.32 vs common=2.87). The hard cases are heavily-occluded or profile faces where the spatial context from low-resolution streams cannot compensate for missing signal.
- **High-resolution inference cost:** HRNetV2-W48 on 1024×2048 Cityscapes costs 696.2 GFLOPs single-scale (Table 1 context), significantly lower than PSPNet/DeepLabv3 on dilated backbones but still substantial.

# Numerical sensitivity

- **Bilinear upsample** is numerically benign (linear interpolation, no conditioning issue).
- **BN statistics across pyramid branches:** The 1×1 aggregation conv operates on concatenated features from four branches that may have different activation magnitudes. BN before the 1×1 normalises each branch separately; the concat+1×1 then reweights. If BN is frozen (fine-tuning with small batch), branch-scale mismatches can hurt.
- **FPN channel reduction 15C → 256:** W18 (C=18) compresses 270 → 256 (mild); W48 (C=48) compresses 720 → 256 (aggressive). Aggressive compression loses information; this is likely why W48+Faster R-CNN needs more epochs to show gains over W32 variants (§4.2).
- **32-bit vs 64-bit:** All convolutions are standard float32; no observed precision issue. BN with very small batch (e.g. 1 GPU, 1 image) can cause variance instability — authors use 4×V100 with batch 8 for segmentation.

# Applicability

- **Use when:** Semantic segmentation, human pose estimation, face alignment, or detection where high spatial resolution is needed and dilated convolutions are undesirable (high FLOPs, grid artifacts). HRNetV2 costs 2–4× fewer GFLOPs than DeepLabv3+/PSPNet on Cityscapes at better mIoU.
- **Don't use when:** Real-time (≤30 fps, embedded) — even W18 is not MobileNet-class. Depth estimation or point-cloud processing (not validated). Tiny objects below stride-4 resolution.
- **Compared against:**
  - DeepLabv3+ / Xception-71: 79.6 mIoU, 1444.6 GFLOPs → V2-W48: 81.1 mIoU, ~696 GFLOPs (Cityscapes val, single scale, no flip).
  - PSPNet / Dilated-ResNet-101: 79.7 mIoU, 2017.6 GFLOPs.
  - ResNet-50/101-FPN (Faster R-CNN): V2p-W32 outperforms both at 2× schedule; W18 needs 2× schedule to match ResNet-50-FPN.
  - EncNet (PASCAL Context 59-class): 52.6 mIoU → V2-W48: 54.0 mIoU.

# Connections

- Builds on: [sun2019-hrnet]   # V1 original; this paper directly extends V1's backbone
- Builds on: [lin2017-fpn]     # V2p's pyramid head mirrors FPN's channel width (256) and level structure
- Enables: []                  # no direct downstream paper in this repo yet

# Atlas update plan

## UPDATE: hrnet

This paper is a continuation of the original HRNet (V1) paper by the same first author. The existing `hrnet` page should become a family page covering V1 (pose), V2 (dense labeling), V2p (detection), and the journal version. All content below is additive to what V1 already describes.

### Section: Goal
Add:
- HRNetV2 extends V1 to semantic segmentation, face alignment, and human parsing by aggregating all parallel-resolution streams at inference (not just the highest-resolution one).
- HRNetV2p further adapts the representation into a multi-scale pyramid for region-level detection and instance segmentation, serving as a drop-in FPN replacement.

### Section: Algorithm (V2 head)
Add under a "Representation heads" or "V2 output head" sub-section:
- **V2 head:** Bilinearly upsample branches 2/3/4 to 1/4 resolution. Channel-concatenate all four streams → 15C channels (C+2C+4C+8C). Apply 1×1 conv (+ BN-ReLU) → task dimension. For segmentation: 4× bilinear upsample to full resolution + softmax. For landmarks: 1×1 to keypoint count (no final upsample for face landmarks).
- Equation: $\mathbf{y} = W_{1\times1}[\mathbf{r}_1;\,\uparrow_2\mathbf{r}_2;\,\uparrow_4\mathbf{r}_3;\,\uparrow_8\mathbf{r}_4]$ (BN-ReLU applied to concat before or after the 1×1 — see §3.1 of source).
- **V2p head:** Project 15C → 256 via 1×1; then average-pool by strides 2/4/8 + one max-pool → five pyramid levels at 1/4, 1/8, 1/16, 1/32 (max-pool adds a second 1/32 level to match FPN's P5). Each level is 256 channels. Feeds Faster R-CNN / Mask R-CNN RPN and RoI heads directly.
- Instantiation widths: W18 (C=18), W32 (C=32), W40 (C=40), W48 (C=48).

### Section: Implementation
Add:
- Backbone: two stride-2 3×3-conv stem layers reduce input to 1/4 resolution before stage 1.
- Stage 1: four bottleneck units (width 64) + one 3×3 conv → C channels. Only one resolution branch.
- Stages 2/3/4: introduce additional resolution branches (1/4/3 multi-resolution exchange blocks). Each exchange block: 4 residual units per resolution, each unit = two 3×3 convs with BN-ReLU.
- ImageNet pretraining: append cascaded bottlenecks + stride-2 convs after stage 4 to produce 2048-d for softmax head; discard at transfer.
- Training (segmentation): 4×V100, batch 8, 80k iterations, initial lr=0.01 (poly decay), data augmentation: random flip + random scale [0.5, 2.0] + crop 512×1024 (Cityscapes) or 480×480 (PASCAL Context).
- Training (detection): MMDetection framework, 1× (12 epochs) or 2× (24 epochs) schedules.

### Section: Remarks
Add:
- **Empirical validation of V2 over V1 (§4.4):** Aggregating low-resolution streams gives significant gains on Cityscapes val, PASCAL Context test, and COCO val. Exception: gain is minor for large-channel models (W48) on Cityscapes alone. A control variant HRNetV1h (V1 + appended 1×1 to increase representation dim) shows slight improvement over V1 but far less than V2, confirming that the gain comes from semantic context in low-res streams, not just larger representation.
- **Benchmark highlights:**
  - Cityscapes val single-scale no-flip: V2-W48 **81.1** mIoU (Table 1); V2-W40 **80.2**, outperforming DeepLabv3+-Xception-71 (79.6) at 1/3 the FLOPs.
  - Cityscapes test: V2-W48 **81.6** (multi-scale) / **80.4** (single-scale) (Table 2).
  - PASCAL Context test: V2-W48 **54.0** (59-class) / **48.3** (60-class), vs EncNet 52.6 (Table 3).
  - LIP val (human parsing): V2-W48 **55.90** mIoU, **88.21** pixel acc (Table 4).
  - COFW test: V2-W18 NME **3.45**, FR₀.₁ **0.19** (Table 11).
  - 300W: V2-W18 full NME **3.32** (common **2.87**, challenging **5.15**) (Table 12).
  - WFLW: see Table 9 in source (values not tabulated here; verify from paper PDF).
  - AFLW: see Table 10 in source (values not tabulated here; verify from paper PDF).
  - COCO detection (test-dev): V2p-W48 AP ~39.5 vs X-101-64×4d-FPN (Table 8; verify exact value from paper PDF).
- **FPN analogy:** V2p top-down vs FPN: FPN propagates semantics *downward* from the lowest-resolution feature; V2p keeps full-resolution features throughout and *downsamples* to build the pyramid. Both converge on 256 channels per level — V2p arrives there by compression, FPN by enrichment.

### Relations to add (frontmatter)
```yaml
relations:
  - type: feeds_into
    target: hrnet          # V1 backbone is V2's starting point; same first author
    confidence: high
    caution: "This note is the V2 extension; the 'feeds_into' edge is from V1 (hrnet) to downstream tasks, not an additional page"
```
Note: `sun2019-hrnetv2` should be added as an additional `sources.references[]` entry on the existing `hrnet` page (alongside the V1 primary source `sun2019-hrnet`). No new page is needed — V2/V2p are variants from the same lab, same backbone, same paper series.

# Provenance

- §3 (pp. 4–6 of arXiv v2): architecture description, V2 and V2p output heads, stage/block counts. HTML cache lines ~478–620.
- §3.1 Figure 3: diagrams of (a) V1 head, (b) V2 head, (c) V2p head. Raster figure — numerical details from surrounding prose.
- §3.2: instantiation widths W18/W32/W40/W48 stated explicitly.
- Table 1 (Cityscapes val): HTML cache lines ~748–870. Columns: method, backbone, mIoU, params, GFLOPs. HRNetV2-W48=81.1 is bold.
- Table 2 (Cityscapes test): HTML cache lines ~900–980. HRNetV2-W48=81.6 multi-scale, 80.4 single-scale.
- Table 3 (PASCAL Context test): HTML cache lines ~1010–1090. V2-W48=54.0 (59-class), 48.3 (60-class).
- Table 4 (LIP val): HTML cache lines ~1100–1160. V2-W48=55.90 mIoU, 88.21 pixel acc, 67.43 avg acc.
- §4.2 Tables 6/7/8 (COCO detection/instance-seg): HTML cache lines ~1380–1500. Qualitative comparison V2p-W32 vs ResNet-101-FPN; exact test-dev AP needs cross-check with paper PDF.
- §4.4 (Empirical analysis, pp. 10–11 of arXiv v2): comparison V1 vs V1h vs V2 on three benchmarks; quote: "the gain is minor in the large model case in segmentation for Cityscapes." HTML cache lines ~2080–2160.
- Table 11 (COFW test): HTML cache lines ~2780–2850. V2-W18 NME=3.45, FR₀.₁=0.19.
- Table 12 (300W): HTML cache lines ~2900–2980. V2-W18: common=2.87, challenging=5.15, full=3.32.
- Table 9 (WFLW): referenced but values not extracted before note write — mark for future verification.
- Table 10 (AFLW): referenced but values not extracted before note write — mark for future verification.
