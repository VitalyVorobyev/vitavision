---
title: "HRNet"
type: model
slug: hrnet
---

> Generated stub — do not edit. Source: `content/models/hrnet.md`.

CNN backbone family for dense prediction that maintains a high-resolution branch throughout the network and runs four parallel multi-resolution streams ($C, 2C, 4C, 8C$ channels) with eight repeated cross-resolution fusions; V1 uses the high-resolution stream only (pose heatmaps), V2 upsamples and concatenates all four streams for per-pixel labelling (semantic segmentation, face landmarks), and V2p adds an FPN-style multi-scale output for object detection and instance segmentation.

## Prerequisites

- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[resnet]] _(confidence: medium)_
  > ResNet is the dominant backbone for dense prediction; HRNet trades higher activation memory for better keypoint/segmentation accuracy via parallel high-resolution streams.
- **Feeds into** — [[focalclick]]
  > FocalClick uses HRNet18s+OCR and HRNet32+OCR as the Segmentor backbone in three of its six published variants (hrnet18s-S1/S2, hrnet32-S2); the small-crop Segmentor input (128×128 or 256×256) makes HRNet practical for CPU deployment.
- **Feeds into** — [[ritm-interactive-segmentation]]

## Sources

- Primary: [[sun2019-hrnet]]
- Reference: [[he2016-resnet]]
- Reference: [[sun2019-hrnetv2]]
- Reference: [[wang2020-hrnet-journal]]
