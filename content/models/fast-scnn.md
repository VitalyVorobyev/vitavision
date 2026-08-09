---
title: "Fast-SCNN"
date: 2026-05-28
summary: "Real-time semantic segmentation CNN whose shared shallow 'Learning to Downsample' prefix feeds both a deep low-resolution global-feature branch and a high-resolution detail skip, merged by a feature-fusion module — eliminating the duplicate early downsampling that two-branch segmenters pay. Built from depthwise-separable and MobileNetV2 inverted-residual blocks; ~1.11M parameters; 68.0% mIoU at 123.5 FPS on Cityscapes test (1024×2048, Titan Xp, Table 5)."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "1.11M"
prerequisites: [convolutional-neural-network]
failureModes: []
relations:
  - type: compared_with
    target: bisenet
    confidence: high
  - type: compared_with
    target: deeplab-semantic-segmentation
    confidence: high
  - type: compared_with
    target: segformer
    confidence: medium
  - type: compared_with
    target: hrnet
    confidence: medium
sources:
  primary: poudel2019-fast-scnn
  references:
    - yu2018-bisenet
    - long2015-fcn
  notes: |
    Learning to Downsample (LtD, §3.2.1): Conv2d 3×3 s2 (32 ch) → DSConv 3×3
    s2 (48 ch) → DSConv 3×3 s2 (64 ch); all BN+ReLU; output 1/8. Output shared
    as detail skip AND Global Feature Extractor input (§3.3.1). GFE (§3.2.2,
    Table 1): nine MobileNetV2 inverted-residual bottlenecks, expansion t=6 —
    3×(→64, init s2), 3×(→96, init s2), 3×(→128, s1) → 1/32 — then Pyramid
    Pooling Module. FFM (Table 3, §3.2.3): low-res branch = bilinear upsample
    ×4 → dilated DWConv (dilation = upsample factor = 4, ReLU) → 1×1 conv (no
    nonlinearity); skip branch = 1×1 conv (no nonlinearity); add → ReLU;
    128 ch at 1/8. Classifier: 2× DSConv (128) → 1×1 Conv (19) → upsample ×8.
    Bottleneck (Table 2): 1×1 expand to tc → 3×3/s DWConv → 1×1 project to c'
    (no nonlinearity). Training (§4.1): SGD momentum 0.9, batch 12, poly LR
    base 0.045 power 0.9, ℓ2 0.00004 (non-depthwise), ~1000 epochs from
    scratch, aux CE heads on LtD+GFE weight 0.4, resize 0.5–2. Results:
    68.0% test mIoU / 84.7% category, 1.11M params (Table 4); 123.5 FPS @
    1024×2048, 285.8 @ 512×1024, 51.9% @ 256×512 (Tables 5, 7); skip ablation
    69.22%→64.30% (§4.2); +ImageNet 68.62%→69.15% (+0.53 pp, Table 6).
    BiSeNet baseline: 71.4% test, 5.8M params, 57.3 FPS (Tables 4, 5).
implementations:
  - role: community
    repo: https://github.com/Tramac/Fast-SCNN-pytorch
    commit: 0638517d359ae1664a27dfb2cd1780a40a06c465
    framework: pytorch
    license: Apache-2.0
  - role: community
    repo: https://github.com/open-mmlab/mmsegmentation
    commit: b040e147adfa027bbc071b624bedf0ae84dfc922
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Fast-SCNN addresses per-pixel semantic segmentation of high-resolution RGB images — primary experiments at Cityscapes 1024×2048 px — producing a dense 19-class label map at full input resolution. The distinguishing architectural property is a shared **Learning to Downsample** (LtD) prefix: a single shallow module whose output simultaneously serves as the spatial-detail skip connection and the entry point for the deep, low-resolution global-context branch. Two-branch real-time segmenters pay the cost of independent initial downsampling in both branches; by sharing these early layers, Fast-SCNN eliminates that redundancy while retaining the dual-stream structure that separates fine spatial detail from global semantic context. The target operating regime is above-real-time throughput on a single GPU with competitive accuracy on the Cityscapes benchmark.

# Architecture

