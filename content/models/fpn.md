---
title: "Feature Pyramid Network (FPN)"
date: 2026-09-23
summary: "Builds a multi-scale feature pyramid inside a single-scale CNN via a top-down pathway with lateral connections, giving every level strong semantics at a fraction of the cost of image pyramids; drives RPN and Fast R-CNN heads per level."
tags: ["deep-learning", "multi-scale", "region-based"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
prerequisites: [image-pyramid, convolutional-neural-network]
failureModes: []
relations:
  - type: feeds_into
    target: mask-rcnn
    confidence: high
    caution: "Mask R-CNN's headline configuration uses a ResNet-FPN backbone; FPN §5.2.3 points to Mask R-CNN as the follow-up."
sources:
  primary: lin2017-fpn
  references:
    - he2016-resnet
    - ren2015-faster
    - he2017-maskrcnn
  notes: |
    Paper-grounded facts: bottom-up C2–C5 (strides 4–32), top-down
    2× nearest upsampling + 1×1 lateral add, 3×3 smoothing, d = 256 (§3); RoI level assignment
    k = ⌊k0 + log2(√(wh)/224)⌋, k0 = 4 (Eq. 1, §4.2); anchors {32²…512²} × 3 ratios (§4.1);
    RPN AR 48.3 → 56.3 (Table 1); Fast R-CNN AP 31.6 → 33.9 (Table 3); test-dev AP 36.2 (Table 4).
implementations:
  - role: official
    repo: https://github.com/facebookresearch/Detectron
    commit: 04155a01a6ea68f22ac27c79a822066457941ece
    framework: caffe
    license: Apache-2.0
  - role: community
    repo: https://github.com/facebookresearch/detectron2
    commit: d1e04565d3bec8719335b88be9e9b961bf3ec464
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Feature Pyramid Networks build a multi-scale feature representation for ConvNet-based detectors from a single-scale input image, without computing a true image pyramid. Input: a single RGB image at one resolution. Output: a set of feature maps $\{P_2, P_3, P_4, P_5\}$ (plus $P_6$ for the region-proposal head) at strides $\{4, 8, 16, 32, 64\}$ pixels relative to the input, each with a fixed channel depth $d=256$ and comparably strong semantics at every level. The defining property is a top-down pathway with lateral connections that fuses the backbone's own coarse, semantically strong map with each finer bottom-up map — in contrast to a featurized image pyramid (accurate at every scale but compute- and memory-intensive), a single feature map from the top of the backbone (fast but weak on small objects), or the backbone's raw feature hierarchy used unmodified, whose finer levels stay semantically weak.

# Architecture

**Family & shape.** FPN is a backbone-output representation, not a standalone classifier or detector: a generic module that turns a ConvNet backbone's single-scale feedforward hierarchy into a multi-scale pyramid. Input: RGB image at one resolution. Output: four pyramid maps $\{P_2, P_3, P_4, P_5\}$, matching the backbone's stage outputs in spatial size at strides $\{4, 8, 16, 32\}$ px, plus $P_6$ (region-proposal-only) at stride 64. Every reported result uses a [ResNet](/atlas/resnet)-50 or ResNet-101 backbone, though the construction is stated as backbone-agnostic.

**Blocks.** The bottom-up pathway is the backbone's ordinary feedforward computation: the last residual-block activation of each ResNet stage is kept as $\{C_2, C_3, C_4, C_5\}$ at strides $\{4, 8, 16, 32\}$; $C_1$ (stride 2) is excluded due to its large memory footprint. The top-down pathway starts from a $1\times1$ conv on $C_5$ and, at each step, upsamples the current top-down map $2\times$ by nearest-neighbor interpolation, reduces $C_k$'s channel count with a $1\times1$ conv (the lateral connection), merges the two by element-wise addition, and applies a final $3\times3$ conv to reduce the aliasing effect of upsampling. All extra layers output $d=256$ channels and use no non-linearity.

The top-down + lateral merge step in PyTorch:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class FPNMerge(nn.Module):
    """One top-down step: upsample the coarser map, fuse with the
    matching bottom-up (lateral) map, then smooth."""

    def __init__(self, lateral_channels: int, out_channels: int = 256):
        super().__init__()
        self.lateral = nn.Conv2d(lateral_channels, out_channels, kernel_size=1)
        self.smooth = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1)

    def forward(self, top_down: torch.Tensor, bottom_up: torch.Tensor) -> torch.Tensor:
        # top_down: coarser pyramid map P_{k+1}, already at out_channels
        # bottom_up: matching backbone stage output C_k, at lateral_channels
        upsampled = F.interpolate(top_down, size=bottom_up.shape[-2:], mode="nearest")
        merged = upsampled + self.lateral(bottom_up)
        return self.smooth(merged)
