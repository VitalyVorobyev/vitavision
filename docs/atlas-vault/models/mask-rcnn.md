---
title: "Mask R-CNN"
type: model
slug: mask-rcnn
---

> Generated stub — do not edit. Source: `content/models/mask-rcnn.md`.

Two-stage instance segmentation by adding a parallel FCN mask branch to Faster R-CNN — per-class binary masks predicted at each RoI under a decoupled per-pixel sigmoid loss, with RoIAlign's bilinear-sampling replacement for RoIPool's quantization that recovers pixel-accurate alignment.

## Cross-paradigm

- **Learned alternative of** — [[felzenszwalb-deformable-parts]] _(confidence: medium)_
  > Mask R-CNN's CNN backbone, region proposals, and RoIAlign replace DPM's HOG features, root + part filters, and latent-SVM scoring; Mask R-CNN also outputs per-instance masks beyond DPM's bounding boxes.

## Sources

- Primary: [[he2017-maskrcnn]]
- Reference: [[he2016-resnet]]
- Reference: [[long2015-fcn]]
- Reference: [[ren2015-faster]]