**Family & shape.** CNN; the encoder is built from depthwise-separable convolutions and MobileNetV2-style inverted-residual bottleneck blocks. Input $(3, H, W)$ → logits $(19, H, W)$ for the 19-class Cityscapes taxonomy, upsampled to full resolution at inference. Four sequential modules compose the network: Learning to Downsample → Global Feature Extractor → Feature Fusion Module → Classifier. Total parameter count: ~1.11M.

![Fast-SCNN architecture: a shared Learning-to-Downsample prefix at 1/8 resolution feeds both a deep Global Feature Extractor branch (down to 1/32, with pyramid pooling) and a high-resolution detail skip; the Feature Fusion Module merges them before the classifier upsamples to a per-pixel label map.](./images/fast-scnn/architecture.svg)

**Blocks.**

*Learning to Downsample (LtD).* The first module consists of three stride-2 layers (§3.2.1): a standard Conv2d (3×3, 32 channels), followed by two depthwise-separable convolutions (DSConv 3×3, 32→48→64 channels). A regular convolution is used for the first layer because with only 3 input channels DSConv offers negligible savings; the subsequent two layers use depthwise separation. All three layers apply stride 2, batch normalization, and ReLU; the nonlinearity between the depthwise and pointwise steps inside each DSConv is omitted following MobileNetV2 convention. The LtD output sits at $\tfrac{1}{8}$ of the input resolution (128×256 for a 1024×2048 input) with 64 channels, and this single feature map is shared — unchanged — as both the high-resolution detail skip and the Global Feature Extractor's input.

*Global Feature Extractor (GFE).* The GFE takes the $\tfrac{1}{8}$-resolution LtD output and applies nine MobileNetV2 inverted-residual bottleneck blocks arranged in three groups with expansion factor $t = 6$ throughout (§3.2.2, Table 1): 3 blocks at 64→64 channels with initial stride 2 (output $\tfrac{1}{16}$), 3 blocks at 64→96 channels with initial stride 2 (output $\tfrac{1}{32}$), 3 blocks at 96→128 channels with stride 1 (remaining at $\tfrac{1}{32}$). A Pyramid Pooling Module (PPM) is appended to aggregate multi-scale context at this coarse resolution.

*Feature Fusion Module (FFM).* The FFM merges the $\tfrac{1}{8}$-resolution LtD skip and the $\tfrac{1}{32}$-resolution GFE output (Table 3, §3.2.3). On the low-resolution (GFE) branch: bilinear upsample ×4 to match the LtD spatial dimensions, then a dilated depthwise conv (3×3, dilation = 4, with ReLU), then a pointwise 1×1 conv with no nonlinearity. On the high-resolution (LtD) skip branch: a pointwise 1×1 conv with no nonlinearity. The two branches are added element-wise, followed by a final ReLU. The fused map is 128 channels at $\tfrac{1}{8}$ input resolution.

The Feature Fusion Module in PyTorch:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class FeatureFusionModule(nn.Module):
    def __init__(self, channels: int = 128) -> None:
        super().__init__()
        # Low-resolution (GFE) branch: dilated DWConv + pointwise (no nonlinearity)
        self.dw_conv = nn.Conv2d(channels, channels, kernel_size=3,
                                 padding=4, dilation=4, groups=channels, bias=False)
        self.pw_low = nn.Conv2d(channels, channels, kernel_size=1, bias=False)
        # High-resolution (LtD skip) branch: pointwise (no nonlinearity)
        self.pw_high = nn.Conv2d(channels, channels, kernel_size=1, bias=False)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, low: torch.Tensor, high: torch.Tensor) -> torch.Tensor:
        low = F.interpolate(low, size=high.shape[-2:], mode="bilinear", align_corners=False)
        low = self.relu(self.dw_conv(low))   # ReLU after the depthwise conv
        low = self.pw_low(low)               # pointwise, no nonlinearity
        high = self.pw_high(high)            # pointwise, no nonlinearity
        return self.relu(low + high)         # element-wise add + final ReLU
