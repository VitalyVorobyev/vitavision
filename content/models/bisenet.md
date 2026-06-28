---
title: "BiSeNet"
date: 2026-05-28
summary: "Two-branch (bilateral) CNN for real-time semantic segmentation: a wide shallow path preserves spatial detail while a deep narrow path with global pooling supplies receptive field, merged by a learned fusion module. V1 (2018) pairs a Spatial Path and a Context Path (ARM + FFM) on an ImageNet-pretrained backbone; V2 (2020) redesigns it with a Detail Branch, a from-scratch Semantic Branch of Gather-and-Expansion layers, Bilateral Guided Aggregation, and a training-only Booster — 72.6% mIoU at 156 FPS on Cityscapes test (V2, Table 7)."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "5.8M–49.0M (V1 variants)"
flops: "2.9–10.8 GFLOPs (V1 @ 640×360)"
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: compared_with
    target: segformer
    confidence: high
  - type: compared_with
    target: deeplab-semantic-segmentation
    confidence: high
  - type: compared_with
    target: hrnet
    confidence: medium
    caution: "Both target spatial-detail loss in dense prediction — HRNet via a maintained high-resolution branch, BiSeNet via the Spatial/Detail Path."
sources:
  primary: yu2018-bisenet
  references:
    - yu2020-bisenet
    - long2015-fcn
    - he2016-resnet
  notes: |
    V1 (yu2018-bisenet): Spatial Path = 3 × (Conv stride-2 → BN → ReLU),
    output 1/8 (§3.1). Context Path = lightweight backbone (Xception39 /
    ResNet18 / ResNet101) + global average pooling + incomplete U-shape
    (§3.2). ARM = GAP → 1×1 conv → BN → sigmoid → channel reweight (§3.2).
    FFM = concat → BN → GAP → 1×1 conv → ReLU → 1×1 conv → sigmoid → reweight
    → residual add (§3.3, SE-style). Joint loss (Eq. 2):
    $L(X;W)=l_p(X;W)+\alpha\sum_{i=2}^{K} l_i(X_i;W)$, $K=3$, $\alpha=1$.
    Headline (Table 6): Xception39 68.4% / 105.8 FPS, Res18 74.7% / 65.5 FPS
    on Cityscapes test (Titan XP, 1536×768); Res101 78.9% test (Table 7).
    Complexity (Table 4, @640×360): Xception39 5.8M / 2.9 GFLOPs; Res18
    49.0M / 10.8 GFLOPs.

    V2 (yu2020-bisenet): Detail Branch (channels 64/64/128, 1/8, no
    residuals) + Semantic Branch (Stem Block, GE layers, Context Embedding;
    channel ratio λ=1/4; → 1/32). GE layer = 3×3 gather-expand → 3×3 DWconv →
    1×1 proj, ε=6 (Table 3c). BGA = bidirectional gating: Detail ⊗
    σ(↑Semantic); Semantic ⊗ APool(Detail); summed (§4.3, Fig. 6). Booster =
    training-only auxiliary seg-heads (§4.4). Trains from scratch (kaiming
    normal). Headline (Table 7): BiSeNetV2 72.6% / 156 FPS, BiSeNetV2-L
    (α=2.0, d=3.0) 75.3% / 47.3 FPS on Cityscapes test (GTX 1080 Ti). Val
    ablation (Table 2): +BGA 69.67%, +Booster 73.19%; BGA +1.07 mIoU over
    concatenation. Complexity 21.15 GFLOPs at λ=1/4 (Table 3a).
implementations:
  - role: official
    repo: https://github.com/yu-changqian/TorchSeg
    commit: 62eeb159aee77972048d9d7688a28249d3c56735
    framework: pytorch
    license: MIT
  - role: community
    repo: https://github.com/CoinCheung/BiSeNet
    commit: 6b4b67a8e3eb0cc23b3d7a94843a7c3c11dedca8
    framework: pytorch
    license: MIT
  - role: community
    repo: https://github.com/open-mmlab/mmsegmentation
    commit: b040e147adfa027bbc071b624bedf0ae84dfc922
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Semantic segmentation assigns a class label to every pixel in an RGB image, producing a label map at input resolution. BiSeNet decouples two competing demands — spatial detail preservation and large receptive field — into two parallel branches that run concurrently and are merged by a learned fusion module. V1 (ECCV 2018) addresses the failure modes of three common speed-up strategies (input downsizing, channel pruning, and stage dropping), all of which sacrifice either detail or context; V2 (IJCV 2021) redesigns every component of V1 using purpose-built lightweight blocks and eliminates the dependency on an ImageNet-pretrained backbone. Both versions target real-time inference (≥30 FPS on a single GPU) with competitive accuracy on urban scene benchmarks.

# Architecture

