---
title: "FCN: Fully Convolutional Networks"
type: model
slug: fcn-semantic-segmentation
---

> Generated stub — do not edit. Source: `content/models/fcn-semantic-segmentation.md`.

Encoder-decoder CNN for dense pixel-wise classification — converts ImageNet classifiers into fully convolutional networks via 1×1-conv reinterpretation, then upsamples via learnable bilinear-initialised deconvolution with skip connections from earlier pooling stages.

## Lineage

- **Extended by** — [[deeplab-semantic-segmentation]]
  > DeepLab adopts FCN's fully-convolutional framing but replaces strided downsampling with atrous (dilated) convolution to preserve resolution, adds an ASPP multi-scale head and a fully-connected CRF post-processor.
- **Extended by** — [[unet-segmentation]]
  > U-Net adapts the fully-convolutional framing to small-data biomedical regimes via symmetric decoder and skip concatenation.

## Practice

- **Feeds into** — [[bisenet]] _(confidence: medium)_
  > BiSeNet's parallel branches both produce fractional-stride dense feature maps feeding a pixel-wise head, following the FCN framing; FCN-32s is its ablation baseline and FCN-8s a benchmark comparison.
- **Feeds into** — [[fast-scnn]] _(confidence: medium)_
  > Fast-SCNN frames itself as a special case of an FCN encoder-decoder with a single skip connection (§3.3.2); its classifier emits dense per-pixel logits upsampled to full resolution following the FCN template.
- **Feeds into** — [[mask-rcnn]]
  > Mask R-CNN adopts FCN's per-pixel binary prediction for the mask branch inside an instance-segmentation pipeline; mask branch is decoupled from class prediction.

## Sources

- Primary: [[long2015-fcn]]
- Reference: [[he2016-resnet]]
