---
title: "Faster R-CNN"
type: model
slug: faster-rcnn
---

> Generated stub — do not edit. Source: `content/models/faster-rcnn.md`.

Two-stage CNN object detector that replaces external Selective Search / EdgeBoxes proposals with a learned Region Proposal Network sharing conv features with the Fast R-CNN head — yielding near-real-time multi-class detection on GPU (5 fps with VGG-16) and ImageNet-pretrained backbones swapped freely from ZF through ResNet-101.

## Lineage

- **Extended by** — [[mask-rcnn]]

## Cross-paradigm

- **Learned alternative of** — [[felzenszwalb-deformable-parts]]
- **Learned alternative of** — [[viola-jones-detector]] _(confidence: medium)_
  > Viola-Jones targets real-time face detection on CPUs; Faster R-CNN is general multi-class detection on GPUs — replacement is paradigm-level, not drop-in.

## Sources

- Primary: [[ren2015-faster]]
- Reference: [[he2016-resnet]]
- Reference: [[he2017-maskrcnn]]
- Reference: [[krizhevsky2012-alexnet]]
- Reference: [[long2015-fcn]]