```

The single-scale region-proposal head ($3\times3$ conv plus two sibling $1\times1$ convs) is attached, with shared weights, to every pyramid level; each level receives a single anchor scale instead of the original multi-scale set — areas $\{32^2, 64^2, 128^2, 256^2, 512^2\}$ px on $\{P_2, \dots, P_6\}$ respectively, each with 3 aspect ratios, 15 anchors total over the pyramid. $P_6$ is a stride-two subsampling of $P_5$, introduced only to cover the $512^2$ anchor scale.

An RoI of width $w$ and height $h$ on the input image is assigned to detection-head pyramid level $P_k$ by

$$
k = \left\lfloor k_0 + \log_2\!\left(\frac{\sqrt{wh}}{224}\right) \right\rfloor,
$$

where $224$ is the canonical ImageNet pretraining size and $k_0 = 4$, chosen analogous to the ResNet [Faster R-CNN](/atlas/faster-rcnn) baseline's use of $C_4$ as its single-scale feature map. RoI-pooled $7\times7$ features from the assigned level feed a lightweight 2-fc (1024-d) head, replacing the ResNet conv5 subnetwork used as the head in the single-scale baseline.

**Training.** Backbones are ImageNet-1k-pretrained before COCO fine-tuning. Region-proposal and detection losses are unchanged from Faster R-CNN; training uses synchronized SGD on 8 GPUs at 2 images/GPU, weight decay $0.0001$, momentum $0.9$, learning rate $0.02$ for the first 30k mini-batches then $0.002$ for the next 10k. Unlike the Faster R-CNN baseline, where anchor boxes outside the image are ignored, FPN training includes them in the region-proposal loss. Headline result: COCO test-dev single-model AP 36.2 inside an otherwise basic Faster R-CNN system, versus the prior best entry's AP 35.7 and AP@0.5 59.1 versus 55.7 (Table 4).

**Complexity.** The extra pyramid layers add "marginal extra cost" over the backbone (Abstract): every lateral and smoothing conv outputs $d=256$ channels. The full detection system runs at 6 FPS on a GPU.

# Implementations

Official Caffe2 release inside Facebook AI Research's Detectron; the PyTorch implementation lives in its successor, Detectron2.

# Assessment

**Novelty.**

- Builds a pyramid entirely from a ConvNet's own feedforward hierarchy, via a top-down pathway and lateral connections, removing the need for a true featurized image pyramid at train or test time.
- Reuses the Faster R-CNN region-proposal and Fast R-CNN detection heads unmodified, re-attaching each with shared weights per pyramid level and a single anchor scale per level, rather than proposing a new detection head.
- Generalizes past detection to instance-segmentation mask-proposal generation on the same backbone, in contrast to DeepMask and SharpMask, which require an image pyramid at inference.

**Strengths.**

- Region-proposal average recall AR$^{1k}$ +8.0 points over a strong single-scale $C_4$ baseline (Table 1, 48.3→56.3), with small-object AR$^{1k}_s$ +12.9.
- Faster R-CNN AP +2.3 and AP@0.5 +3.8 over a strong single-scale ResNet baseline (Table 3: AP 31.6→33.9, AP@0.5 53.1→56.9).
- COCO test-dev single-model AP 36.2 versus the prior best entry's AP 35.7, AP@0.5 59.1 versus 55.7 (Table 4), inside an otherwise basic Faster R-CNN system.
- Mask-proposal average recall 48.1 versus SharpMask 39.8 and DeepMask 37.1 (Table 6), at several times the inference speed since no image pyramid is needed.

**Limitations.**

- Requires a backbone with a clean, factor-2, multi-stage feedforward hierarchy; a non-hierarchical or single-resolution feature extractor cannot supply the bottom-up pathway.
- The top-down pathway and the lateral connections are both independently necessary: removing the top-down pathway drops region-proposal AR$^{1k}$ from 56.3 to 49.5, and removing the lateral connections drops it further to 46.1 (Table 1).
- A single finest-level map with far more anchors (750k versus 200k for the full pyramid) still underperforms the full pyramid (AR$^{1k}$ 51.3, Table 1) — anchor density alone does not substitute for the pyramid structure.
- The original release ships as a component of the now-archived, Caffe-based Detectron repository; current use goes through the community-maintained Detectron2 port.

# References

1. T.-Y. Lin, P. Dollár, R. Girshick, K. He, B. Hariharan, S. Belongie. *Feature Pyramid Networks for Object Detection.* CVPR, 2017. [arXiv 1612.03144](https://arxiv.org/abs/1612.03144)
2. K. He, X. Zhang, S. Ren, J. Sun. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arXiv 1512.03385](https://arxiv.org/abs/1512.03385)
3. S. Ren, K. He, R. Girshick, J. Sun. *Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks.* NeurIPS, 2015. [arXiv 1506.01497](https://arxiv.org/abs/1506.01497)
4. K. He, G. Gkioxari, P. Dollár, R. Girshick. *Mask R-CNN.* ICCV, 2017. [arXiv 1703.06870](https://arxiv.org/abs/1703.06870)
