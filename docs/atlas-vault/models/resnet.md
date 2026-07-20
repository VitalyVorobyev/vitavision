---
title: "ResNet"
type: model
slug: resnet
---

> Generated stub — do not edit. Source: `content/models/resnet.md`.

Family of very deep CNN image classifiers (18 to 152 layers) built from residual blocks $y = \mathcal{F}(x, \{W_i\}) + x$ that reformulate each block as learning a residual mapping rather than a direct one, resolving the depth-degradation problem and enabling 152-layer training. ILSVRC-2015 classification winner (3.57% top-5 test ensemble) and the default backbone for downstream detection and segmentation.

## Prerequisites

- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[googlenet]]
  > Both push depth beyond VGG: GoogLeNet 22 layers via Inception modules, ResNet up to 152 via residual blocks. ResNet-152 single model 4.49% top-5 val vs GoogLeNet ensemble 6.66% top-5 test (Tables 4/5).
- **Feeds into** — [[deeplab-semantic-segmentation]]
  > DeepLab v2 onward uses ResNet-101 as the dense-prediction backbone; v1 used VGG-16.
- **Feeds into** — [[loftr]] _(confidence: medium)_
  > LoFTR's local-feature CNN is a ResNet-like backbone with FPN structure.
- **Feeds into** — [[mask-rcnn]]
  > Mask R-CNN's headline backbones are ResNet-50/101 and ResNeXt-101 paired with FPN.

## Sources

- Primary: [[he2016-resnet]]
- Reference: [[krizhevsky2012-alexnet]]
- Reference: [[long2015-fcn]]
- Reference: [[simonyan2014-vgg]]
- Reference: [[szegedy2015-inception]]
