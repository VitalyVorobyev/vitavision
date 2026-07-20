---
title: "GoogLeNet"
type: model
slug: googlenet
---

> Generated stub — do not edit. Source: `content/models/googlenet.md`.

Twenty-two-layer CNN built from Inception modules — parallel 1×1, 3×3, 5×5 convolutions and 3×3 max-pool concatenated along the channel axis, with 1×1 bottlenecks reducing dimensionality before the larger spatial convs. ILSVRC-2014 classification winner at 6.67% top-5 error with 7M parameters (12× fewer than AlexNet).

## Prerequisites

- [[convolutional-neural-network]]

## Lineage

- **Parallel foundation with** — [[vgg]]
  > Both ILSVRC-2014 entries — GoogLeNet won classification (6.67% top-5), VGG won localisation. Different design philosophies: Inception modules vs homogeneous 3×3 depth scaling.

## Practice

- **Compared with** — [[alexnet]]
  > 22 layers vs AlexNet's 8; 7M vs 60M parameters; 56.5% relative reduction in top-5 error vs AlexNet (16.4% → 6.67%) over two ILSVRC years.
- **Feeds into** — [[fcn-semantic-segmentation]] _(confidence: medium)_
  > One of three backbones explored in FCN; FCN-GoogLeNet 42.5 mean IU vs FCN-VGG16 56.0 (FCN Table 1) — aggressive early downsampling hurts dense prediction.

## Sources

- Primary: [[szegedy2015-inception]]
- Reference: [[krizhevsky2012-alexnet]]
- Reference: [[simonyan2014-vgg]]