**Family & shape.** CNN. Two-branch (bilateral) encoder with a learned branch-fusion module and a lightweight upsampling head. Input $(3, H, W)$ → per-pixel logits $(N_{\text{cls}}, H, W)$. In V1, both branches produce feature maps at $1/8$ of the input resolution. In V2, the Detail Branch outputs at $1/8$ and the Semantic Branch reaches $1/32$ before fusion. V1 uses ImageNet-pretrained backbones for the context-providing branch (Xception39, ResNet18, or ResNet101); V2 is trained entirely from scratch with no ImageNet backbone. This is a two-paper family page: V1 (2018) introduces Spatial Path + Context Path + ARM + FFM; V2 (2021) replaces every component with Detail Branch + Semantic Branch + BGA + Booster.

![BiSeNet bilateral architecture: an input RGB image fans into a wide shallow detail-preserving branch and a deep narrow context branch, merged by a learned fusion module before upsampling to a per-pixel label map.](./images/bisenet/bilateral.svg)

**Blocks.** Both eras are described below.

*V1 components.* The **Spatial Path** consists of three consecutive Conv→BN→ReLU layers each with stride 2, yielding output at $1/8$ the input resolution; the large spatial extent of this path preserves fine-grained detail. The **Context Path** uses a lightweight backbone (Xception39 in the primary speed variant; ResNet18 or ResNet101 in accuracy variants) followed by global average pooling to guarantee receptive field equal to the full image; an incomplete U-shape fuses features from the last two backbone stages at $1/8$ resolution. An **Attention Refinement Module (ARM)** is applied at each Context Path stage output: global average pooling → 1×1 conv → BN → sigmoid → channel-wise multiply. The **Feature Fusion Module (FFM)** merges the two paths: concatenate Spatial Path and Context Path outputs → BN → global average pooling → 1×1 conv → ReLU → 1×1 conv → sigmoid → channel reweight → residual addition (SE-style channel attention).

*V2 components.* The **Detail Branch** is wide and shallow, with no residual connections, following VGG-style conv stacking. Three stages (S1/S2/S3) each begin with a stride-2 convolution; channel widths are 64 / 64 / 128, and total downsampling is $1/8$. The **Semantic Branch** is deep and narrow; its channel capacity is a fraction $\lambda = 1/4$ of the Detail Branch (chosen by ablation, Table 3a). It uses a **Stem Block** at S1 (two parallel downsampling paths — one 3×3 conv stride-2, one max-pool — concatenated) for fast early downsampling. Stages S3–S5 use **Gather-and-Expansion (GE) layers**: a 3×3 conv to gather and expand channels, a 3×3 depthwise conv over the expanded representation, and a 1×1 projection back to output width, with expansion ratio $\varepsilon = 6$ (Table 3c). When stride = 2, two stacked depthwise convolutions form the main path and a 3×3 separable conv acts as the shortcut. The final S5 stage includes a **Context Embedding (CE) block**: global average pooling broadcast-added back to the spatial feature map as a residual, embedding scene-level context at negligible cost. The Semantic Branch outputs at $1/32$.

The **Bilateral Guided Aggregation (BGA)** layer merges the two V2 branches via bidirectional gating. The BGA fusion in PyTorch:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class BilateralGuidedAggregation(nn.Module):
    """Each branch modulates the other, then the two are summed."""

    def __init__(self, channels: int) -> None:
        super().__init__()
        self.detail_dw = nn.Conv2d(channels, channels, 3, padding=1, groups=channels, bias=False)
        self.detail_pw = nn.Conv2d(channels, channels, 1, bias=False)
        self.sem_dw = nn.Conv2d(channels, channels, 3, padding=1, groups=channels, bias=False)
        self.sem_pw = nn.Conv2d(channels, channels, 1, bias=False)
        self.bn_sem = nn.BatchNorm2d(channels)

    def forward(self, detail: torch.Tensor, semantic: torch.Tensor) -> torch.Tensor:
        size = detail.shape[2:]
        # Semantic guides detail: sigmoid-gated, upsampled to detail resolution.
        sem_gate = torch.sigmoid(F.interpolate(
            self.bn_sem(self.sem_pw(self.sem_dw(semantic))), size=size,
            mode="bilinear", align_corners=False))
        detail_out = detail * sem_gate
        # Detail guides semantic: average-pooled down to semantic resolution.
        det_gate = F.adaptive_avg_pool2d(
            self.detail_pw(self.detail_dw(detail)), output_size=semantic.shape[2:])
        sem_out = semantic * det_gate
        return detail_out + F.interpolate(sem_out, size=size, mode="bilinear", align_corners=False)
