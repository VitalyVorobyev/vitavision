---
title: "MobileNetV2"
date: 2026-05-29
summary: "Efficient mobile CNN backbone built from inverted-residual blocks with a linear bottleneck — depthwise-separable convolution expanded to a wide interior and projected back to a thin, non-linearity-free bottleneck that the residual connects — for on-device classification, detection (SSDLite), and segmentation (Mobile DeepLabv3)."
tags: ["deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "3.4M (1.0/224)"
flops: "300M MAdds @ 224×224"
prerequisites: [convolutional-neural-network, convolution]
failureModes: []
relations:
  - type: feeds_into
    target: mobilenetv3
    confidence: high
    caution: "MobileNetV3 inherits the inverted-residual + linear-bottleneck block as its core building primitive."
  - type: feeds_into
    target: fast-scnn
    confidence: high
    caution: "Fast-SCNN's Global Feature Extractor is built from MobileNetV2 inverted-residual bottlenecks."
  - type: feeds_into
    target: mnasnet
    confidence: medium
    caution: "MnasNet's MBConv search space is built on MobileNetV2's inverted-residual block."
sources:
  primary: sandler2018-mobilenetv2
  references:
    - he2016-resnet
    - tan2019-mnasnet
    - howard2019-mobilenetv3
  notes: |
    Inverted residual + linear bottleneck (Sec 3.2, Table 1): 1×1 expand to t·k channels (ReLU6) →
    3×3 depthwise (ReLU6) → 1×1 linear project to k' channels (NO nonlinearity); residual connects the
    thin bottleneck tensors. Default expansion t=6 (64→384 example). Linear projection motivated by the
    manifold-of-interest argument: ReLU on a low-dim subspace collapses it; adding ReLU to the projection
    costs several percent (Fig 6). Depthwise-separable cost reduction vs standard conv = k²·d_j/(k²+d_j)
    (~8–9× at k=3, Eq 1). ImageNet 1.0/224: 72.0% top-1, 300M MAdds, 3.4M params, 75ms Pixel-1 (Table 4);
    vs MobileNetV1 70.6% / 575M / 113ms. 1.4/224: 74.7% / 585M MAdds. SSDLite COCO: 22.1 mAP / 0.8B MAdds /
    4.3M / 200ms vs MobileNetV1+SSDLite 22.2 / 1.3B / 270ms; SSD300 23.2, SSD512 26.8 (Table 6). Mobile
    DeepLabv3 VOC: 75.70% mIOU / 4.52M / 5.8B MAdds, output stride 16 + ASPP (Table 7). Train (Sec 6.1):
    RMSProp 0.9/0.9, lr 0.045 ×0.98/epoch, weight decay 0.00004, batch 96 over 16 GPUs.
implementations:
  - role: official
    repo: https://github.com/tensorflow/models
    commit: 451906e4e82f19712455066c1b27e2a6ba71b1dd
    framework: tensorflow
    license: Apache-2.0
  - role: community
    repo: https://github.com/pytorch/vision
    commit: 78839c2b06c83c6cfb5c4da692ffb331bbd4c4cc
    framework: pytorch
    license: BSD-3-Clause
draft: false
---

# Motivation

MobileNetV2 takes an RGB image and produces class logits over 1000 ImageNet categories, with the same backbone reused under SSDLite (object detection) and Mobile DeepLabv3 (semantic segmentation) heads. The defining property is the inverted-residual block with a linear bottleneck: a 1×1 pointwise convolution expands the input to a wide interior, a 3×3 depthwise convolution filters in that expanded space, and a second 1×1 pointwise convolution projects back to a narrow bottleneck with no nonlinearity. The residual skip connects the narrow bottleneck tensors — the inverse of a classic residual, which connects wide layers. The linear projection is retained precisely to avoid collapsing the low-dimensional manifold of activations that ReLU would destroy.

# Architecture

**Family & shape.** CNN backbone; input RGB at 224×224×3; output 1000-way logits. Width multiplier $\alpha$ and input-resolution multiplier $\rho$ scale channels and spatial dimensions uniformly for smaller or faster variants. SSDLite and Mobile DeepLabv3 heads attach to intermediate feature maps for detection (COCO, 320×320) and segmentation (PASCAL VOC 2012).

**Blocks.** The inverted-residual block expands a $k$-channel bottleneck to $t \cdot k$ channels via a 1×1 conv with ReLU6, applies a 3×3 depthwise conv with ReLU6, then projects back to $k'$ bottleneck channels via a 1×1 conv with no nonlinearity (Table 1). The projection is linear because activations of each layer lie on a manifold of interest embeddable in a low-dimensional subspace; ReLU applied to such a subspace collapses it to a ray or zero, losing information that cannot be recovered (Section 3.2). Adding ReLU to the bottleneck projection hurts performance by several percent (Section 3.2, Figure 6). The default expansion factor is $t = 6$: a 64-channel bottleneck expands to $64 \times 6 = 384$ channels before depthwise filtering (Section 4). The skip connection exists only when stride $s = 1$ and input and output bottleneck channel counts match.

The inverted-residual block forward computation in PyTorch:

```python
import torch
import torch.nn as nn

class InvertedResidual(nn.Module):
    def __init__(self, in_channels, out_channels, stride, expand_ratio):
        super().__init__()
        self.use_res = (stride == 1 and in_channels == out_channels)
        hidden = in_channels * expand_ratio
        layers = []
        if expand_ratio != 1:                       # 1×1 pointwise expand
            layers += [nn.Conv2d(in_channels, hidden, 1, bias=False),
                       nn.BatchNorm2d(hidden), nn.ReLU6(inplace=True)]
        layers += [                                 # 3×3 depthwise
            nn.Conv2d(hidden, hidden, 3, stride=stride, padding=1,
                      groups=hidden, bias=False),
            nn.BatchNorm2d(hidden), nn.ReLU6(inplace=True),
            nn.Conv2d(hidden, out_channels, 1, bias=False),  # 1×1 linear project
            nn.BatchNorm2d(out_channels),           # no nonlinearity here
        ]
        self.conv = nn.Sequential(*layers)

    def forward(self, x):
        return x + self.conv(x) if self.use_res else self.conv(x)
```

This block differs from the MobileNetV3 block: there is no squeeze-and-excitation attention and no h-swish activation here.

**Training.** ImageNet-1k, supervised cross-entropy, ReLU6 throughout. Optimizer: RMSProp with decay and momentum both 0.9; initial learning rate 0.045 decaying by 0.98 per epoch; batch normalization after every layer; weight decay 0.00004; batch size 96 across 16 GPU workers (Section 6.1). MobileNetV2 1.0/224 achieves 72.0% top-1 (Table 4). With an SSDLite head on COCO, mAP is 22.1 at 4.3M parameters and 0.8B MAdds (Table 6). Mobile DeepLabv3 on PASCAL VOC 2012 with output stride 16 and ASPP reaches 75.70% mIOU at 4.52M parameters and 5.8B MAdds (Table 7).

**Complexity.** MobileNetV2 1.0/224: approximately 3.4M parameters and 300M MAdds (Table 4). Depthwise-separable convolution reduces cost relative to a standard $k \times k$ convolution by a factor of $k^2 \cdot d_j / (k^2 + d_j)$, which at $k=3$ is roughly 8–9× (Section 3.1, Eq. 1).

# Implementations

Official TensorFlow-Slim release; torchvision provides the de-facto PyTorch reference.

# Assessment

**Novelty.**

- The inverted-residual topology inverts the ResNet bottleneck pattern (He et al. 2016): the residual skip connects narrow bottleneck tensors rather than wide expanded tensors, reducing inference memory pressure.
- The linear bottleneck — a projection with no nonlinearity — is novel relative to both ResNet (nonlinear bottleneck projection) and MobileNetV1 (no residuals at all); it rests on the manifold-of-interest argument from Section 3.2.
- Both innovations build on the depthwise-separable convolution efficiency primitive introduced in MobileNetV1.

**Strengths.**

- MobileNetV2 1.0/224 achieves 72.0% top-1 at 300M MAdds and 3.4M parameters in 75ms on Pixel 1, versus MobileNetV1's 70.6% at 575M MAdds and 113ms on the same device (Table 4): fewer MAdds, lower latency, higher accuracy.
- SSDLite with a MobileNetV2 backbone achieves 22.1 mAP on COCO at 0.8B MAdds and 200ms, compared to MobileNetV1+SSDLite at 22.2 mAP, 1.3B MAdds, and 270ms (Table 6): comparable accuracy at far fewer MAdds and lower latency.
- The inverted-residual block (MBConv) became the composable search primitive for MnasNet and MobileNetV3, extending its impact beyond classification.
- Memory-efficient inference: intermediate expanded tensors need not be fully materialized because the skip path operates on small bottleneck tensors (Section 5.1).

**Limitations.**

- The manifold-of-interest argument for the linear bottleneck is heuristic; the linear projection is justified empirically (Figure 6) rather than theoretically.
- Depthwise convolutions are not efficiently supported on all hardware targets; some FPGA and custom ASIC backends prefer standard convolutions.
- At very small width multipliers, accuracy degrades steeply relative to MAdds savings, without a quantified lower bound in the paper.
- SSDLite mAP 22.1 (Table 6) falls below SSD300 (23.2 mAP) and SSD512 (26.8 mAP), reflecting the accuracy ceiling of a mobile-scale backbone.

# References

1. M. Sandler, A. Howard, M. Zhu, A. Zhmoginov, L. Chen. *MobileNetV2: Inverted Residuals and Linear Bottlenecks.* CVPR, 2018. [arXiv 1801.04381](https://arxiv.org/abs/1801.04381)
2. K. He, X. Zhang, S. Ren, J. Sun. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arXiv 1512.03385](https://arxiv.org/abs/1512.03385)
3. M. Tan, B. Chen, R. Pang, V. Vasudevan, M. Sandler, A. Howard, Q. V. Le. *MnasNet: Platform-Aware Neural Architecture Search for Mobile.* CVPR, 2019. [arXiv 1807.11626](https://arxiv.org/abs/1807.11626)
4. A. Howard, M. Sandler, et al. *Searching for MobileNetV3.* ICCV, 2019. [arXiv 1905.02244](https://arxiv.org/abs/1905.02244)
