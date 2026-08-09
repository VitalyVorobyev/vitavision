---
title: "MobileNetV2"
type: model
slug: mobilenetv2
---

> Generated stub — do not edit. Source: `content/models/mobilenetv2.md`.

Efficient mobile CNN backbone built from inverted-residual blocks with a linear bottleneck — depthwise-separable convolution expanded to a wide interior and projected back to a thin, non-linearity-free bottleneck that the residual connects — for on-device classification, detection (SSDLite), and segmentation (Mobile DeepLabv3).

## Prerequisites

- [[convolution]]
- [[convolutional-neural-network]]

## Practice

- **Feeds into** — [[fast-scnn]]
  > Fast-SCNN's Global Feature Extractor is built from MobileNetV2 inverted-residual bottlenecks.
- **Feeds into** — [[mnasnet]] _(confidence: medium)_
  > MnasNet's MBConv search space is built on MobileNetV2's inverted-residual block.
- **Feeds into** — [[mobilenetv3]]
  > MobileNetV3 inherits the inverted-residual + linear-bottleneck block as its core building primitive.

## Sources

- Primary: [[sandler2018-mobilenetv2]]
- Reference: [[he2016-resnet]]
- Reference: [[howard2019-mobilenetv3]]
- Reference: [[tan2019-mnasnet]]
