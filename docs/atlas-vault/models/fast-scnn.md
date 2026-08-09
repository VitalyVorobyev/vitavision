---
title: "Fast-SCNN"
type: model
slug: fast-scnn
---

> Generated stub — do not edit. Source: `content/models/fast-scnn.md`.

Real-time semantic segmentation CNN whose shared shallow 'Learning to Downsample' prefix feeds both a deep low-resolution global-feature branch and a high-resolution detail skip, merged by a feature-fusion module — eliminating the duplicate early downsampling that two-branch segmenters pay. Built from depthwise-separable and MobileNetV2 inverted-residual blocks; ~1.11M parameters; 68.0% mIoU at 123.5 FPS on Cityscapes test (1024×2048, Titan Xp, Table 5).

## Prerequisites

- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[bisenet]]
- **Compared with** — [[deeplab-semantic-segmentation]]
- **Compared with** — [[hrnet]] _(confidence: medium)_
- **Compared with** — [[segformer]] _(confidence: medium)_

## Sources

- Primary: [[poudel2019-fast-scnn]]
- Reference: [[long2015-fcn]]
- Reference: [[yu2018-bisenet]]
