---
title: "MobileNetV3"
type: model
slug: mobilenetv3
---

> Generated stub — do not edit. Source: `content/models/mobilenetv3.md`.

Mobile-CPU-latency-targeted CNN backbone found by combined platform-aware NAS and NetAdapt, built from MobileNetV2 inverted-residual blocks augmented with squeeze-and-excitation and the h-swish nonlinearity, plus a Lite Reduced ASPP segmentation decoder; trained on ImageNet-1k and adapted to detection and segmentation.

## Prerequisites

- [[attention-mechanism]]
- [[convolution]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[bisenet]] _(confidence: medium)_
  > Peer comparison in the real-time mobile segmentation regime.
- **Compared with** — [[fast-scnn]] _(confidence: medium)_
  > Peer comparison is specific to the real-time Cityscapes segmentation regime.

## Sources

- Primary: [[howard2019-mobilenetv3]]
- Reference: [[chen2018-deeplab]]
- Reference: [[long2015-fcn]]
- Reference: [[sandler2018-mobilenetv2]]
- Reference: [[tan2019-mnasnet]]