```

*Classifier.* Two DSConvs (128 channels each) followed by a 1×1 Conv2d projecting to 19 classes, then bilinear upsample ×8 back to full input resolution (Table 1). Softmax is used at training time; argmax may be substituted at inference (Fast-SCNN cls mode) without accuracy penalty.

**Training.** Cityscapes. Loss: softmax cross-entropy on the Classifier output, plus auxiliary softmax cross-entropy heads at the outputs of LtD and GFE, each weighted 0.4 (§4.1). Optimizer: SGD with momentum 0.9, batch size 12, polynomial LR schedule (base lr = 0.045, power = 0.9), ℓ₂ weight decay = 0.00004 applied only to non-depthwise layers. Approximately 1000 epochs from scratch on Cityscapes fine annotations. Augmentation: random resize (factor 0.5–2), random crop, random horizontal flip, colour/brightness jitter (§4.1). Headline: 68.0% mIoU at 123.5 FPS on Cityscapes test at 1024×2048 on a single Nvidia Titan Xp (Table 5; mIoU from Table 4). Adding ImageNet pre-training raises val mIoU from 68.62% to only 69.15% (+0.53 pp, Table 6) — Fast-SCNN trains competitively from scratch.

**Complexity.** 1.11M parameters (§1, Table 4). FPS on Nvidia Titan Xp scales super-linearly with resolution, because the GFE operates at $\tfrac{1}{32}$ of the input and halving the input shrinks its costliest convolutions by 4×: 123.5 FPS at 1024×2048, 285.8 FPS at 512×1024, 485.4 FPS at 256×512 (Table 7). The paper does not report a FLOPs figure.

# Implementations

No official author repository has been publicly released; community PyTorch reimplementations exist, including `Tramac/Fast-SCNN-pytorch` and the `fast_scnn` configuration within `open-mmlab/mmsegmentation`, both under the Apache-2.0 license.

# Assessment

**Novelty.**

- The shared Learning-to-Downsample prefix computes low-level features once and re-uses the result for both the fine-detail skip and the global-context branch, in contrast to BiSeNet's two independent branch prefixes that each pay full downsampling costs.
- Fast-SCNN is explicitly framed as a special case of the FCN-style encoder-decoder with a single skip connection (§3.3.2), instantiated with depthwise-separable convolutions and MobileNetV2 bottlenecks throughout for inference efficiency.
- The paper demonstrates that ImageNet pre-training is unnecessary for this capacity regime: fine-tuning from an ImageNet-pretrained backbone adds only +0.53 pp mIoU on Cityscapes val (68.62% → 69.15%, Table 6), disproving the assumption that pre-training is required for competitive segmentation accuracy at low parameter budgets.

**Strengths.**

- Speed–accuracy trade-off: 68.0% mIoU at 123.5 FPS (Cityscapes test, Titan Xp, 1024×2048, Table 5) versus BiSeNet's 71.4% mIoU at 57.3 FPS (Tables 4, 5) — approximately 2× the throughput.
- Very compact: 1.11M parameters (Table 4) versus BiSeNet's 5.8M (Table 4) — roughly 5× fewer parameters.
- Resolution-adaptive without retraining: 62.8% mIoU at 285.8 FPS (512×1024) and 51.9% mIoU at 485.4 FPS (256×512), all on Titan Xp cls mode (Table 7).

**Limitations.**

- The single $\tfrac{1}{8}$-resolution skip is the sole boundary-recovery path; ablation shows that zeroing it drops Cityscapes val mIoU from 69.22% to 64.30% (§4.2), a ~5 pp loss — small objects and fine structures are particularly sensitive.
- Accuracy ceiling: ~3.4 pp below BiSeNet on Cityscapes test (68.0% vs 71.4%, Tables 4 and 5).
- No official implementation was released; reported benchmark numbers rest on community reproductions, introducing a reproducibility caveat.

# References

1. R. P. K. Poudel, S. Liwicki, R. Cipolla. *Fast-SCNN: Fast Semantic Segmentation Network.* BMVC, 2019. [arXiv 1902.04502](https://arxiv.org/pdf/1902.04502)
2. C. Yu, J. Wang, C. Peng, C. Gao, G. Yu, S. Nong. *BiSeNet: Bilateral Segmentation Network for Real-time Semantic Segmentation.* ECCV, 2018. [arXiv 1808.00897](https://arxiv.org/pdf/1808.00897)
3. J. Long, E. Shelhamer, T. Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. [arXiv 1411.4038](https://arxiv.org/abs/1411.4038)
