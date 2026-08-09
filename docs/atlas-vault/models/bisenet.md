---
title: "BiSeNet"
type: model
slug: bisenet
---

> Generated stub — do not edit. Source: `content/models/bisenet.md`.

Two-branch (bilateral) CNN for real-time semantic segmentation: a wide shallow path preserves spatial detail while a deep narrow path with global pooling supplies receptive field, merged by a learned fusion module. V1 (2018) pairs a Spatial Path and a Context Path (ARM + FFM) on an ImageNet-pretrained backbone; V2 (2020) redesigns it with a Detail Branch, a from-scratch Semantic Branch of Gather-and-Expansion layers, Bilateral Guided Aggregation, and a training-only Booster — 72.6% mIoU at 156 FPS on Cityscapes test (V2, Table 7).

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[deeplab-semantic-segmentation]]
- **Compared with** — [[hrnet]] _(confidence: medium)_
  > Both target spatial-detail loss in dense prediction — HRNet via a maintained high-resolution branch, BiSeNet via the Spatial/Detail Path.
- **Compared with** — [[segformer]]

## Sources

- Primary: [[yu2018-bisenet]]
- Reference: [[he2016-resnet]]
- Reference: [[long2015-fcn]]
- Reference: [[yu2020-bisenet]]
