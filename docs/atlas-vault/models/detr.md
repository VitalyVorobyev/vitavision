---
title: "DETR"
type: model
slug: detr
---

> Generated stub — do not edit. Source: `content/models/detr.md`.

End-to-end object detector that recasts detection as direct set prediction — CNN backbone (ResNet-50/101) extracts $H/32 \times W/32$ feature map; transformer encoder-decoder with 6+6 layers and $N=100$ learned object queries outputs (class, box) pairs; bipartite-matching loss via Hungarian algorithm eliminates anchor boxes, region proposals, and NMS. Comparable COCO AP to Faster R-CNN at simpler pipeline; better large-object AP, worse small-object AP, and ~10× slower convergence (300+ epochs).

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[faster-rcnn]]
  > DETR vs Faster R-CNN is the headline detection comparison; DETR removes hand-designed RPN + anchor boxes + NMS in favour of bipartite matching + transformer decoder at comparable COCO AP.
- **Feeds into** — [[rf-detr]]
  > RF-DETR is a DETR-family set-prediction detector; built on the DETR paradigm via its parents LW-DETR/Deformable-DETR.
- **Feeds into** — [[sam]]
  > SAM's mask decoder two-way cross-attention is inspired by DETR's transformer decoder; SAM 3's concept detector is explicitly DETR-based.

## Sources

- Primary: [[carion2020-detr]]
- Reference: [[he2016-resnet]]
