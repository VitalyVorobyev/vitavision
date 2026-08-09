---
title: "VGG"
type: model
slug: vgg
---

> Generated stub — do not edit. Source: `content/models/vgg.md`.

Family of very deep CNN image classifiers (11 to 19 weight layers) built from stacked 3×3 convolutions with stride 1 and 2×2 max-pool stride 2, trained on ImageNet with SGD + dropout. ILSVRC-2014 localisation winner and classification runner-up.

## Prerequisites

- [[convolutional-neural-network]]

## Lineage

- **Extended by** — [[resnet]]
  > ResNet reformulates VGG-style plain depth scaling: identity shortcuts let 152-layer nets train where 19-layer plain nets already plateau (ResNet §1, Fig. 1).

## Practice

- **Feeds into** — [[deeplab-semantic-segmentation]]
  > DeepLab v1 uses VGG-16 backbone; later versions switched to ResNet/Xception.
- **Feeds into** — [[fcn-semantic-segmentation]]
  > VGG-16 is FCN's canonical backbone per FCN Table 1; FCN-VGG16 mean IU 56.0 vs FCN-AlexNet 39.8.

## Sources

- Primary: [[simonyan2014-vgg]]
- Reference: [[krizhevsky2012-alexnet]]
- Reference: [[szegedy2015-inception]]
