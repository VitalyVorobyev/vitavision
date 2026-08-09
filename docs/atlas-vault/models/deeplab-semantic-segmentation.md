---
title: "DeepLab"
type: model
slug: deeplab-semantic-segmentation
---

> Generated stub — do not edit. Source: `content/models/deeplab-semantic-segmentation.md`.

Dense semantic segmentation by repurposing an ImageNet classifier with atrous (dilated) convolution to preserve spatial resolution, an Atrous Spatial Pyramid Pooling head for multi-scale context, and a fully-connected CRF post-processor for boundary refinement — multi-year state of the art on PASCAL VOC 2012.

## Practice

- **Compared with** — [[unet-segmentation]]
  > Same task, different mechanism — atrous backbone + multi-scale head + dense CRF vs symmetric encoder-decoder with skip concatenation.
- **Feeds into** — [[mobilenetv3]] _(confidence: medium)_
  > LR-ASPP is a lite, reduced reuse of DeepLab's ASPP as MobileNetV3's segmentation head.

## Sources

- Primary: [[chen2018-deeplab]]
- Reference: [[he2016-resnet]]
- Reference: [[long2015-fcn]]
- Reference: [[ronneberger2015-unet]]
