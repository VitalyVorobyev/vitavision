---
title: "Mask2Former"
type: model
slug: mask2former
---

> Generated stub — do not edit. Source: `content/models/mask2former.md`.

Universal image segmentation family — MaskFormer (v1, NeurIPS 2021) reframes semantic segmentation as **mask classification**: predict a set of $N$ binary masks plus per-mask class labels via a DETR-style transformer decoder over pixel-decoder features, supervised by bipartite matching. Mask2Former (v2, CVPR 2022) extends v1 with **masked attention** (cross-attention restricted to each query's predicted mask foreground), multi-scale round-robin features (queries cross-attend to 1/32, 1/16, 1/8 maps across consecutive layers), and point-sampled mask loss for 3× memory reduction. A single architecture, trained per-dataset, beats specialised models on COCO panoptic (PQ 57.8), COCO instance (AP 50.1), and ADE20K semantic (mIoU 57.7) with Swin-L.

## Prerequisites

- [[attention-mechanism]]
- [[convolutional-neural-network]]

## Practice

- **Compared with** — [[mask-rcnn]]
  > Mask R-CNN is the dominant per-RoI proposal-then-segment baseline; Mask2Former reframes the same problem as mask classification + set prediction, achieving unified handling of semantic, instance, and panoptic in one architecture.
- **Feeds into** — [[sam]]
  > SAM 3's mask head is adapted from MaskFormer/Mask2Former — this family establishes the per-query mask classification + set-prediction paradigm SAM 3 inherits for concept segmentation.

## Sources

- Primary: [[cheng2022-mask2former]]
- Reference: [[carion2020-detr]]
- Reference: [[cheng2021-maskformer]]
- Reference: [[he2016-resnet]]
