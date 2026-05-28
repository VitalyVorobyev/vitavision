---
title: "HRNet"
date: 2026-05-27
summary: "CNN backbone family for dense prediction that maintains a high-resolution branch throughout the network and runs four parallel multi-resolution streams ($C, 2C, 4C, 8C$ channels) with eight repeated cross-resolution fusions; V1 uses the high-resolution stream only (pose heatmaps), V2 upsamples and concatenates all four streams for per-pixel labelling (semantic segmentation, face landmarks), and V2p adds an FPN-style multi-scale output for object detection and instance segmentation."
tags: ["deep-learning", "dense-prediction", "keypoint-detection"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "28.5M (W32), 63.6M (W48) — Table 1"
flops: "7.10 GFLOPs (W32), 14.6 GFLOPs (W48) @ 256×192"
prerequisites: [convolutional-neural-network]
failureModes: []
relations:
  - type: feeds_into
    target: ritm-interactive-segmentation
    confidence: high
  - type: feeds_into
    target: focalclick
    confidence: high
    caution: "FocalClick uses HRNet18s+OCR and HRNet32+OCR as the Segmentor backbone in three of its six published variants (hrnet18s-S1/S2, hrnet32-S2); the small-crop Segmentor input (128×128 or 256×256) makes HRNet practical for CPU deployment."
  - type: compared_with
    target: resnet
    confidence: medium
    caution: "ResNet is the dominant backbone for dense prediction; HRNet trades higher activation memory for better keypoint/segmentation accuracy via parallel high-resolution streams."
sources:
  primary: sun2019-hrnet
  references:
    - he2016-resnet
    - sun2019-hrnetv2
    - wang2020-hrnet-journal
  notes: |
    Four parallel resolution streams maintained throughout the network at
    $1\times, \frac{1}{2}\times, \frac{1}{4}\times, \frac{1}{8}\times$ of
    post-stem resolution (¼ of input). Channel widths $C, 2C, 4C, 8C$ —
    W32 uses $C{=}32$ (32/64/128/256); W48 uses $C{=}48$ (48/96/192/384)
    (§3, Table 1 ablations). Exchange unit (§3): strided 3×3 for
    downsampling, 1×1 conv + nearest-neighbour upsample for upsampling,
    identity for same-resolution paths; each output branch is the sum of
    all transformed input branches: $Y_k = \sum_i a(X_i, k)$. Total
    architecture: Stage 1 = 4 residual bottleneck units (width 64), then
    1 exchange block; Stage 2 = 1 exchange block; Stage 3 = 4 blocks;
    Stage 4 = 3 blocks; 8 cross-resolution fusions total. Head: 1×1 conv
    on the high-resolution branch → K keypoint heatmaps; MSE loss against
    2D Gaussian GT with σ=1 px. Headline COCO val keypoint AP
    (256×192 input, ImageNet-pretrained): W32 74.4 AP / 28.5M / 7.10
    GFLOPs; W48 75.1 AP / 63.6M / 14.6 GFLOPs (Table 1). COCO test-dev:
    W48 75.5 AP; W48 + extra data 77.0 AP (Table 2). MPII PCKh@0.5: W32
    92.3, W48 92.3 (Table 3/4). Fusion ablation: 1 fusion → 70.8 AP,
    3 → 71.9, 8 (full) → 73.4 AP (W32 from scratch, Table 6).
    Pretraining: ImageNet pretraining adds +1.0 AP on COCO val for W32
    (Table 1, 73.4 → 74.4). Efficiency: HRNet-W32 outperforms
    SimpleBaseline-ResNet152 by 1.5 AP at 384×288 input at ~45% of the
    GFLOPs (Table 1, §4.1).

    Family extension grounded in sun2019-hrnetv2 + wang2020-hrnet-journal:
    HRNetV1 head — high-resolution stream output only (pose use). HRNetV2
    head — upsample all four streams to ¼-resolution, concatenate (15C
    channels for W32), 1×1 conv → per-pixel labels (sun2019-hrnetv2 §3).
    HRNetV2p head — V2 output downsampled to 5 pyramid levels (¼ to 1/64)
    for FPN-style detection (sun2019-hrnetv2 §3, Mask R-CNN / Faster
    R-CNN backbone). ImageNet classification head (HRNet-C, wang2020-
    hrnet-journal Appendix B, Table XV): cascaded hierarchical merge of
    the four streams, then global average pooling + linear. Width
    nomenclature for classification variants differs from dense-
    prediction variants (W18/W30/W40/W44/W76/W96 for classification;
    W18/W32/W40/W48 for dense). Headline benchmarks across the family:
    Cityscapes val mIoU (HRNetV2-W48 81.1, sun2019-hrnetv2 Table); COCO
    object detection AP with HRNetV2p (sun2019-hrnetv2 §4); ImageNet
    classification top-1 advantage over ResNet at matched FLOPs is small
    (≤1.5 pp), confirming HRNet is a dense-prediction backbone first
    (wang2020-hrnet-journal Table XV).
implementations:
  - role: official
    repo: https://github.com/leoxiaobin/deep-high-resolution-net.pytorch
    commit: 6f69e4676ad8d43d0d61b64b1b9726f0c369e7b1
    framework: pytorch
    license: MIT
draft: false
---

# Motivation

A CNN backbone family for dense prediction that maintains a high-resolution feature stream throughout the entire forward pass, in contrast to encode-then-decode designs (Stacked Hourglass, SimpleBaseline with transposed convolutions, CPN) that compress to low resolution to accumulate semantic context and then attempt to recover spatial precision by upsampling. The family covers three output head variants — HRNetV1 (pose heatmaps from the high-resolution stream only), HRNetV2 (all four parallel streams upsampled and concatenated for per-pixel labelling such as semantic segmentation and face alignment), and HRNetV2p (HRNetV2 output further downsampled into an FPN-style pyramid for object detection and instance segmentation) — unified and consolidated in a 2020 TPAMI journal paper that also introduces a classification head (HRNet-C). The defining property shared across all variants is that the full-resolution stream is never discarded; lower-resolution parallel streams are added stage by stage and fused repeatedly with the high-resolution stream throughout the forward pass.

# Architecture

**Family & shape.** CNN backbone, not sequential encoder-decoder. Input: $H \times W \times 3$ RGB. Four parallel resolution streams carry $C$, $2C$, $4C$, $8C$ channels respectively, where $C$ is the instantiation width. Dense-prediction variants are W18 / W32 / W40 / W48; classification variants introduced in the journal are W18 / W30 / W40 / W44 / W76 / W96. Output depends on the head variant:

- **HRNetV1** — high-resolution stream only ($\tfrac{H}{4} \times \tfrac{W}{4}$, $C$ channels); used for pose heatmaps.
- **HRNetV2** — all four streams bilinearly upsampled to $\tfrac{H}{4} \times \tfrac{W}{4}$ and channel-concatenated ($C + 2C + 4C + 8C = 15C$ channels for any width), followed by a 1×1 convolution; used for per-pixel segmentation and face landmarks.
- **HRNetV2p** — HRNetV2 representation first projected to 256 channels via 1×1 convolution, then downsampled through stride-2 3×3 convolutions and a max-pool to produce five pyramid levels at strides 4/8/16/32/32; used as a drop-in FPN replacement for Faster R-CNN / Mask R-CNN.
- **HRNet-C** — four resolution streams collapsed via cascaded strided bottlenecks to 1024 channels, then 1×1 to 2048, then global average pool → 2048-dim linear classifier; introduced in the TPAMI 2020 journal paper.

**Blocks.** The network is organised in four stages (§3, "Parallel multi-resolution subnetworks"):

- *Stem:* two stride-2 3×3 convolutions reduce spatial resolution to $\tfrac{H}{4} \times \tfrac{W}{4}$ at 64 channels.
- *Stage 1:* four residual bottleneck units (ResNet-50 style, width 64) followed by a 3×3 convolution reducing channels to $C$. One stream only.
- *Stage 2:* a second stream at $\tfrac{1}{2}$ post-stem resolution is added; 1 exchange block. Two active streams.
- *Stage 3:* a third stream at $\tfrac{1}{4}$ post-stem resolution is added; 4 exchange blocks. Three active streams.
- *Stage 4:* a fourth stream at $\tfrac{1}{8}$ post-stem resolution is added; 3 exchange blocks. Four active streams throughout.

Each exchange block contains four residual units (two 3×3 convolutions per branch, with batch normalisation and ReLU) followed by one exchange unit. Total fusions: $1 + 4 + 3 = 8$ exchange units across the four stages (§3, "Network instantiation").

The **exchange unit** is the multi-resolution fusion block. Every output stream $Y_k$ is the element-wise sum of all input streams transformed to resolution $k$:

$$Y_k = \sum_{i=1}^{s} a(X_i, k), \quad k = 1, \ldots, s$$

where $a(X_i, k)$ is (§3, "Repeated multi-scale fusion"):

- $i = k$: identity.
- $i < k$ (downsample): $(k - i)$ consecutive stride-2 3×3 convolutions with batch normalisation; ReLU omitted on the final step.
- $i > k$ (upsample): 1×1 convolution to align channel counts, batch normalisation, nearest-neighbour upsample by factor $2^{i-k}$.

The exchange unit in PyTorch:

```python
import torch.nn as nn
import torch.nn.functional as F


class ExchangeUnit(nn.Module):
    """Multi-resolution fusion: each output branch sums all transformed inputs.
    Strided 3x3 downsamples; 1x1 conv + nearest upsample for upsampling;
    identity for same-resolution paths. Sec. 3, HRNet (Sun et al., 2019).
    """

    def __init__(self, channels: list[int]):
        super().__init__()
        n = len(channels)
        self.fuse = nn.ModuleList([
            nn.ModuleList([self._branch(channels[i], channels[j], i, j)
                           for j in range(n)])
            for i in range(n)
        ])

    def _branch(self, ci: int, co: int, i: int, j: int) -> nn.Module:
        if i == j:
            return nn.Identity()
        if i < j:  # downsample: j-i strided-2 conv blocks
            layers = []
            for k in range(j - i):
                c = co if k == j - i - 1 else ci
                layers += [nn.Conv2d(ci if k == 0 else c, c, 3, 2, 1, bias=False),
                           nn.BatchNorm2d(c)]
                if k < j - i - 1:
                    layers.append(nn.ReLU(inplace=True))
            return nn.Sequential(*layers)
        # upsample: 1x1 conv + nearest upsample by 2^(i-j)
        return nn.Sequential(
            nn.Conv2d(ci, co, 1, bias=False), nn.BatchNorm2d(co),
            nn.Upsample(scale_factor=2 ** (i - j), mode="nearest"),
        )

    def forward(self, xs: list) -> list:
        return [
            sum(F.relu(self.fuse[i][j](x)) for j, x in enumerate(xs))
            for i in range(len(xs))
        ]
```

The **HRNetV2 head** fuses all four resolution streams by bilinearly upsampling branches 2, 3, and 4 to $\tfrac{1}{4}$-resolution and channel-concatenating with branch 1, producing a 15C-channel tensor:

$$\mathbf{y} = \text{BN-ReLU}\!\left(W_{1\times1} \cdot [\mathbf{r}_1;\; \uparrow_2 \mathbf{r}_2;\; \uparrow_4 \mathbf{r}_3;\; \uparrow_8 \mathbf{r}_4]\right)$$

where $\mathbf{r}_k$ is the output of the $k$-th resolution branch and $\uparrow_s$ denotes factor-$s$ bilinear upsampling (sun2019-hrnetv2, §3). For segmentation an additional 4× bilinear upsample restores full input resolution before the softmax. The **HRNetV2p head** projects the 15C concatenated tensor to 256 channels via 1×1 convolution and downsamples through stride-2 3×3 convolutions (plus one max-pool) to form five pyramid levels matching FPN's channel width and level structure.

**Training.** *Pose estimation (HRNetV1):* Dataset: COCO Keypoints train2017; AI Challenger extra data used for the top-line test-dev result. Loss: MSE on per-pixel heatmaps against 2D Gaussian ground truth.

:::definition[Keypoint heatmap MSE loss]
For $K$ keypoints, the ground-truth heatmap $G_k$ is a 2D Gaussian centred on the annotated keypoint $\mathbf{p}_k$ with bandwidth $\sigma = 1$ px; the loss is the per-pixel L2 distance to the prediction $\hat{M}_k$.

$$
\mathcal{L} = \frac{1}{K}\sum_{k=1}^{K}\|\hat{M}_k - G_k\|_2^2,\qquad G_k(x,y) = \exp\!\left(-\frac{(x-p_{k,x})^2+(y-p_{k,y})^2}{2\sigma^2}\right).
$$
:::

Schedule: Adam, base learning rate 1e-3, decayed to 1e-4 at epoch 170 and 1e-5 at epoch 200, training for 210 epochs (§4.1). Augmentation: random rotation, random scale, random flip. Headline metrics: COCO val keypoint AP at 256×192 — W32 74.4, W48 75.1 (Table 1); MPII PCKh@0.5 — W32 92.3, W48 92.3 (Table 3/4).

*Semantic segmentation (HRNetV2):* Dataset: Cityscapes (512×1024 crop), PASCAL Context (480×480 crop), LIP human parsing. Loss: per-pixel cross-entropy. Augmentation: random horizontal flip, random scale in [0.5, 2.0]. Optimiser: SGD with polynomial LR decay, 80k iterations, batch 8 on 4×V100. Headline metric: Cityscapes val single-scale no-flip mIoU — HRNetV2-W48 81.1 (sun2019-hrnetv2, Table 1); PASCAL Context test 59-class — HRNetV2-W48 54.0 mIoU (sun2019-hrnetv2, Table 3).

*Object detection (HRNetV2p):* Dataset: COCO detection. Framework: MMDetection with Faster R-CNN / Mask R-CNN; 2× LR schedule (24 epochs), shorter edge 800, horizontal flip augmentation (wang2020-hrnet-journal, §6). HRNetV2p-W32 outperforms ResNet-101-FPN; HRNetV2p-W40 outperforms ResNet-152-FPN at the 2× schedule.

*ImageNet classification (HRNet-C, journal only):* Dataset: ImageNet-1k, 224×224 single-crop. Optimiser: SGD with Nesterov momentum 0.9, weight decay 1e-4, initial LR 0.1 decayed ×10 at epochs 30/60/90, 100 epochs, batch 256 (wang2020-hrnet-journal, Appendix B). Classification head: cascaded strided bottlenecks collapsing four streams to 1024 channels, then 1×1 to 2048, then global average pool. Representative top-1 errors at matched FLOPs: HRNet-W44-C (21.9M params, 3.90 GFLOPs) 23.0% vs ResNet-50 (25.6M, 3.82 GFLOPs) 23.3%; HRNet-W76-C (40.8M, 7.30 GFLOPs) 21.5% vs ResNet-101 (44.6M, 7.30 GFLOPs) 21.6% (wang2020-hrnet-journal, Table XV). The classification advantage is small (at most 1.5 pp top-1 across all tested widths) and HRNet is not recommended as a classification backbone where activation-memory cost dominates.

**Complexity.** HRNet-W32: 28.5 M parameters, 7.10 GFLOPs at 256×192. HRNet-W48: 63.6 M parameters, 14.6 GFLOPs at 256×192, 32.9 GFLOPs at 384×288 (sun2019-hrnet, Table 1). At 384×288 input, W32 outperforms SimpleBaseline-ResNet152 by 1.5 AP at approximately 45% of the GFLOPs (§4.1, Table 1). Classification-variant FLOPs at 224×224 input: HRNet-W44-C 3.90 GFLOPs (21.9M params); HRNet-W76-C 7.30 GFLOPs (40.8M params); HRNet-W18-C 3.99 GFLOPs (21.3M params) (wang2020-hrnet-journal, Table XV).

# Implementations

Official PyTorch release by co-author Bin Xiao; widely ported (mmsegmentation, mmdetection, timm) and extended via the HRNet-Maintainers organisation to segmentation, detection, and face-alignment variants (HRNetV2 / HRNetV2p).

# Assessment

**Novelty.**

- Replaces the encode-then-decode design principle (Stacked Hourglass, SimpleBaseline ResNet + transposed convolutions, CPN) with parallel multi-resolution streams that are maintained throughout the entire network — the high-resolution representation is never discarded.
- Introduces the exchange unit's tripartite transformation (strided 3×3 for downsampling, 1×1 convolution + nearest-neighbour upsample for upsampling, identity for same resolution) operating across all active streams simultaneously at each fusion point.
- Demonstrates that the number of cross-resolution fusions is a critical design variable: 8 fusions yield substantially better heatmaps than 3 or 1 (Table 6 ablation: 70.8 AP / 71.9 AP / 73.4 AP for 1, 3, and 8 fusions respectively).
- HRNetV2's all-streams-upsampled-and-concatenated head outperforms HRNetV1's high-resolution-only head on per-pixel labelling tasks; the low-resolution streams contribute semantic context that V1 discards. The V1h control variant (V1 head with a widened 1×1 to match the V2 output dimension) shows marginal improvement over V1 but far less than V2, confirming the gain originates from semantic context rather than from a larger output dimension (sun2019-hrnetv2, §4.4).
- HRNetV2p provides an FPN-style multi-scale output for region-level tasks by downsampling the 15C fused representation to five pyramid levels — reuses the parallel-stream backbone without modification and plugs directly into two-stage detection frameworks as a backbone replacement.

**Strengths.**

- COCO val keypoint AP: W32 74.4 versus SimpleBaseline-ResNet152 72.0 at the same 256×192 input (Table 1) at substantially lower compute; the margin widens to 6.3 points at 128×96 input (§4.4, Figure 6).
- COCO test-dev W48 + AI Challenger extra data: 77.0 AP — top published result at the paper's release (Table 2).
- 1.5 AP gain over SimpleBaseline-ResNet152 at 384×288 input at approximately 45% of the GFLOPs (Table 1, §4.1).
- Semantic segmentation: HRNetV2-W48 reaches 81.1 mIoU on Cityscapes val (single-scale, no flip) versus DeepLabv3+-Xception-71 at 79.6 mIoU using roughly half the GFLOPs (≈696 GFLOPs vs 1444.6 GFLOPs); PASCAL Context test 59-class: 54.0 mIoU versus EncNet at 52.6 mIoU (sun2019-hrnetv2, Tables 1 and 3).
- Object detection: HRNetV2p-W32 and W40 outperform ResNet-101-FPN and ResNet-152-FPN respectively with Faster R-CNN at the 2× training schedule on COCO (wang2020-hrnet-journal, §6).
- Architecture-level transfer: the same backbone is reused without modification for pose estimation, semantic segmentation, instance segmentation, face alignment, and object detection, consistent with the paper's "position-sensitive task" generalisation claim.
- ImageNet classification: HRNet-C variants are slightly more parameter-efficient than matched ResNets — HRNet-W18-C (21.3M, 3.99 GFLOPs) 23.1% top-1 error versus ResNet-38 (28.3M, 3.80 GFLOPs) 24.6% — though the advantage is small (wang2020-hrnet-journal, Table XV).

**Limitations.**

- Activation memory is dominated by four parallel resolution streams maintained throughout the network — at training time the backbone uses substantially more activation memory than a ResNet backbone at matched parameter count, because peak memory scales with the sum of all active feature maps rather than with a single encoder tower.
- Very-low-resolution inputs (below 128×96 on the short side) leave the lowest-resolution stream at $16 \times 12$ spatial extent, which is effectively degenerate; the paper notes that "the quality of heatmap prediction over the lowest-resolution response map is too low and the AP score is below 10 points" (§4.4, "Representation resolution").
- Classification-style tasks where global-context reasoning dominates do not benefit meaningfully from the high-resolution stream; the ImageNet classification advantage over ResNet at matched FLOPs is at most 1.5 pp top-1 error reduction across all tested widths (wang2020-hrnet-journal, Table XV). The activation-memory overhead is hardest to justify on pure classification tasks where high-resolution feature maps are not load-bearing.
- No fine-tuning recipe for mobile or edge deployment — the smallest published variant W18-small (used by RITM as a lighter interactive-segmentation backbone) trades accuracy for size and is not the paper's headline configuration.

# References

1. Sun, K., Xiao, B., Liu, D., & Wang, J. *Deep High-Resolution Representation Learning for Human Pose Estimation.* CVPR, 2019. [arxiv](https://arxiv.org/abs/1902.09212)
2. He, K., Zhang, X., Ren, S., & Sun, J. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arxiv](https://arxiv.org/abs/1512.03385)
3. Sun, K. et al. *High-Resolution Representations for Labeling Pixels and Regions.* arXiv:1904.04514, 2019. [arxiv](https://arxiv.org/abs/1904.04514)
4. Wang, J. et al. *Deep High-Resolution Representation Learning for Visual Recognition.* TPAMI, 2020. [arxiv](https://arxiv.org/abs/1908.07919)