```

The **Booster** attaches auxiliary segmentation heads to intermediate Semantic Branch stages during training only; all Booster heads are discarded at inference, adding zero inference cost.

**Training.** V1 pre-trains the Context Path backbone on ImageNet; the Spatial Path is trained from scratch. The principal loss is softmax cross-entropy applied to the FFM output, plus two auxiliary softmax losses on Context Path stage outputs, combined with equal weight $\alpha = 1$:

:::definition[Joint segmentation loss]
Softmax cross-entropy on the final fused output plus auxiliary cross-entropy on each Context Path stage, weighted equally.

$$
L(X; W) = l_p(X; W) + \alpha \sum_{i=2}^{K} l_i(X_i; W), \quad K = 3,\; \alpha = 1.
$$
:::

V1 optimizer: SGD, batch 16, momentum 0.9, weight decay $10^{-4}$, poly LR schedule with initial LR $2.5 \times 10^{-2}$ and power 0.9. Scale augmentation: $\{0.75, 1.0, 1.5, 1.75, 2.0\}$. V1 headline metrics (Cityscapes test, 1536×768 inference on Titan XP): BiSeNet-Xception39 achieves 68.4% mIoU at 105.8 FPS (Table 6); BiSeNet-Res18 achieves 74.7% mIoU at 65.5 FPS (Table 6); BiSeNet-Res101 achieves 78.9% mIoU without an FPS constraint (Table 7).

V2 trains entirely from scratch (kaiming-normal initialisation, no ImageNet pretraining). Booster auxiliary heads add training-only supervision at intermediate Semantic Branch stages. Optimizer: SGD, batch 16, momentum 0.9, weight decay $5 \times 10^{-4}$, poly LR schedule with initial LR $5 \times 10^{-2}$ and power 0.9, 150K iterations on Cityscapes. V2 headline metrics (Cityscapes test, GTX 1080 Ti, 2048×1024 effective input): BiSeNetV2 achieves 72.6% mIoU at 156 FPS (Table 7); BiSeNetV2-L ($\alpha=2.0$, $d=3.0$) achieves 75.3% mIoU at 47.3 FPS (Table 7). Cityscapes val ablation (Table 2): Detail + Semantic + BGA = 69.67% mIoU; adding Booster raises this to 73.19% mIoU.

**Complexity.** V1: BiSeNet-Xception39 = 5.8M parameters / 2.9 GFLOPs; BiSeNet-Res18 = 49.0M parameters / 10.8 GFLOPs (both at 640×360 input, Table 4). V2: 21.15 GFLOPs at $\lambda = 1/4$ (Table 3a).

# Implementations

The official author release (TorchSeg) covers V1; community PyTorch implementations (CoinCheung/BiSeNet, mmsegmentation) cover both V1 and V2.

# Assessment

**Novelty.**

- V1 decoupled spatial detail and receptive field into two parallel paths rather than recovering spatial information through decoder skip connections applied to costly high-resolution feature maps (the U-shape encoder-decoder approach); ARM and FFM introduce SE-style channel attention for context refinement and branch fusion respectively.
- V2 replaced the ImageNet-pretrained Context Path backbone with a from-scratch Semantic Branch built from the Gather-and-Expansion layer — an inverted-bottleneck variant with an added 3×3 gather convolution that provides higher feature expressiveness than a standard MobileNetV2 bottleneck — and introduced Bilateral Guided Aggregation, a bidirectional cross-branch gating mechanism stronger than summation or concatenation (Table 2: BGA +1.07 mIoU over concatenation on Cityscapes val).
- Both variants build on the FCN fully-convolutional dense-prediction paradigm (long2015-fcn), where both branches produce feature maps at fractional stride and feed a pixel-wise prediction head.

**Strengths.**

- Real-time frontier with table-cited speed-accuracy trade-offs: V2 achieves 72.6% mIoU at 156 FPS versus V1 Xception39 at 68.4% mIoU at 105.8 FPS, a gain in both dimensions simultaneously (Table 7, V2; Table 6, V1).
- The bilateral design makes the detail-providing path nearly free in wall-clock time, since both branches run concurrently.
- V2 removes the ImageNet-pretraining dependency entirely, enabling direct training on target-domain data without a pretrained backbone.

**Limitations.**

- The $1/8$ output stride of the Spatial Path (V1) and Detail Branch (V2) smears boundaries finer than 8 pixels and loses small or thin structures (poles, distant signage).
- A single global average pooling operation encodes scene-level context; this cannot represent multi-scale structured spatial context the way ASPP (DeepLab) or PSP pooling does.
- BN-heavy architectures — BN appears in both paths, in ARM, FFM, and BGA — are numerically unstable at batch size 1 without fused or synchronized BN, complicating single-image mobile deployment.
- V2 trained from scratch exhibits significant domain sensitivity: CamVid mIoU improves by more than 6 points when initializing from Cityscapes pre-training rather than training from scratch (V2, §5.3).

# References

1. C. Yu, J. Wang, C. Peng, C. Gao, G. Yu, S. Nong. *BiSeNet: Bilateral Segmentation Network for Real-time Semantic Segmentation.* ECCV, 2018. [arXiv 1808.00897](https://arxiv.org/pdf/1808.00897)
2. C. Yu, C. Gao, J. Wang, G. Yu, C. Shen, S. Nong. *BiSeNet V2: Bilateral Network with Guided Aggregation for Real-time Semantic Segmentation.* IJCV, 2021. [arXiv 2004.02147](https://arxiv.org/pdf/2004.02147)
3. J. Long, E. Shelhamer, T. Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. [arXiv 1411.4038](https://arxiv.org/abs/1411.4038)
4. K. He, X. Zhang, S. Ren, J. Sun. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arXiv 1512.03385](https://arxiv.org/pdf/1512.03385)
